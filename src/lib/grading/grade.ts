import { runQuery, QueryError } from '../warehouse/engine';
import { compareResults, type CompareResult } from './compare';
import { exerciseById } from '../content/exercises';

/**
 * Grade a submission by result-set equivalence: run the learner's SQL and the
 * reference solution against the same warehouse, then compare. The reference is
 * executed at grade time rather than stored, so a solution can never drift from the
 * data — if the warehouse changes, both sides move together.
 */

export interface GradeRequest {
  sql: string;
  /** The reference solution to compare against. */
  solution: string;
  orderMatters?: boolean;
}

export interface GradeResponse {
  passed: boolean;
  /** Present when the SQL ran; absent when it failed to execute. */
  compare?: CompareResult;
  /** The learner's result, for display. Capped rows. */
  result?: { columns: string[]; rows: unknown[][]; rowCount: number; truncated: boolean };
  ms: number;
  /** Set when the learner's SQL itself errored (syntax, unknown column, timeout…). */
  error?: { kind: string; message: string; hint?: string };
}

const SAMPLE_ROWS = 200;

export function grade(req: GradeRequest): GradeResponse {
  let actual;
  try {
    actual = runQuery(req.sql, {});
  } catch (e) {
    const err = e as QueryError;
    return {
      passed: false,
      ms: 0,
      error: { kind: err.kind ?? 'error', message: err.message, hint: err.hint },
    };
  }

  // The reference is trusted (skips the read-only guard's stricter parsing paths only
  // where safe) but is still a read query. If it fails, that is a content bug, not the
  // learner's fault — surface it plainly.
  let expected;
  try {
    expected = runQuery(req.solution, { trusted: true });
  } catch (e) {
    const err = e as QueryError;
    return {
      passed: false,
      ms: actual.ms,
      result: capResult(actual),
      error: { kind: 'reference', message: `The reference solution failed to run: ${err.message}` },
    };
  }

  const cmp = compareResults(
    { columns: actual.columns, rows: actual.rows },
    { columns: expected.columns, rows: expected.rows },
    { orderMatters: req.orderMatters, sampleSize: 5 },
  );

  return {
    passed: cmp.passed,
    compare: cmp,
    result: capResult(actual),
    ms: actual.ms,
  };
}

function capResult(r: { columns: string[]; rows: unknown[][]; rowCount: number; truncated: boolean }) {
  return {
    columns: r.columns,
    rows: r.rows.slice(0, SAMPLE_ROWS),
    rowCount: r.rowCount,
    truncated: r.truncated || r.rows.length > SAMPLE_ROWS,
  };
}

/**
 * Resolve the reference solution and ordering flag for an exercise id, then grade.
 * Other item types (project/interview/lab/capstone tasks) pass their own solution to
 * {@link grade} directly, since their content lives in different collections.
 */
export function gradeExercise(exerciseId: string, sql: string): GradeResponse & { found: boolean } {
  const ex = exerciseById(exerciseId);
  if (!ex) return { passed: false, ms: 0, found: false, error: { kind: 'not-found', message: `Unknown exercise ${exerciseId}` } };
  return { ...grade({ sql, solution: ex.solution, orderMatters: ex.orderMatters }), found: true };
}
