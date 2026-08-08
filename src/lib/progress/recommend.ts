import { EXERCISES, exercisesByConcept } from '../content/exercises';
import type { Exercise } from '../content/types';

/**
 * Weak-area detection and next-step recommendations, driven by per-concept mastery.
 * Pure over the stats you pass in, so it is trivial to test and has no DB dependency.
 */

export interface ConceptStatLike {
  concept: string;
  attempts: number;
  passes: number;
  firstTryOk: number;
  mastery: number; // 0..1
  lastSeenAt: Date | string;
}

export interface WeakArea {
  concept: string;
  mastery: number;
  attempts: number;
  passRate: number;
  /** Why it surfaced: 'struggling' (low pass rate) or 'rusty' (not seen lately). */
  reason: 'struggling' | 'rusty' | 'untouched';
}

const DAY_MS = 86_400_000;

/**
 * Rank a learner's weakest concepts. Concepts with real attempts and a low pass rate
 * come first (struggling), then concepts learned but not practised recently (rusty),
 * then concepts never attempted at all (untouched) — but only ones the curriculum has
 * already introduced, which the caller signals via `unlockedConcepts`.
 */
export function weakAreas(
  stats: ConceptStatLike[],
  opts: { now?: number; unlockedConcepts?: Set<string>; limit?: number } = {},
): WeakArea[] {
  const now = opts.now ?? Date.now();
  const limit = opts.limit ?? 5;
  const byConcept = new Map(stats.map((s) => [s.concept, s]));

  const struggling: WeakArea[] = [];
  const rusty: WeakArea[] = [];

  for (const s of stats) {
    if (s.attempts === 0) continue;
    const passRate = s.passes / s.attempts;
    const ageDays = (now - new Date(s.lastSeenAt).getTime()) / DAY_MS;
    if (s.attempts >= 3 && (passRate < 0.6 || s.mastery < 0.5)) {
      struggling.push({ concept: s.concept, mastery: s.mastery, attempts: s.attempts, passRate, reason: 'struggling' });
    } else if (s.mastery >= 0.5 && ageDays > 10) {
      rusty.push({ concept: s.concept, mastery: s.mastery, attempts: s.attempts, passRate, reason: 'rusty' });
    }
  }

  struggling.sort((a, b) => a.mastery - b.mastery || b.attempts - a.attempts);
  rusty.sort((a, b) => a.mastery - b.mastery);

  const untouched: WeakArea[] = [];
  if (opts.unlockedConcepts) {
    for (const c of opts.unlockedConcepts) {
      if (!byConcept.has(c) || byConcept.get(c)!.attempts === 0) {
        untouched.push({ concept: c, mastery: 0, attempts: 0, passRate: 0, reason: 'untouched' });
      }
    }
  }

  return [...struggling, ...rusty, ...untouched].slice(0, limit);
}

export interface Recommendation {
  exerciseId: string;
  title: string;
  difficulty: Exercise['difficulty'];
  concepts: string[];
  reason: string;
}

/**
 * Recommend the next few exercises. Targets the learner's weak concepts first, avoiding
 * anything already passed, and biases toward the difficulty just above their comfort.
 */
export function recommendExercises(
  weak: WeakArea[],
  passedIds: Set<string>,
  opts: { limit?: number } = {},
): Recommendation[] {
  const limit = opts.limit ?? 4;
  const out: Recommendation[] = [];
  const used = new Set<string>();

  const pushFor = (concept: string, reason: string) => {
    const candidates = exercisesByConcept(concept)
      .filter((e) => !passedIds.has(e.id) && !used.has(e.id))
      // Prefer easier reps for a struggling concept, harder for a rusty one.
      .sort((a, b) => difficultyRank(a.difficulty) - difficultyRank(b.difficulty));
    const pick = candidates[0];
    if (pick) {
      used.add(pick.id);
      out.push({ exerciseId: pick.id, title: pick.title, difficulty: pick.difficulty, concepts: pick.concepts, reason });
    }
  };

  for (const w of weak) {
    if (out.length >= limit) break;
    const reason = w.reason === 'struggling'
      ? `You've been missing ${label(w.concept)} — here's a focused rep.`
      : w.reason === 'rusty'
        ? `You haven't touched ${label(w.concept)} in a while — keep it sharp.`
        : `Time to start ${label(w.concept)}.`;
    pushFor(w.concept, reason);
  }

  // Backfill with any unsolved exercise if we came up short.
  if (out.length < limit) {
    for (const e of EXERCISES) {
      if (out.length >= limit) break;
      if (passedIds.has(e.id) || used.has(e.id)) continue;
      used.add(e.id);
      out.push({ exerciseId: e.id, title: e.title, difficulty: e.difficulty, concepts: e.concepts, reason: 'Keep your momentum going.' });
    }
  }

  return out;
}

function difficultyRank(d: Exercise['difficulty']): number {
  return { easy: 0, medium: 1, hard: 2, expert: 3 }[d];
}

function label(concept: string): string {
  return concept.replace(/-/g, ' ');
}
