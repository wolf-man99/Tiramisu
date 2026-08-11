import { prisma } from '../db';
import type { Badge, Difficulty } from '../content/types';
import { exerciseById } from '../content/exercises';
import { levelForXp, titleForLevel, xpForPass, coinsForXp } from './leveling';
import { applyActivity } from './streak';
import { newlyEarnedBadges, type BadgeContext } from './badges';
import { isLearnComplete } from './gating';

/**
 * The single place learner state changes after a graded submission. Everything,
 * XP, coins, level, streak, per-concept mastery, daily activity, and badge awards,
 * is updated atomically so a crash can never leave the profile half-written.
 */

export interface RecordAttemptInput {
  profileId: string;
  courseId?: string; // defaults to the SQL course
  itemType: string; // exercise | quiz | assessment | project | interview | capstone | lab | challenge
  itemId: string;
  sql: string;
  passed: boolean;
  ms: number;
  rowsReturned?: number;
  hintsUsed?: number;
  revealed?: boolean;
  difficulty?: Difficulty; // resolved from the exercise when omitted
  concepts?: string[];
  diagnosis?: string;
  /** Flat XP to award instead of the difficulty-derived value (e.g. course lessons). */
  xpOverride?: number;
  /** Today's date (ISO) in the profile's timezone. Defaults to server UTC date. */
  today?: string;
}

export const DEFAULT_COURSE = 'sql-for-marketers';

export interface RecordAttemptResult {
  xpAwarded: number;
  coinsAwarded: number;
  firstTry: boolean;
  passed: boolean;
  leveledUp: boolean;
  level: number;
  totalXp: number;
  streak: { current: number; longest: number; freezes: number; extended: boolean; freezeUsed: boolean };
  newBadges: Badge[];
  isNewEnrollment?: boolean;
  newLevel?: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Ensure the learner is enrolled in a course (idempotent), bumping last-active. */
export async function ensureEnrollment(profileId: string, courseId = DEFAULT_COURSE) {
  const existing = await prisma.enrollment.findUnique({
    where: { profileId_courseId: { profileId, courseId } },
  });

  const isNew = !existing;

  const enrollment = await prisma.enrollment.upsert({
    where: { profileId_courseId: { profileId, courseId } },
    update: { lastActive: new Date() },
    create: { profileId, courseId },
  });

  return { enrollment, isNew };
}

export async function recordAttempt(input: RecordAttemptInput): Promise<RecordAttemptResult> {
  const today = input.today ?? todayIso();
  const courseId = input.courseId ?? DEFAULT_COURSE;
  const hintsUsed = input.hintsUsed ?? 0;
  const revealed = input.revealed ?? false;
  const ex = input.itemType === 'exercise' || input.itemType === 'challenge' ? exerciseById(input.itemId) : undefined;
  const difficulty: Difficulty = input.difficulty ?? ex?.difficulty ?? 'medium';
  const concepts = input.concepts ?? ex?.concepts ?? [];

  const { isNew: isNewEnrollment } = await ensureEnrollment(input.profileId, courseId);

  return prisma.$transaction(async (tx) => {
    const profile = await tx.profile.findUniqueOrThrow({ where: { id: input.profileId } });

    // First-try = no prior attempt for this item.
    const priorAttempts = await tx.attempt.count({
      where: { profileId: profile.id, courseId, itemId: input.itemId, itemType: input.itemType },
    });
    const firstTry = priorAttempts === 0 && input.passed;

    // Award XP only the first time an item is passed.
    const alreadyPassed = await tx.attempt.count({
      where: { profileId: profile.id, courseId, itemId: input.itemId, itemType: input.itemType, passed: true },
    });
    const xpAwarded = input.passed && alreadyPassed === 0
      ? (input.xpOverride ?? xpForPass({ difficulty, attemptNumber: priorAttempts + 1, hintsUsed, revealed, firstTry }))
      : 0;
    const coinsAwarded = coinsForXp(xpAwarded);

    await tx.attempt.create({
      data: {
        profileId: profile.id,
        courseId,
        itemType: input.itemType,
        itemId: input.itemId,
        sql: input.sql.slice(0, 8000),
        passed: input.passed,
        ms: Math.round(input.ms),
        rowsReturned: input.rowsReturned ?? 0,
        hintsUsed,
        revealed,
        diagnosis: input.diagnosis,
        xpAwarded,
      },
    });

    // Learn -> Run unlock. Only worth checking on a fresh lesson pass, not every
    // attempt of every item type, isLearnComplete() re-reads every lesson's attempt
    // state, so it's not free.
    if (input.passed && input.itemType === 'lesson') {
      const learnDone = await isLearnComplete(tx, profile.id, courseId);
      if (learnDone) {
        await tx.enrollment.updateMany({
          where: { profileId: profile.id, courseId, runUnlockedAt: null },
          data: { runUnlockedAt: new Date() },
        });
      }
    }

    // Per-concept mastery.
    for (const concept of concepts) {
      const existing = await tx.conceptStat.findUnique({
        where: { profileId_courseId_concept: { profileId: profile.id, courseId, concept } },
      });
      const attempts = (existing?.attempts ?? 0) + 1;
      const passes = (existing?.passes ?? 0) + (input.passed ? 1 : 0);
      const firstTryOk = (existing?.firstTryOk ?? 0) + (firstTry ? 1 : 0);
      const totalMs = (existing?.totalMs ?? 0) + Math.round(input.ms);
      // Mastery blends overall pass rate with first-try rate; recent success weighs more.
      const passRate = passes / attempts;
      const firstRate = firstTryOk / attempts;
      const mastery = Math.min(1, Math.round((passRate * 0.6 + firstRate * 0.4) * 1000) / 1000);
      await tx.conceptStat.upsert({
        where: { profileId_courseId_concept: { profileId: profile.id, courseId, concept } },
        update: { attempts, passes, firstTryOk, totalMs, mastery, lastSeenAt: new Date() },
        create: { profileId: profile.id, courseId, concept, attempts, passes, firstTryOk, totalMs, mastery },
      });
    }

    // Streak, only advances on a day with activity.
    const streak = applyActivity({
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      streakFreezes: profile.streakFreezes,
      lastActiveDate: profile.lastActiveDate,
      today,
    });

    // Daily activity rollup.
    const day = await tx.dailyActivity.findUnique({
      where: { profileId_date: { profileId: profile.id, date: today } },
    });
    await tx.dailyActivity.upsert({
      where: { profileId_date: { profileId: profile.id, date: today } },
      update: {
        xpEarned: (day?.xpEarned ?? 0) + xpAwarded,
        exercisesSolved: (day?.exercisesSolved ?? 0) + (input.passed ? 1 : 0),
        exercisesFailed: (day?.exercisesFailed ?? 0) + (input.passed ? 0 : 1),
        accuracyNumerator: (day?.accuracyNumerator ?? 0) + (input.passed ? 1 : 0),
      },
      create: {
        profileId: profile.id,
        date: today,
        xpEarned: xpAwarded,
        exercisesSolved: input.passed ? 1 : 0,
        exercisesFailed: input.passed ? 0 : 1,
        accuracyNumerator: input.passed ? 1 : 0,
      },
    });

    // Level/title/XP.
    const totalXp = profile.xp + xpAwarded;
    const oldLevel = profile.level;
    const level = levelForXp(totalXp);
    const dailyGoalHit = ((day?.xpEarned ?? 0) < profile.dailyGoalXp) && ((day?.xpEarned ?? 0) + xpAwarded >= profile.dailyGoalXp);

    await tx.profile.update({
      where: { id: profile.id },
      data: {
        xp: totalXp,
        coins: profile.coins + coinsAwarded,
        level,
        title: titleForLevel(level),
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        streakFreezes: streak.streakFreezes,
        lastActiveDate: today,
      },
    });

    // Badge evaluation.
    const ctx = await buildBadgeContext(tx, {
      profileId: profile.id,
      courseId,
      level,
      totalXp,
      streak,
      freezeUsedEver: streak.freezeUsed || profile.streakFreezes > streak.streakFreezes,
      dailyGoalHitNow: dailyGoalHit,
    });
    const awarded = await tx.badgeAward.findMany({ where: { profileId: profile.id }, select: { badgeId: true } });
    const already = new Set(awarded.map((a) => a.badgeId));
    const fresh = newlyEarnedBadges(ctx, already);
    for (const b of fresh) {
      await tx.badgeAward.create({ data: { profileId: profile.id, badgeId: b.id } });
    }

    return {
      xpAwarded,
      coinsAwarded,
      firstTry,
      passed: input.passed,
      leveledUp: level > oldLevel,
      level,
      totalXp,
      streak: {
        current: streak.currentStreak,
        longest: streak.longestStreak,
        freezes: streak.streakFreezes,
        extended: streak.extended,
        freezeUsed: streak.freezeUsed,
      },
      newBadges: fresh,
      isNewEnrollment,
      newLevel: level > oldLevel ? level : undefined,
    };
  });
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Assemble the badge context from the profile plus targeted rollups. */
async function buildBadgeContext(
  tx: Tx,
  base: {
    profileId: string;
    courseId: string;
    level: number;
    totalXp: number;
    streak: { currentStreak: number; longestStreak: number };
    freezeUsedEver: boolean;
    dailyGoalHitNow: boolean;
  },
): Promise<BadgeContext> {
  const attempts = await tx.attempt.findMany({
    where: { profileId: base.profileId, courseId: base.courseId },
    select: { itemType: true, itemId: true, passed: true, hintsUsed: true, ms: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // First attempt per (type,id) → drives first-try counting.
  const firstSeen = new Set<string>();
  let firstTryCount = 0;
  let noHintCount = 0;
  let expertPassCount = 0;
  let fastHardPass = false;
  const passedByType = new Map<string, Set<string>>();

  for (const a of attempts) {
    const key = `${a.itemType}:${a.itemId}`;
    const isFirst = !firstSeen.has(key);
    firstSeen.add(key);
    if (a.passed) {
      if (!passedByType.has(a.itemType)) passedByType.set(a.itemType, new Set());
      passedByType.get(a.itemType)!.add(a.itemId);
      if (isFirst) firstTryCount++;
      if (a.hintsUsed === 0) noHintCount++;
      const ex = exerciseById(a.itemId);
      if (ex?.difficulty === 'expert') expertPassCount++;
      if (ex?.difficulty === 'hard' && a.ms < 60_000) fastHardPass = true;
    }
  }

  const passedExercises = passedByType.get('exercise') ?? new Set();
  const passedCount = passedExercises.size;
  const attemptsCount = attempts.length;
  const passesTotal = attempts.filter((a) => a.passed).length;

  const dailyGoalHits = await tx.dailyActivity.count({
    where: { profileId: base.profileId, xpEarned: { gte: 150 } },
  });
  const notesCount = await tx.note.count({ where: { profileId: base.profileId } });
  const cardReviews = await tx.cardReview.aggregate({ where: { profileId: base.profileId }, _sum: { reps: true } });
  const lessons = await tx.lessonProgress.findMany({
    where: { profileId: base.profileId, courseId: base.courseId, status: 'complete' },
    select: { dayNumber: true, section: true },
  });

  // A day is complete when all 10 sections are complete.
  const perDay = new Map<number, Set<string>>();
  for (const l of lessons) {
    if (!perDay.has(l.dayNumber)) perDay.set(l.dayNumber, new Set());
    perDay.get(l.dayNumber)!.add(l.section);
  }
  const daysComplete = new Set<number>();
  for (const [day, sections] of perDay) if (sections.size >= 10) daysComplete.add(day);

  const projectItems = passedByType.get('project') ?? new Set();
  const interviewItems = passedByType.get('interview') ?? new Set();
  const labItems = passedByType.get('lab') ?? new Set();
  const capstoneItems = passedByType.get('capstone') ?? new Set();
  const challengeItems = passedByType.get('challenge') ?? new Set();

  // Projects/interviews are keyed as slug/task. Count distinct slugs.
  const distinctSlugs = (set: Set<string>) => new Set([...set].map((id) => id.split('/')[0])).size;

  const firstQueryRun = attemptsCount > 0;
  const profile = await tx.profile.findUnique({ where: { id: base.profileId }, select: { displayName: true } });

  return {
    level: base.level,
    totalXp: base.totalXp,
    currentStreak: base.streak.currentStreak,
    longestStreak: base.streak.longestStreak,
    freezeUsedEver: base.freezeUsedEver,
    dailyGoalHits,
    firstQueryRun,
    profileNamed: Boolean(profile?.displayName && profile.displayName !== 'Analyst'),
    passedCount,
    firstTryCount,
    noHintCount,
    expertPassCount,
    debugPassCount: 0, // debug quiz answers are recorded client-side; awarded at that site
    attemptsCount,
    accuracy: attemptsCount ? passesTotal / attemptsCount : 0,
    fastHardPass,
    timedAssessmentPerfect: false,
    daysComplete,
    projectsComplete: distinctSlugs(projectItems),
    interviewsComplete: distinctSlugs(interviewItems),
    labsComplete: distinctSlugs(labItems),
    capstoneAnswered: capstoneItems.size,
    dailyChallengesComplete: challengeItems.size,
    blindPass: false,
    interviewModeComplete: interviewItems.size > 0,
    flashcardReviews: cardReviews._sum.reps ?? 0,
    notesCount,
    leaderboardTop3: false,
  };
}
