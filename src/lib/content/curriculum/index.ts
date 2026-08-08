import type { DayContent } from '../types';
import { DAYS_01_05 } from './days-01-05';
import { DAYS_06_10 } from './days-06-10';
import { DAYS_11_14 } from './days-11-14';

/**
 * The 14-day curriculum. Each day is one {@link DayContent}: theory, a visual, worked
 * examples, a playground, practice ids drawn from the exercise bank, a quiz, a timed
 * assessment, a challenge, reflection prompts and a daily project.
 *
 * Days map onto modules 1–12 (days 6–7 both sit in the JOINs module, and every other
 * day is one module), so `DAYS.length === 14` while there are 12 modules.
 */
export const DAYS: DayContent[] = [...DAYS_01_05, ...DAYS_06_10, ...DAYS_11_14];

/** All days belonging to a module, in day order. */
export function daysForModule(module: number): DayContent[] {
  return DAYS.filter((d) => d.module === module);
}

/** Lookup by day number, 1–14. */
export function dayByNumber(day: number): DayContent | undefined {
  return DAYS.find((d) => d.day === day);
}

/** Distinct modules in teaching order, with their title and the days that cover them. */
export function moduleOutline(): { module: number; title: string; days: number[] }[] {
  const out: { module: number; title: string; days: number[] }[] = [];
  for (const d of DAYS) {
    const existing = out.find((m) => m.module === d.module);
    if (existing) existing.days.push(d.day);
    else out.push({ module: d.module, title: d.moduleTitle, days: [d.day] });
  }
  return out;
}

/** Every practice/assessment/challenge exercise id referenced by a given day. */
export function exerciseIdsForDay(day: number): string[] {
  const d = dayByNumber(day);
  if (!d) return [];
  return [...d.practice, ...d.assessment.exerciseIds, d.challenge];
}

/** Total estimated minutes across the whole programme. */
export function totalEstimatedMinutes(): number {
  return DAYS.reduce((a, d) => a + d.estimatedMinutes, 0);
}
