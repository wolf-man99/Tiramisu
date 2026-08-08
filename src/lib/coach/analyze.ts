import type { CompareResult } from '../grading/compare';

/**
 * The deterministic core of the coach. It reads the learner's SQL, the grading result
 * and (optionally) the exercise metadata, and produces a diagnosis plus mentor-style
 * notes. It never reveals the reference solution — it points at the shape of the
 * mistake and asks the question that unlocks it.
 *
 * Every detector is a pure function of the inputs, so the coach is fast, free and
 * testable. The optional LLM layer in `coach.ts` builds on top of this, never instead
 * of it.
 */

export type DiagnosisCode =
  | 'ok'
  | 'not-run'
  | 'syntax'
  | 'empty-result'
  | 'left-join-filtered-to-inner'
  | 'missing-order-by'
  | 'wrong-order'
  | 'column-count'
  | 'extra-rows'
  | 'missing-rows'
  | 'wrong-values'
  | 'select-star'
  | 'equals-null'
  | 'average-of-rate'
  | 'unsafe-divide'
  | 'aggregate-without-group'
  | 'having-without-group'
  | 'unfiltered-qa'
  | 'no-limit'
  | 'generic-mismatch';

export type NoteTone = 'hint' | 'warn' | 'praise' | 'style';

export interface CoachNote {
  tone: NoteTone;
  title: string;
  body: string;
}

export interface AnalyzeInput {
  sql: string;
  passed: boolean;
  compare?: CompareResult;
  error?: { kind: string; message: string; hint?: string };
  concepts?: string[];
  hintsUsed?: number;
}

export interface Analysis {
  diagnosis: DiagnosisCode;
  headline: string;
  notes: CoachNote[];
}

const norm = (sql: string) => sql.replace(/--[^\n]*/g, ' ').replace(/\s+/g, ' ').toLowerCase();

// ── Individual detectors ─────────────────────────────────────────────────────

function detectEqualsNull(sql: string): CoachNote | null {
  if (/[a-z0-9_)\]]\s*(=|!=|<>)\s*null\b/i.test(sql)) {
    return {
      tone: 'warn',
      title: 'NULL never equals anything',
      body: 'You compared a column to NULL with `=` or `<>`. In SQL that is always unknown, so the row is dropped. Use `IS NULL` / `IS NOT NULL` instead.',
    };
  }
  return null;
}

function detectSelectStar(n: string): CoachNote | null {
  const withoutCount = n.replace(/count\s*\(\s*\*\s*\)/g, '');
  if (/select\s+(?:[a-z_][a-z0-9_]*\.)?\*/.test(withoutCount)) {
    return {
      tone: 'style',
      title: 'Name your columns',
      body: 'In BigQuery `SELECT *` reads and bills every column, and it makes your result fragile. List only the columns the answer needs.',
    };
  }
  return null;
}

function detectLeftJoinFilter(sql: string, n: string): CoachNote | null {
  if (!/left\s+join/.test(n)) return null;
  // A WHERE mentioning a right-side column with a non-NULL predicate is the classic trap.
  // Heuristic: LEFT JOIN present, and WHERE has an equality/`in`/`like` (not IS NULL) after it.
  const whereIdx = n.indexOf(' where ');
  if (whereIdx === -1) return null;
  const where = n.slice(whereIdx + 7);
  const hasPositivePredicate = /[a-z0-9_.]+\s*(=|>|<|>=|<=|like|in)\s/.test(where);
  const looksLikeAntiJoin = /is\s+null/.test(where);
  if (hasPositivePredicate && !looksLikeAntiJoin) {
    return {
      tone: 'hint',
      title: 'Is your LEFT JOIN still a LEFT JOIN?',
      body: 'A condition on the right-hand table placed in `WHERE` fails for the unmatched rows (their columns are NULL), silently turning your LEFT JOIN into an INNER JOIN. If the condition is meant to filter the join, move it into the `ON` clause.',
    };
  }
  return null;
}

function detectAverageOfRate(n: string): CoachNote | null {
  if (/avg\s*\(\s*[a-z0-9_.]*(rate|roas|ctr|cvr|cpc|cpm|ratio|pct|percent)/.test(n)) {
    return {
      tone: 'hint',
      title: 'Never average a rate',
      body: 'Averaging a per-row rate weights a day with three clicks the same as a day with three thousand. Sum the numerator and denominator separately, then divide once: `SAFE_DIVIDE(SUM(x), SUM(y))`.',
    };
  }
  return null;
}

function detectUnsafeDivide(n: string): CoachNote | null {
  // A bare `/` between identifiers, no SAFE_DIVIDE anywhere.
  if (/[a-z0-9_)\]]\s*\/\s*[a-z0-9_(]/.test(n) && !/safe_divide/.test(n)) {
    return {
      tone: 'style',
      title: 'Guard your division',
      body: 'A plain `/` throws or returns infinity when the denominator is zero — and marketing denominators (clicks, impressions) hit zero constantly. `SAFE_DIVIDE(a, b)` returns NULL instead.',
    };
  }
  return null;
}

function detectHavingWithoutGroup(n: string): CoachNote | null {
  if (/\bhaving\b/.test(n) && !/\bgroup\s+by\b/.test(n)) {
    return {
      tone: 'warn',
      title: 'HAVING without GROUP BY',
      body: 'HAVING filters groups, so it needs something to group. If you meant to filter individual rows, use WHERE; if you meant to filter aggregates, add the GROUP BY.',
    };
  }
  return null;
}

function detectUnfilteredQa(n: string, concepts?: string[]): CoachNote | null {
  const touchesSessions = /ga4_sessions|ga4_events/.test(n);
  const filtersQa = /internal-qa|internal_qa|qa/.test(n);
  if (touchesSessions && !filtersQa && concepts?.some((c) => c.startsWith('ga4'))) {
    return {
      tone: 'hint',
      title: 'Is QA traffic in your numbers?',
      body: 'This warehouse seeds `internal-qa` sessions on purpose. Real reporting excludes them. Check whether the expected answer filters `source <> \'internal-qa\'`.',
    };
  }
  return null;
}

// ── Orchestration ────────────────────────────────────────────────────────────

/** Style/optimisation notes that apply whether or not the answer passed. */
function styleNotes(sql: string, n: string, concepts?: string[]): CoachNote[] {
  return [
    detectSelectStar(n),
    detectUnsafeDivide(n),
    detectEqualsNull(sql),
    detectUnfilteredQa(n, concepts),
  ].filter((x): x is CoachNote => x !== null);
}

export function analyze(input: AnalyzeInput): Analysis {
  const { sql, passed, compare, error } = input;
  const n = norm(sql);

  if (error) {
    return {
      diagnosis: error.kind === 'timeout' ? 'syntax' : 'syntax',
      headline: 'Your query did not run.',
      notes: [
        { tone: 'warn', title: 'Fix the error first', body: error.hint ?? error.message },
        ...styleNotes(sql, n, input.concepts),
      ],
    };
  }

  if (passed) {
    const notes: CoachNote[] = [
      { tone: 'praise', title: 'Correct', body: 'Your result matched the reference exactly.' },
      ...styleNotes(sql, n, input.concepts),
    ];
    return { diagnosis: 'ok', headline: 'Correct — and here is how to make it cleaner.', notes };
  }

  // Failed but ran: use the comparison to target the coaching.
  const notes: CoachNote[] = [];
  let diagnosis: DiagnosisCode = 'generic-mismatch';
  let headline = 'Close — the result does not match yet.';

  const code = compare?.code;

  // Structural, concept-driven hints first — they explain *why*.
  const leftJoin = detectLeftJoinFilter(sql, n);
  const avgRate = detectAverageOfRate(n);
  const having = detectHavingWithoutGroup(n);

  if (code === 'no-rows') {
    diagnosis = 'empty-result';
    headline = 'Your query ran but returned no rows.';
    notes.push({
      tone: 'hint',
      title: 'Something filtered everything out',
      body: 'An empty result usually means a filter is too strict, a join found no matches, or a date range is off. Loosen one condition at a time and watch which one brings rows back.',
    });
    if (leftJoin) notes.push(leftJoin);
  } else if (code === 'wrong-order') {
    diagnosis = 'wrong-order';
    headline = 'Right rows, wrong order.';
    notes.push({
      tone: 'hint',
      title: 'Check your ORDER BY',
      body: 'The rows are correct but their order differs from what the question asks. Match the sort column and direction the prompt describes' + (compare?.firstDivergentIndex != null ? `; the first row out of place is position ${compare.firstDivergentIndex + 1}.` : '.'),
    });
  } else if (code === 'column-count') {
    diagnosis = 'column-count';
    headline = 'The columns do not line up.';
    notes.push({
      tone: 'warn',
      title: 'Wrong number of columns',
      body: `Expected ${compare?.expectedColumnCount} column(s), got ${compare?.actualColumnCount}. Re-read the prompt for exactly which fields — and which names — it asks for.`,
    });
  } else if (code === 'extra-rows') {
    diagnosis = 'extra-rows';
    headline = 'You have rows the answer does not.';
    notes.push({
      tone: 'hint',
      title: 'Too many rows',
      body: 'Your result includes rows the reference excludes. A missing filter, a wrong join type causing fan-out, or a forgotten DISTINCT is the usual cause.',
    });
    if (leftJoin) notes.push(leftJoin);
  } else if (code === 'missing-rows') {
    diagnosis = 'missing-rows';
    headline = 'Some expected rows are missing.';
    notes.push({
      tone: 'hint',
      title: 'Too few rows',
      body: 'The reference has rows you do not. An over-strict filter or an INNER JOIN dropping unmatched rows is the usual cause — check whether you need a LEFT JOIN.',
    });
    if (leftJoin) notes.push(leftJoin);
  } else if (code === 'wrong-values') {
    diagnosis = 'wrong-values';
    headline = 'Right shape, wrong numbers.';
    notes.push({
      tone: 'hint',
      title: 'The values are off',
      body: 'The rows and columns line up but the numbers differ. A rate averaged instead of weighted, a fan-out double-counting a sum, or the wrong aggregation are the classic causes.',
    });
    if (avgRate) notes.push(avgRate);
  }

  if (having && !notes.some((x) => x.title === having.title)) notes.push(having);
  if (avgRate && !notes.some((x) => x.title === avgRate.title)) notes.push(avgRate);

  notes.push(...styleNotes(sql, n, input.concepts));

  // De-dup by title, keep order.
  const seen = new Set<string>();
  const deduped = notes.filter((x) => (seen.has(x.title) ? false : (seen.add(x.title), true)));

  return { diagnosis, headline, notes: deduped };
}
