/**
 * SM-2 spaced repetition, the algorithm behind Anki. One review updates ease,
 * interval and the due date. Grades are 0–5; 3+ is a pass.
 *
 * State is stored per (profile, card) in `CardReview`; this module is the pure maths.
 */

export interface SrsState {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  dueDate: string; // ISO date
}

export interface SrsResult extends SrsState {
  lastGrade: number;
}

const MIN_EASE = 1.3;

function addDays(iso: string, days: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Apply a review grade (0–5) on `today`, returning the next scheduling state.
 *
 * A lapse (grade < 3) resets the interval and reps but only nudges ease down, so a
 * card you keep failing comes back fast and often, which is the point.
 */
export function review(state: SrsState, grade: number, today: string): SrsResult {
  const g = Math.max(0, Math.min(5, Math.round(grade)));
  let { ease, intervalDays, reps, lapses } = state;

  // SM-2 ease update.
  ease = ease + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02));
  if (ease < MIN_EASE) ease = MIN_EASE;

  if (g < 3) {
    lapses += 1;
    reps = 0;
    intervalDays = 1;
  } else {
    reps += 1;
    if (reps === 1) intervalDays = 1;
    else if (reps === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * ease);
  }

  return {
    ease: Math.round(ease * 100) / 100,
    intervalDays,
    reps,
    lapses,
    dueDate: addDays(today, intervalDays),
    lastGrade: g,
  };
}

/** A brand-new card is due immediately. */
export function freshCard(today: string): SrsState {
  return { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, dueDate: today };
}

/** Is a card due for review on or before `today`? */
export function isDue(dueDate: string, today: string): boolean {
  return dueDate <= today;
}
