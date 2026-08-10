/**
 * The local query engine. Server-only by convention: nothing under `components/`
 * imports this module — the client reaches the warehouse through `app/api/*`.
 *
 * One in-memory SQLite database per Node process, cached on `globalThis` so it
 * survives Next's dev-server hot reloads. Learner SQL is guarded, transpiled from
 * BigQuery dialect, then executed with a row cap and a wall-clock budget.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createTableSql, INDEXES, TABLES, VIEWS } from './ddl';
import { generateWarehouse, type Dataset } from './generate';
import { registerBigQueryFunctions } from '../bigquery/udf';
import { transpile, TranspileError } from '../bigquery/transpile';

export const MAX_ROWS = 5000;
export const TIME_BUDGET_MS = 5000;

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
  ms: number;
  /** SQL actually executed, after dialect rewriting — shown in the "explain" panel. */
  compiledSql: string;
  notes: string[];
}

export class QueryError extends Error {
  readonly kind: 'guard' | 'transpile' | 'sqlite' | 'timeout';
  readonly hint?: string;

  constructor(message: string, kind: QueryError['kind'], hint?: string) {
    super(message);
    this.name = 'QueryError';
    this.kind = kind;
    this.hint = hint;
  }
}

// ───────────────────────────────────────────────────────────── guards ──

const DENY = [
  'ATTACH', 'DETACH', 'PRAGMA', 'VACUUM', 'INSERT', 'UPDATE', 'DELETE', 'DROP',
  'CREATE', 'ALTER', 'REPLACE', 'TRUNCATE', 'GRANT', 'REVOKE', 'BEGIN', 'COMMIT',
  'ROLLBACK', 'REINDEX', 'ANALYZE', 'LOAD_EXTENSION', 'READFILE', 'WRITEFILE',
  'MERGE', 'CALL', 'EXPORT', 'COPY',
];

/** Remove comments and string literals so the denylist can't be hidden inside them. */
function stripLiterals(sql: string): string {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    if (c === '-' && sql[i + 1] === '-') {
      const j = sql.indexOf('\n', i);
      i = j === -1 ? sql.length : j;
    } else if (c === '#') {
      const j = sql.indexOf('\n', i);
      i = j === -1 ? sql.length : j;
    } else if (c === '/' && sql[i + 1] === '*') {
      const j = sql.indexOf('*/', i + 2);
      i = j === -1 ? sql.length : j + 2;
    } else if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === '\\') { j += 2; continue; }
        if (sql[j] === c) { if (sql[j + 1] === c) { j += 2; continue; } break; }
        j++;
      }
      out += ' ';
      i = j + 1;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

export function guard(sql: string): void {
  const bare = stripLiterals(sql).trim();
  if (!bare) throw new QueryError('The query is empty.', 'guard');

  const statements = bare.split(';').map((s) => s.trim()).filter(Boolean);
  if (statements.length > 1) {
    throw new QueryError(
      'Only one statement can run at a time.',
      'guard',
      'Remove the extra semicolon-separated statements and run them one by one.',
    );
  }

  const upper = statements[0].toUpperCase();
  if (!/^(SELECT|WITH)\b/.test(upper)) {
    throw new QueryError(
      'This engine is read-only — a query has to start with SELECT or WITH.',
      'guard',
      'The warehouse is shared by every exercise, so nothing can modify it.',
    );
  }
  for (const kw of DENY) {
    if (new RegExp(`\\b${kw}\\b`).test(upper)) {
      throw new QueryError(
        `\`${kw}\` is not allowed — the warehouse is read-only.`,
        'guard',
        'Everything the curriculum asks for can be done with SELECT.',
      );
    }
  }
}

// ────────────────────────────────────────────────────────── database ──

interface Cached {
  db: DatabaseSync;
  builtAt: number;
  buildMs: number;
  fromCache: boolean;
  rowCounts: Record<string, number>;
}

const GLOBAL_KEY = '__growthsql_warehouse__';
type GlobalWithCache = typeof globalThis & { [GLOBAL_KEY]?: Cached };

/**
 * Bump when the DDL or the generator changes, so a stale on-disk warehouse is
 * discarded rather than silently serving data the exercises no longer match.
 */
export const WAREHOUSE_VERSION = '1.3.0';

export const WAREHOUSE_PATH = path.join(process.cwd(), '.data', 'warehouse.db');

/**
 * Rows go in batched multi-row INSERTs. Each `stmt.run()` crosses the JS↔SQLite
 * boundary, and with ~240k rows that crossing — not SQLite itself — is the bottleneck.
 * SQLite caps a statement at 32 766 bound variables, so the batch size adapts to the
 * table's column count.
 */
function insertAll(db: DatabaseSync, d: Dataset): void {
  const cols = d.columns.map((c) => `"${c}"`).join(', ');
  const tuple = `(${d.columns.map(() => '?').join(', ')})`;
  const perBatch = Math.max(1, Math.min(500, Math.floor(30_000 / d.columns.length)));

  const stmtFor = new Map<number, ReturnType<DatabaseSync['prepare']>>();
  const get = (n: number) => {
    let s = stmtFor.get(n);
    if (!s) {
      s = db.prepare(`INSERT INTO "${d.table}" (${cols}) VALUES ${Array(n).fill(tuple).join(', ')}`);
      stmtFor.set(n, s);
    }
    return s;
  };

  for (let i = 0; i < d.rows.length; i += perBatch) {
    const chunk = d.rows.slice(i, i + perBatch);
    const flat: unknown[] = [];
    for (const row of chunk) for (const v of row) flat.push(v);
    get(chunk.length).run(...(flat as never[]));
  }
}

export function populate(db: DatabaseSync): Record<string, number> {
  for (const t of TABLES) db.exec(createTableSql(t));

  const rowCounts: Record<string, number> = {};
  db.exec('BEGIN');
  for (const d of generateWarehouse()) {
    insertAll(db, d);
    rowCounts[d.table] = d.rows.length;
  }
  db.exec('COMMIT');

  for (const idx of INDEXES) db.exec(idx);
  for (const v of VIEWS) if (v.viewSql) db.exec(v.viewSql);
  db.exec('ANALYZE');
  return rowCounts;
}

export function countViews(db: DatabaseSync, rowCounts: Record<string, number>): Record<string, number> {
  for (const v of VIEWS) {
    try {
      const r = db.prepare(`SELECT COUNT(*) AS n FROM "${v.name}"`).get() as { n: number };
      rowCounts[v.name] = Number(r.n);
    } catch {
      rowCounts[v.name] = 0;
    }
  }
  return rowCounts;
}

/** Reads the cached warehouse if it exists and matches WAREHOUSE_VERSION. */
function openCached(): { db: DatabaseSync; rowCounts: Record<string, number> } | null {
  if (!fs.existsSync(WAREHOUSE_PATH)) return null;
  try {
    const db = new DatabaseSync(WAREHOUSE_PATH, { readOnly: true });
    const version = db.prepare("SELECT value FROM _growthsql_meta WHERE key = 'version'").get() as
      | { value: string } | undefined;
    if (!version || version.value !== WAREHOUSE_VERSION) {
      db.close();
      return null;
    }
    const counts = db.prepare("SELECT value FROM _growthsql_meta WHERE key = 'row_counts'").get() as
      | { value: string } | undefined;
    registerBigQueryFunctions(db);
    return { db, rowCounts: JSON.parse(counts?.value ?? '{}') as Record<string, number> };
  } catch {
    return null;
  }
}

function build(): Cached {
  const t0 = performance.now();

  const cached = openCached();
  if (cached) {
    return {
      db: cached.db,
      builtAt: Date.now(),
      buildMs: performance.now() - t0,
      fromCache: true,
      rowCounts: cached.rowCounts,
    };
  }

  // No usable cache: build in memory so the app works regardless, then try to persist
  // it for next time. A read-only filesystem simply means we rebuild each process.
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA journal_mode = MEMORY');
  db.exec('PRAGMA synchronous = OFF');
  registerBigQueryFunctions(db);
  const rowCounts = countViews(db, populate(db));

  return { db, builtAt: Date.now(), buildMs: performance.now() - t0, fromCache: false, rowCounts };
}

export function warehouse(): Cached {
  const g = globalThis as GlobalWithCache;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = build();
  return g[GLOBAL_KEY]!;
}

export function rowCounts(): Record<string, number> {
  return warehouse().rowCounts;
}

export function warehouseStats(): {
  buildMs: number; totalRows: number; tables: number; fromCache: boolean;
} {
  const w = warehouse();
  return {
    buildMs: Math.round(w.buildMs),
    totalRows: Object.values(w.rowCounts).reduce((a, b) => a + b, 0),
    tables: TABLES.length + VIEWS.length,
    fromCache: w.fromCache,
  };
}

// ─────────────────────────────────────────────────────────── execute ──

/** Turn SQLite's terse errors into something a learner can act on. */
function explainSqliteError(msg: string): { message: string; hint?: string } {
  const m = msg.replace(/^SQLITE_ERROR:\s*/i, '');
  let hint: string | undefined;
  const noColumn = /no such column:\s*(\S+)/i.exec(m);
  const noTable = /no such table:\s*(\S+)/i.exec(m);
  const noFunc = /no such function:\s*(\S+)/i.exec(m);
  if (noColumn) {
    hint = `\`${noColumn[1]}\` isn't a column on any table in your FROM clause. ` +
      'Check the schema panel — and remember an alias defined in SELECT cannot be used in WHERE.';
  } else if (noTable) {
    hint = `There is no table called \`${noTable[1]}\`. Open the schema panel to see what exists.`;
  } else if (noFunc) {
    hint = `\`${noFunc[1]}\` is not available in the local BigQuery emulation. ` +
      'The function reference in the schema panel lists everything that is.';
  } else if (/ambiguous column name/i.test(m)) {
    hint = 'Two joined tables both have this column — prefix it with a table alias.';
  } else if (/misuse of aggregate|misuse of window function/i.test(m)) {
    hint = 'Aggregates and window functions cannot go in WHERE. Use HAVING for aggregates, ' +
      'or wrap the window function in a subquery/CTE and filter outside it.';
  } else if (/GROUP BY term/i.test(m) || /not in the GROUP BY/i.test(m)) {
    hint = 'Every column in SELECT must either be aggregated or listed in GROUP BY.';
  } else if (/syntax error/i.test(m)) {
    hint = 'Look just before the token named in the error — a missing comma, ' +
      'an unclosed bracket, or a stray keyword is the usual cause.';
  }
  return { message: m, hint };
}

export interface RunOptions {
  maxRows?: number;
  timeBudgetMs?: number;
  /** Skip the read-only guard. Only ever true for content-validation runs. */
  trusted?: boolean;
}

export function runQuery(userSql: string, opts: RunOptions = {}): QueryResult {
  const maxRows = opts.maxRows ?? MAX_ROWS;
  const budget = opts.timeBudgetMs ?? TIME_BUDGET_MS;
  if (!opts.trusted) guard(userSql);

  let compiled: { sql: string; notes: string[] };
  try {
    compiled = transpile(userSql);
  } catch (e) {
    if (e instanceof TranspileError) throw new QueryError(e.message, 'transpile');
    throw new QueryError(String((e as Error).message ?? e), 'transpile');
  }

  const { db } = warehouse();
  const t0 = performance.now();
  let stmt;
  try {
    stmt = db.prepare(compiled.sql);
  } catch (e) {
    const { message, hint } = explainSqliteError(String((e as Error).message ?? e));
    throw new QueryError(message, 'sqlite', hint);
  }

  stmt.setReturnArrays(true);
  let columns: string[];
  try {
    columns = stmt.columns().map((c, i) => c.name ?? `col_${i}`);
  } catch {
    columns = [];
  }

  const rows: unknown[][] = [];
  let truncated = false;
  try {
    let n = 0;
    for (const row of stmt.iterate() as Iterable<unknown[]>) {
      if (n >= maxRows) { truncated = true; break; }
      rows.push(normalizeRow(row));
      n++;
      // SQLite runs synchronously, so a runaway query can only be stopped between rows.
      if ((n & 0xff) === 0 && performance.now() - t0 > budget) {
        throw new QueryError(
          `Query exceeded the ${budget / 1000}s time budget.`,
          'timeout',
          'A missing join condition producing a cross join is the usual cause. ' +
          'Check that every JOIN has an ON clause.',
        );
      }
    }
  } catch (e) {
    if (e instanceof QueryError) throw e;
    const { message, hint } = explainSqliteError(String((e as Error).message ?? e));
    throw new QueryError(message, 'sqlite', hint);
  }

  return {
    columns,
    rows,
    rowCount: rows.length,
    truncated,
    ms: Math.round((performance.now() - t0) * 100) / 100,
    compiledSql: compiled.sql,
    notes: compiled.notes,
  };
}

/** BigInt and Uint8Array do not survive JSON, and learners never need either. */
function normalizeRow(row: unknown[]): unknown[] {
  return row.map((v) => {
    if (typeof v === 'bigint') return Number(v);
    if (v instanceof Uint8Array) return `<${v.length} bytes>`;
    return v;
  });
}

/** Cheap sample of a column's values, for the schema panel's column peek. */
export function columnPeek(table: string, column: string): { values: unknown[]; nullRate: number; distinct: number } {
  const { db } = warehouse();
  const safeTable = table.replace(/[^A-Za-z0-9_]/g, '');
  const safeCol = column.replace(/[^A-Za-z0-9_]/g, '');
  try {
    const values = (db.prepare(
      `SELECT "${safeCol}" AS v FROM "${safeTable}" WHERE "${safeCol}" IS NOT NULL LIMIT 6`,
    ).all() as Array<{ v: unknown }>).map((r) => r.v);
    const agg = db.prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN "${safeCol}" IS NULL THEN 1 ELSE 0 END) AS nulls,
              COUNT(DISTINCT "${safeCol}") AS distinct_count
       FROM "${safeTable}"`,
    ).get() as { total: number; nulls: number; distinct_count: number };
    const total = Number(agg.total) || 1;
    return {
      values,
      nullRate: Number(agg.nulls) / total,
      distinct: Number(agg.distinct_count),
    };
  } catch {
    return { values: [], nullRate: 0, distinct: 0 };
  }
}
