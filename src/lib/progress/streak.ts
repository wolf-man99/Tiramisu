/**
 * Streak arithmetic. Pure functions over ISO date strings (YYYY-MM-DD) so they are
 * trivial to test and free of timezone surprises — the caller resolves "today" in the
 * profile's timezone and passes the string in.
 */

/** Days between two ISO dates (b - a), using UTC midnight to avoid DST drift. */
export function daysBetween(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  return Math.round((tb - ta) / 86_400_000);
}

export interface StreakInput {
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  lastActiveDate: string | null;
  today: string;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  /** Did this activity extend the streak (vs. same-day, or a reset)? */
  extended: boolean;
  /** Was a freeze spent to bridge a single missed day? */
  freezeUsed: boolean;
}

/**
 * Recompute streak state when the learner is active on `today`.
 *
 * - Same day as last active → no change.
 * - Exactly one day later → +1.
 * - A gap with freezes available → spend one freeze per missed day, keep the streak.
 * - A gap too wide to cover → reset to 1.
 */
export function applyActivity(input: StreakInput): StreakResult {
  const { lastActiveDate, today } = input;
  let { currentStreak, longestStreak, streakFreezes } = input;

  if (!lastActiveDate) {
    currentStreak = 1;
    longestStreak = Math.max(longestStreak, 1);
    return { currentStreak, longestStreak, streakFreezes, extended: true, freezeUsed: false };
  }

  const gap = daysBetween(lastActiveDate, today);

  if (gap <= 0) {
    // Same day (or clock skew) — activity already counted.
    return { currentStreak, longestStreak, streakFreezes, extended: false, freezeUsed: false };
  }

  if (gap === 1) {
    currentStreak += 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    return { currentStreak, longestStreak, streakFreezes, extended: true, freezeUsed: false };
  }

  // gap >= 2: missed (gap - 1) whole days. Cover them with freezes if we can.
  const missed = gap - 1;
  if (missed <= streakFreezes) {
    streakFreezes -= missed;
    currentStreak += 1;
    longestStreak = Math.max(longestStreak, currentStreak);
    return { currentStreak, longestStreak, streakFreezes, extended: true, freezeUsed: true };
  }

  // Streak broken.
  currentStreak = 1;
  longestStreak = Math.max(longestStreak, 1);
  return { currentStreak, longestStreak, streakFreezes, extended: true, freezeUsed: false };
}

/** Is the streak in danger — active yesterday, nothing today yet? */
export function streakAtRisk(lastActiveDate: string | null, today: string): boolean {
  if (!lastActiveDate) return false;
  return daysBetween(lastActiveDate, today) === 1;
}
