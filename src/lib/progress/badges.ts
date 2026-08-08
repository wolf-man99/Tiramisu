import { BADGES } from '../content/badges';
import type { Badge } from '../content/types';

/**
 * The snapshot a badge predicate reads. The persistence layer assembles it from the
 * Profile and its rollups; anything it cannot cheaply compute defaults to 0/false, so
 * a badge simply stays locked rather than throwing.
 */
export interface BadgeContext {
  level: number;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  freezeUsedEver: boolean;
  dailyGoalHits: number;

  firstQueryRun: boolean;
  profileNamed: boolean;

  passedCount: number;
  firstTryCount: number;
  noHintCount: number;
  expertPassCount: number;
  debugPassCount: number;
  attemptsCount: number;
  accuracy: number; // 0..1 over graded attempts

  fastHardPass: boolean; // a hard exercise passed in < 60s
  timedAssessmentPerfect: boolean;

  daysComplete: Set<number>; // day numbers with all sections done
  projectsComplete: number;
  interviewsComplete: number;
  labsComplete: number;
  capstoneAnswered: number;

  dailyChallengesComplete: number;
  blindPass: boolean;
  interviewModeComplete: boolean;

  flashcardReviews: number;
  notesCount: number;
  leaderboardTop3: boolean;
}

const rangeComplete = (days: Set<number>, from: number, to: number): boolean => {
  for (let d = from; d <= to; d++) if (!days.has(d)) return false;
  return true;
};

/** Predicate per badge id. A badge with no predicate here is never auto-awarded. */
const PREDICATES: Record<string, (c: BadgeContext) => boolean> = {
  // Onboarding
  'first-query': (c) => c.firstQueryRun,
  'first-correct': (c) => c.passedCount >= 1,
  'profile-set': (c) => c.profileNamed,

  // Streaks
  'streak-3': (c) => c.longestStreak >= 3,
  'streak-7': (c) => c.longestStreak >= 7,
  'streak-14': (c) => c.longestStreak >= 14,
  'streak-30': (c) => c.longestStreak >= 30,
  'streak-saved': (c) => c.freezeUsedEver,

  // XP and levels
  'level-5': (c) => c.level >= 5,
  'level-10': (c) => c.level >= 10,
  'level-20': (c) => c.level >= 20,
  'level-30': (c) => c.level >= 30,
  'xp-1000': (c) => c.totalXp >= 1000,
  'xp-10000': (c) => c.totalXp >= 10000,
  'daily-goal-7': (c) => c.dailyGoalHits >= 7,

  // Day / module completion
  'day-1-done': (c) => c.daysComplete.has(1),
  'foundations-done': (c) => rangeComplete(c.daysComplete, 1, 5),
  'joins-done': (c) => rangeComplete(c.daysComplete, 6, 7),
  'windows-done': (c) => c.daysComplete.has(10),
  'bigquery-done': (c) => c.daysComplete.has(11),
  'ga4-done': (c) => c.daysComplete.has(12),
  'marketing-done': (c) => c.daysComplete.has(13),
  'all-days-done': (c) => rangeComplete(c.daysComplete, 1, 14),

  // Accuracy and craft
  'first-try-10': (c) => c.firstTryCount >= 10,
  'first-try-50': (c) => c.firstTryCount >= 50,
  'no-hints-25': (c) => c.noHintCount >= 25,
  'expert-10': (c) => c.expertPassCount >= 10,
  'accuracy-90': (c) => c.attemptsCount >= 50 && c.accuracy >= 0.9,
  'debugger': (c) => c.debugPassCount >= 20,

  // Speed
  'speed-runner': (c) => c.fastHardPass,
  'timed-perfect': (c) => c.timedAssessmentPerfect,

  // Practice modes
  'daily-challenge-1': (c) => c.dailyChallengesComplete >= 1,
  'daily-challenge-14': (c) => c.dailyChallengesComplete >= 14,
  'blind-mode': (c) => c.blindPass,
  'interview-mode': (c) => c.interviewModeComplete,

  // Projects, interviews, labs
  'project-1': (c) => c.projectsComplete >= 1,
  'project-all': (c) => c.projectsComplete >= 10,
  'interview-3': (c) => c.interviewsComplete >= 3,
  'interview-all': (c) => c.interviewsComplete >= 10,
  'labs-all': (c) => c.labsComplete >= 9,

  // Capstone
  'capstone-started': (c) => c.capstoneAnswered >= 1,
  'capstone-half': (c) => c.capstoneAnswered >= 50,
  'capstone-complete': (c) => c.capstoneAnswered >= 100,

  // Bonus
  'flashcards-100': (c) => c.flashcardReviews >= 100,
  'note-taker': (c) => c.notesCount >= 10,
  'leaderboard-top-3': (c) => c.leaderboardTop3,
};

/** Ids of every badge whose criterion the context now satisfies. */
export function earnedBadgeIds(ctx: BadgeContext): string[] {
  return BADGES.filter((b) => PREDICATES[b.id]?.(ctx) ?? false).map((b) => b.id);
}

/**
 * Given the badges already awarded, return the ones newly earned by this context.
 * The caller persists these and surfaces them as toasts.
 */
export function newlyEarnedBadges(ctx: BadgeContext, alreadyAwarded: Set<string>): Badge[] {
  return BADGES.filter(
    (b) => !alreadyAwarded.has(b.id) && (PREDICATES[b.id]?.(ctx) ?? false),
  );
}
