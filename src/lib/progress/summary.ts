import { prisma, LOCAL_PROFILE_ID } from '../db';
import { EXERCISES } from '../content/exercises';
import { PROJECTS } from '../content/projects';
import { INTERVIEWS } from '../content/interviews';
import { CAPSTONE } from '../content/capstone';
import { DAYS } from '../content/curriculum';
import { BADGES } from '../content/badges';
import { levelState } from './leveling';
import { streakAtRisk } from './streak';
import { weakAreas, recommendExercises, type ConceptStatLike } from './recommend';
import { ensureProfile } from './persist';

/** The full payload the dashboard renders. One call, so the client stays simple. */
export async function dashboardSummary(today = new Date().toISOString().slice(0, 10)) {
  await ensureProfile();
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: LOCAL_PROFILE_ID } });

  const [attempts, conceptStats, badgeAwards, lessons, todayActivity, recent] = await Promise.all([
    prisma.attempt.findMany({ where: { profileId: profile.id }, select: { itemType: true, itemId: true, passed: true, ms: true } }),
    prisma.conceptStat.findMany({ where: { profileId: profile.id } }),
    prisma.badgeAward.findMany({ where: { profileId: profile.id } }),
    prisma.lessonProgress.findMany({ where: { profileId: profile.id, status: 'complete' }, select: { dayNumber: true, section: true } }),
    prisma.dailyActivity.findUnique({ where: { profileId_date: { profileId: profile.id, date: today } } }),
    prisma.dailyActivity.findMany({ where: { profileId: profile.id }, orderBy: { date: 'desc' }, take: 14 }),
  ]);

  // Distinct passed items by type.
  const passed = new Map<string, Set<string>>();
  let totalAttempts = 0;
  let totalPasses = 0;
  let totalMs = 0;
  for (const a of attempts) {
    totalAttempts++;
    if (a.passed) {
      totalPasses++;
      if (!passed.has(a.itemType)) passed.set(a.itemType, new Set());
      passed.get(a.itemType)!.add(a.itemId);
    }
    totalMs += a.ms;
  }
  const passedExercises = passed.get('exercise') ?? new Set();
  const passedProjects = new Set([...(passed.get('project') ?? [])].map((i) => i.split('/')[0]));
  const passedInterviews = new Set([...(passed.get('interview') ?? [])].map((i) => i.split('/')[0]));
  const passedCapstone = passed.get('capstone') ?? new Set();

  // Days complete (all 10 sections).
  const perDay = new Map<number, Set<string>>();
  for (const l of lessons) {
    if (!perDay.has(l.dayNumber)) perDay.set(l.dayNumber, new Set());
    perDay.get(l.dayNumber)!.add(l.section);
  }
  const completedDays = [...perDay.entries()].filter(([, s]) => s.size >= 10).map(([d]) => d).sort((a, b) => a - b);
  const currentDay = Math.min(14, (completedDays.length ? Math.max(...completedDays) : 0) + 1);
  const currentModule = DAYS.find((d) => d.day === currentDay)?.module ?? 1;

  // Concepts unlocked = those tagged on days up to currentDay.
  const unlocked = new Set<string>();
  for (const d of DAYS) if (d.day <= currentDay) for (const c of d.concepts) unlocked.add(c);

  const statLikes: ConceptStatLike[] = conceptStats.map((s) => ({
    concept: s.concept, attempts: s.attempts, passes: s.passes, firstTryOk: s.firstTryOk, mastery: s.mastery, lastSeenAt: s.lastSeenAt,
  }));
  const weak = weakAreas(statLikes, { unlockedConcepts: unlocked });
  const recommendations = recommendExercises(weak, passedExercises);

  const ls = levelState(profile.xp);
  const awardedIds = new Set(badgeAwards.map((b) => b.badgeId));

  return {
    profile: {
      displayName: profile.displayName,
      avatarSeed: profile.avatarSeed,
      xp: profile.xp,
      coins: profile.coins,
      level: ls.level,
      title: ls.title,
      levelProgress: ls.progress,
      xpForNext: ls.xpForNext,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      streakFreezes: profile.streakFreezes,
      streakAtRisk: streakAtRisk(profile.lastActiveDate, today),
      dailyGoalXp: profile.dailyGoalXp,
    },
    stats: {
      completedExercises: passedExercises.size,
      totalExercises: EXERCISES.length,
      accuracy: totalAttempts ? Math.round((totalPasses / totalAttempts) * 1000) / 10 : 0,
      avgMs: totalAttempts ? Math.round(totalMs / totalAttempts) : 0,
      projectsCompleted: passedProjects.size,
      totalProjects: PROJECTS.length,
      interviewsCompleted: passedInterviews.size,
      totalInterviews: INTERVIEWS.length,
      capstoneAnswered: passedCapstone.size,
      totalCapstone: CAPSTONE.length,
      badgesEarned: awardedIds.size,
      totalBadges: BADGES.length,
      currentDay,
      currentModule,
      completedDays,
    },
    todayXp: todayActivity?.xpEarned ?? 0,
    activity: recent.map((d) => ({ date: d.date, xp: d.xpEarned, solved: d.exercisesSolved, failed: d.exercisesFailed })).reverse(),
    weakAreas: weak,
    recommendations,
    badges: BADGES.map((b) => ({ ...b, earned: awardedIds.has(b.id) })),
  };
}
