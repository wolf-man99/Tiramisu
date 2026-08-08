import type { Difficulty, Exercise } from '../types';
import { DIFFICULTY_XP } from '../types';
import { M01 } from './m01';
import { M02 } from './m02';
import { M03 } from './m03';
import { M04 } from './m04';
import { M05 } from './m05';
import { M06 } from './m06';
import { M07 } from './m07';
import { M08 } from './m08';
import { M09 } from './m09';
import { M10 } from './m10';
import { M11 } from './m11';
import { M12 } from './m12';

export const EXERCISES: Exercise[] = [
  ...M01, ...M02, ...M03, ...M04, ...M05, ...M06,
  ...M07, ...M08, ...M09, ...M10, ...M11, ...M12,
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function exerciseById(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

export function exercisesByModule(module: number): Exercise[] {
  return EXERCISES.filter((e) => e.module === module);
}

export function exercisesByDay(day: number): Exercise[] {
  return EXERCISES.filter((e) => e.day === day);
}

export function exercisesByDifficulty(difficulty: Difficulty): Exercise[] {
  return EXERCISES.filter((e) => e.difficulty === difficulty);
}

export function exercisesByConcept(concept: string): Exercise[] {
  return EXERCISES.filter((e) => e.concepts.includes(concept));
}

export function exerciseXp(e: Exercise): number {
  return DIFFICULTY_XP[e.difficulty];
}

/** Every concept referenced by the bank, sorted by how often it appears. */
export function allConcepts(): Array<{ concept: string; count: number }> {
  const counts = new Map<string, number>();
  for (const e of EXERCISES) {
    for (const c of e.concepts) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([concept, count]) => ({ concept, count }))
    .sort((a, b) => b.count - a.count || a.concept.localeCompare(b.concept));
}

/**
 * Deterministic daily/weekly challenge selection.
 *
 * Seeded on the date so every learner gets the same challenge on the same day and it
 * is stable across reloads, without any server state.
 */
export function challengeForDate(isoDate: string, pool: Exercise[] = EXERCISES): Exercise {
  let h = 2166136261;
  for (let i = 0; i < isoDate.length; i++) {
    h ^= isoDate.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return pool[Math.abs(h) % pool.length];
}
