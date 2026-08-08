import { DIFFICULTY_XP, type Difficulty } from '../content/types';

/**
 * XP, levels and titles.
 *
 * The curve is quadratic: each level costs a little more than the last, so early
 * levels come fast (dopamine) and later ones are a real grind (mastery). Level 1 sits
 * at 0 XP. The gap from level L to L+1 is `BASE + STEP * (L - 1)`.
 */
const BASE = 120;
const STEP = 40;

/** Cumulative XP required to *reach* the start of a given level (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  // Sum of the arithmetic gaps for levels 1..level-1.
  const n = level - 1;
  return n * BASE + STEP * ((n * (n - 1)) / 2);
}

/** The level a given cumulative XP total falls in. */
export function levelForXp(xp: number): number {
  if (xp <= 0) return 1;
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export interface LevelState {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number; // 0..1 through the current level
  title: string;
}

/** Everything the dashboard's level ring needs, derived from a raw XP total. */
export function levelState(xp: number): LevelState {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const span = ceil - floor;
  const into = xp - floor;
  return {
    level,
    xpIntoLevel: into,
    xpForNext: ceil - xp,
    progress: span > 0 ? into / span : 0,
    title: titleForLevel(level),
  };
}

/** Progression titles, one band every few levels. */
const TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 1, title: 'Curious' },
  { minLevel: 3, title: 'Query Novice' },
  { minLevel: 5, title: 'Junior Analyst' },
  { minLevel: 8, title: 'Data Reader' },
  { minLevel: 10, title: 'Analyst' },
  { minLevel: 13, title: 'Metrics Fluent' },
  { minLevel: 16, title: 'Growth Analyst' },
  { minLevel: 20, title: 'Senior Analyst' },
  { minLevel: 24, title: 'Attribution Whisperer' },
  { minLevel: 28, title: 'Analytics Lead' },
  { minLevel: 32, title: 'Head of Analytics' },
  { minLevel: 40, title: 'Northbeam Legend' },
];

export function titleForLevel(level: number): string {
  let title = TITLES[0].title;
  for (const t of TITLES) if (level >= t.minLevel) title = t.title;
  return title;
}

/**
 * XP for a graded pass. Full value on a clean first-try pass; reduced by hints used
 * and later attempts; a floor so effort always pays something. A revealed solution
 * earns nothing — you did not solve it.
 */
export function xpForPass(opts: {
  difficulty: Difficulty;
  attemptNumber: number; // 1-indexed
  hintsUsed: number;
  revealed: boolean;
  firstTry: boolean;
}): number {
  if (opts.revealed) return 0;
  const base = DIFFICULTY_XP[opts.difficulty];
  const hintPenalty = Math.min(0.5, opts.hintsUsed * 0.15);
  const attemptPenalty = Math.min(0.4, (opts.attemptNumber - 1) * 0.1);
  const firstTryBonus = opts.firstTry ? 0.15 : 0;
  const factor = Math.max(0.35, 1 - hintPenalty - attemptPenalty + firstTryBonus);
  return Math.round(base * factor);
}

/** Coins are a soft currency: a flat fraction of XP, rounded, minimum 1 on any pass. */
export function coinsForXp(xp: number): number {
  return xp > 0 ? Math.max(1, Math.round(xp / 10)) : 0;
}
