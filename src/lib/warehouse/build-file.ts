/**
 * Writes the warehouse to disk as a standalone build step. Deliberately kept out of
 * engine.ts: this is the only place that needs a process-pid-scoped temp path, and
 * that dynamic path made bundlers trace (and include) the whole project for any
 * App Route that merely imports engine.ts for querying. Only scripts/build-warehouse.ts
 * imports this module.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { populate, countViews, WAREHOUSE_PATH, WAREHOUSE_VERSION } from './engine';

function writeMeta(db: DatabaseSync, rowCounts: Record<string, number>): void {
  db.exec('CREATE TABLE _growthsql_meta (key TEXT, value TEXT)');
  const meta = db.prepare('INSERT INTO _growthsql_meta (key, value) VALUES (?, ?)');
  meta.run('version', WAREHOUSE_VERSION);
  meta.run('row_counts', JSON.stringify(rowCounts));
  meta.run('built_at', new Date().toISOString());
}

/** Writes the warehouse to disk so later processes start instantly. Best-effort. */
export function buildWarehouseFile(): { path: string; ms: number; rowCounts: Record<string, number> } {
  const t0 = performance.now();
  fs.mkdirSync(path.dirname(WAREHOUSE_PATH), { recursive: true });
  const tmp = `${WAREHOUSE_PATH}.tmp-${process.pid}`;
  for (const f of [tmp, `${tmp}-journal`]) if (fs.existsSync(f)) fs.rmSync(f);

  const db = new DatabaseSync(tmp);
  db.exec('PRAGMA journal_mode = OFF');
  db.exec('PRAGMA synchronous = OFF');
  // Views must be counted before the meta row is written, or the cached totals
  // silently exclude them.
  const rowCounts = countViews(db, populate(db));
  writeMeta(db, rowCounts);
  db.close();
  // Rename last so a crashed build never leaves a half-written cache behind.
  fs.renameSync(tmp, WAREHOUSE_PATH);
  return { path: WAREHOUSE_PATH, ms: performance.now() - t0, rowCounts };
}
