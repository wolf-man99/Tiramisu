/**
 * Result-set comparison.
 *
 * Grading runs the reference solution at submit time and compares result sets, so any
 * correct query passes, including formulations the author never considered. Column
 * *names* are ignored (a learner's alias should never fail them); column *count* and
 * *values* are what matter.
 */

export interface ResultSet {
  columns: string[];
  rows: unknown[][];
}

export interface CompareOptions {
  /** Compare row order too. Set when the question says "top 5", "ranked", "earliest". */
  orderMatters?: boolean;
  /** Relative tolerance for floats. Defaults to 1e-6. */
  tolerance?: number;
  /** Rows to include in the diff shown to the learner. */
  sampleSize?: number;
}

export type FailureCode =
  | 'no-rows'
  | 'column-count'
  | 'row-count'
  | 'wrong-order'
  | 'wrong-values'
  | 'extra-rows'
  | 'missing-rows';

export interface CompareResult {
  passed: boolean;
  code?: FailureCode;
  /** One sentence, written for the learner. */
  summary: string;
  expectedRowCount: number;
  actualRowCount: number;
  expectedColumnCount: number;
  actualColumnCount: number;
  missingRows: unknown[][];
  extraRows: unknown[][];
  /** Populated for ordered comparisons: the first position that diverged. */
  firstDivergentIndex?: number;
}

const DEFAULT_TOLERANCE = 1e-6;
const DEFAULT_SAMPLE = 5;

/**
 * Canonical form of a single cell.
 *
 * Everything that should compare equal has to render identically here: 3 and 3.0,
 * `'2024-06-14'` and `'2024-06-14 00:00:00'`, `true` and `1`, `null` and `undefined`.
 */
function canon(v: unknown, tolerance: number): string {
  if (v === null || v === undefined) return '\u0000null';
  if (typeof v === 'boolean') return v ? 'n:1' : 'n:0';
  if (typeof v === 'bigint') return `n:${v.toString()}`;
  if (typeof v === 'number') return canonNumber(v, tolerance);

  const s = String(v);
  // Numeric strings compare as numbers: SQLite's typing is loose enough that the same
  // value can arrive as 42 from one query and '42' from another.
  if (s !== '' && !Number.isNaN(Number(s)) && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s.trim())) {
    return canonNumber(Number(s), tolerance);
  }
  const ts = /^(\d{4}-\d{2}-\d{2})[ T]00:00:00(\.0+)?Z?$/.exec(s);
  if (ts) return `s:${ts[1]}`;
  return `s:${s.trim()}`;
}

function canonNumber(n: number, tolerance: number): string {
  if (!Number.isFinite(n)) return `n:${String(n)}`;
  if (n === 0) return 'n:0';
  // Round to a fixed number of significant digits so 0.30000000000000004 === 0.3.
  const digits = Math.max(1, Math.round(-Math.log10(tolerance)));
  const rounded = Number(n.toPrecision(digits));
  return `n:${Object.is(rounded, -0) ? 0 : rounded}`;
}

const canonRow = (row: unknown[], tolerance: number): string =>
  row.map((c) => canon(c, tolerance)).join('\u0001');

export function compareResults(
  actual: ResultSet,
  expected: ResultSet,
  options: CompareOptions = {},
): CompareResult {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const sample = options.sampleSize ?? DEFAULT_SAMPLE;

  const base = {
    expectedRowCount: expected.rows.length,
    actualRowCount: actual.rows.length,
    expectedColumnCount: expected.columns.length,
    actualColumnCount: actual.columns.length,
    missingRows: [] as unknown[][],
    extraRows: [] as unknown[][],
  };

  if (actual.columns.length !== expected.columns.length) {
    return {
      ...base,
      passed: false,
      code: 'column-count',
      summary:
        `Your query returns ${actual.columns.length} ` +
        `${plural(actual.columns.length, 'column')}, but the answer needs ` +
        `${expected.columns.length}.`,
    };
  }

  if (actual.rows.length === 0 && expected.rows.length > 0) {
    return {
      ...base,
      passed: false,
      code: 'no-rows',
      summary:
        `Your query returned no rows, ${expected.rows.length} were expected. ` +
        'A filter is usually too strict, or a JOIN found no matches.',
    };
  }

  if (options.orderMatters) {
    const n = Math.min(actual.rows.length, expected.rows.length);
    for (let i = 0; i < n; i++) {
      if (canonRow(actual.rows[i], tolerance) !== canonRow(expected.rows[i], tolerance)) {
        return {
          ...base,
          passed: false,
          code: 'wrong-order',
          firstDivergentIndex: i,
          missingRows: expected.rows.slice(i, i + sample),
          extraRows: actual.rows.slice(i, i + sample),
          summary:
            `Row ${i + 1} does not match. This question depends on order, so check your ` +
            'ORDER BY, including the tie-break and the direction.',
        };
      }
    }
    if (actual.rows.length !== expected.rows.length) {
      return rowCountFailure(base, actual, expected, sample, tolerance);
    }
    return { ...base, passed: true, summary: `Correct: ${actual.rows.length} ${plural(actual.rows.length, 'row')} in the right order.` };
  }

  // Unordered: diff the two rows as multisets so duplicates are handled correctly.
  const expectedCounts = new Map<string, number>();
  for (const r of expected.rows) {
    const k = canonRow(r, tolerance);
    expectedCounts.set(k, (expectedCounts.get(k) ?? 0) + 1);
  }
  const actualCounts = new Map<string, number>();
  for (const r of actual.rows) {
    const k = canonRow(r, tolerance);
    actualCounts.set(k, (actualCounts.get(k) ?? 0) + 1);
  }

  const missing: unknown[][] = [];
  const extra: unknown[][] = [];
  const expectedByKey = new Map<string, unknown[]>();
  for (const r of expected.rows) expectedByKey.set(canonRow(r, tolerance), r);
  const actualByKey = new Map<string, unknown[]>();
  for (const r of actual.rows) actualByKey.set(canonRow(r, tolerance), r);

  for (const [k, n] of expectedCounts) {
    const got = actualCounts.get(k) ?? 0;
    for (let i = 0; i < n - got && missing.length < sample; i++) missing.push(expectedByKey.get(k)!);
  }
  for (const [k, n] of actualCounts) {
    const want = expectedCounts.get(k) ?? 0;
    for (let i = 0; i < n - want && extra.length < sample; i++) extra.push(actualByKey.get(k)!);
  }

  if (!missing.length && !extra.length) {
    return {
      ...base,
      passed: true,
      summary: `Correct: ${actual.rows.length} ${plural(actual.rows.length, 'row')} match.`,
    };
  }

  const result = { ...base, missingRows: missing, extraRows: extra, passed: false };

  if (missing.length && extra.length && actual.rows.length === expected.rows.length) {
    return {
      ...result,
      code: 'wrong-values',
      summary:
        `The right number of rows (${actual.rows.length}), but some values differ. ` +
        'Compare the diff below: a rounding, a denominator, or a filter is usually the cause.',
    };
  }
  if (extra.length && !missing.length) {
    return {
      ...result,
      code: 'extra-rows',
      summary:
        `You returned ${actual.rows.length - expected.rows.length} row(s) too many. ` +
        'A missing filter, a missing DISTINCT, or a join fanning out are the usual causes.',
    };
  }
  if (missing.length && !extra.length) {
    return {
      ...result,
      code: 'missing-rows',
      summary:
        `You are missing ${expected.rows.length - actual.rows.length} row(s). ` +
        'An over-strict filter or an INNER JOIN that should be a LEFT JOIN are the usual causes.',
    };
  }
  return rowCountFailure(result, actual, expected, sample, tolerance);
}

function rowCountFailure(
  base: Omit<CompareResult, 'passed' | 'summary'>,
  actual: ResultSet,
  expected: ResultSet,
  sample: number,
  tolerance: number,
): CompareResult {
  const expectedKeys = new Set(expected.rows.map((r) => canonRow(r, tolerance)));
  const actualKeys = new Set(actual.rows.map((r) => canonRow(r, tolerance)));
  return {
    ...base,
    passed: false,
    code: 'row-count',
    missingRows: expected.rows.filter((r) => !actualKeys.has(canonRow(r, tolerance))).slice(0, sample),
    extraRows: actual.rows.filter((r) => !expectedKeys.has(canonRow(r, tolerance))).slice(0, sample),
    summary:
      `Your query returned ${actual.rows.length} ` +
      `${plural(actual.rows.length, 'row')}; the answer has ${expected.rows.length}.`,
  };
}

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);

/**
 * Shape-only preview of the expected result, shown before the learner solves an
 * exercise. Reveals the column count and value types without giving away answers.
 */
export function expectedShape(expected: ResultSet): {
  columnCount: number;
  rowCount: number;
  types: string[];
} {
  const types = expected.columns.map((_, i) => {
    const v = expected.rows.find((r) => r[i] !== null && r[i] !== undefined)?.[i];
    if (v === undefined) return 'null';
    if (typeof v === 'number' || typeof v === 'bigint') return 'number';
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return 'date';
    if (!Number.isNaN(Number(s)) && s.trim() !== '') return 'number';
    return 'text';
  });
  return { columnCount: expected.columns.length, rowCount: expected.rows.length, types };
}
