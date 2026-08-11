import { findTable, type TableDef } from '../warehouse/ddl';

/**
 * A teaching dry-run. BigQuery's real dry run reports exact bytes; ours is an honest
 * approximation built from the DDL's per-column byte widths and the warehouse's real
 * row counts. It exists to make the day-11 lesson tangible: name fewer columns, or
 * prune a partition, and watch the number fall.
 *
 * It is deliberately not a SQL parser. It reads the query as text well enough to spot
 * which tables are referenced, whether `SELECT *` is in play, which columns are named,
 * and whether a partition filter will prune, the four things that move the bill.
 */

const BYTES_PER_TB = 1_099_511_627_776;
const DOLLARS_PER_TB = 6.25;

export interface TableCost {
  table: string;
  rows: number;
  columnsScanned?: number;
  bytesPerRow: number;
  bytes: number;
  pruned: boolean;
  pruneFactor: number;
  fullTable: boolean; // SELECT * or otherwise every column
}

export interface CostEstimate {
  bytes: number;
  humanBytes: string;
  dollars: number;
  tables: TableCost[];
  notes: string[];
}

function columnBytes(t: TableDef, name: string): number {
  const col = t.columns.find((c) => c.name === name);
  return col?.bytes ?? 8;
}

function totalRowBytes(t: TableDef): number {
  return t.columns.reduce((a, c) => a + (c.bytes ?? 8), 0);
}

/** Tables named after FROM or JOIN, de-duplicated, resolved against the DDL. */
function referencedTables(sql: string): TableDef[] {
  const found = new Set<string>();
  const re = /\b(?:from|join)\s+`?([a-z_][a-z0-9_.]*)`?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const bare = m[1].split('.').pop()!;
    if (findTable(bare)) found.add(bare);
  }
  return [...found].map((n) => findTable(n)!).filter(Boolean);
}

/** Does the query select every column of some table (a bare or qualified `*`)? */
function hasStar(sql: string): boolean {
  // SELECT *  or  SELECT alias.*, but not COUNT(*).
  return /select\s+(?:[a-z_][a-z0-9_]*\.)?\*/i.test(sql.replace(/count\s*\(\s*\*\s*\)/gi, ''));
}

/** Column names of a table that appear anywhere in the query text. */
function namedColumns(t: TableDef, sql: string): string[] {
  const lower = sql.toLowerCase();
  return t.columns.filter((c) => new RegExp(`\\b${c.name}\\b`).test(lower)).map((c) => c.name);
}

/**
 * Estimate whether a filter prunes the partition column, and by how much. A naked
 * equality prunes to a single partition; a BETWEEN/inequality prunes to the fraction
 * of the ~366-day window it covers; a function wrapping the column defeats pruning.
 */
function partitionPrune(t: TableDef, sql: string): { pruned: boolean; factor: number; note?: string } {
  if (!t.partitionBy) return { pruned: false, factor: 1 };
  const col = t.partitionBy;
  const lower = sql.toLowerCase();

  // Column wrapped in a function next to a comparison → no pruning.
  const wrapped = new RegExp(`\\b(?:cast|date|date_trunc|substr|format_date|extract)\\s*\\([^)]*\\b${col}\\b`, 'i');
  if (wrapped.test(sql)) {
    return { pruned: false, factor: 1, note: `A function around \`${col}\` blocks partition pruning.` };
  }

  const between = new RegExp(`\\b${col}\\b\\s+between\\s+'([0-9-]+)'\\s+and\\s+'([0-9-]+)'`, 'i');
  const bm = between.exec(sql);
  if (bm) {
    const days = Math.max(1, dayspan(bm[1], bm[2]) + 1);
    return { pruned: true, factor: Math.min(1, days / 366), note: `Pruned to ~${days} partition(s).` };
  }

  const eq = new RegExp(`\\b${col}\\b\\s*=\\s*'[^']+'`, 'i');
  if (eq.test(lower)) return { pruned: true, factor: 1 / 366, note: 'Pruned to a single partition.' };

  const ineq = new RegExp(`\\b${col}\\b\\s*[<>]=?\\s*'[^']+'`, 'i');
  if (ineq.test(lower)) return { pruned: true, factor: 0.5, note: 'Partially pruned by a date bound.' };

  return { pruned: false, factor: 1, note: `No filter on \`${col}\`. The whole table is scanned.` };
}

function dayspan(a: string, b: string): number {
  const norm = (s: string) => (s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}` : s);
  const ta = Date.parse(`${norm(a)}T00:00:00Z`);
  const tb = Date.parse(`${norm(b)}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 30;
  return Math.round((tb - ta) / 86_400_000);
}

export function humanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}

/**
 * Estimate the cost of a query. `rowCounts` comes from the warehouse meta so the
 * numbers reflect the real data volume the learner is querying.
 */
export function estimateCost(sql: string, rowCounts: Record<string, number>): CostEstimate {
  const tables = referencedTables(sql);
  const star = hasStar(sql);
  const notes: string[] = [];
  const perTable: TableCost[] = [];
  let totalBytes = 0;

  if (tables.length === 0) {
    return { bytes: 0, humanBytes: '0 B', dollars: 0, tables: [], notes: ['No known warehouse table referenced.'] };
  }

  for (const t of tables) {
    const rows = rowCounts[t.name] ?? 0;
    const cols = star ? t.columns.map((c) => c.name) : namedColumns(t, sql);
    const fullTable = star || cols.length === 0;
    const bytesPerRow = fullTable
      ? totalRowBytes(t)
      : cols.reduce((a, name) => a + columnBytes(t, name), 0);

    const prune = partitionPrune(t, sql);
    if (prune.note) notes.push(`${t.name}: ${prune.note}`);

    const bytes = Math.round(rows * bytesPerRow * prune.factor);
    totalBytes += bytes;
    perTable.push({
      table: t.name,
      rows,
      columnsScanned: fullTable ? undefined : cols.length,
      bytesPerRow,
      bytes,
      pruned: prune.pruned,
      pruneFactor: prune.factor,
      fullTable,
    });
  }

  if (star) notes.unshift('`SELECT *` scans every column. Name only the columns you use.');
  // BigQuery bills a 10 MB minimum per table referenced.
  totalBytes = Math.max(totalBytes, tables.length * 10 * 1024 * 1024);

  return {
    bytes: totalBytes,
    humanBytes: humanBytes(totalBytes),
    dollars: Math.round((totalBytes / BYTES_PER_TB) * DOLLARS_PER_TB * 1_000_000) / 1_000_000,
    tables: perTable,
    notes,
  };
}
