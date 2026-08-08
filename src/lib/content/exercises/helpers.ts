import type { Difficulty, Exercise } from '../types';

/**
 * Compact constructor for exercises. Keeping the call sites terse matters: there are
 * 300 of them, and the signal-to-noise of the content files is what makes the bank
 * maintainable.
 */
export function ex(
  id: string,
  day: number,
  difficulty: Difficulty,
  title: string,
  prompt: string,
  tables: string[],
  concepts: string[],
  solution: string,
  hints: string[],
  extra: Partial<Exercise> = {},
): Exercise {
  return {
    id,
    module: Number(id.split('.')[0]),
    day,
    title,
    prompt,
    difficulty,
    tables,
    concepts,
    solution: solution.trim(),
    hints,
    ...extra,
  };
}
