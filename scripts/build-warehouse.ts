/**
 * Generates the marketing warehouse to `.data/warehouse.db`.
 *
 * Run by `npm run setup` (and by predev/prebuild). Without it the app still works,
 * the engine falls back to building in memory on first query, but every Node process
 * would pay the generation cost instead of opening a ready file.
 */

import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { WAREHOUSE_PATH, WAREHOUSE_VERSION } from '../src/lib/warehouse/engine';
import { buildWarehouseFile } from '../src/lib/warehouse/build-file';

/** True when a warehouse file already exists at the current version. */
function isCurrent(): boolean {
  if (!fs.existsSync(WAREHOUSE_PATH)) return false;
  try {
    const db = new DatabaseSync(WAREHOUSE_PATH, { readOnly: true });
    const row = db.prepare("SELECT value FROM _growthsql_meta WHERE key = 'version'").get() as
      | { value: string } | undefined;
    db.close();
    return row?.value === WAREHOUSE_VERSION;
  } catch {
    return false;
  }
}

const force = process.argv.includes('--force');
if (!force && isCurrent()) {
  console.log(`warehouse v${WAREHOUSE_VERSION} already built, skipping (use --force to rebuild)`);
} else {
  const { path, ms, rowCounts } = buildWarehouseFile();
  const total = Object.values(rowCounts).reduce((a, b) => a + b, 0);
  console.log(
    `warehouse v${WAREHOUSE_VERSION} → ${path}\n` +
    `${Object.keys(rowCounts).length} tables · ${total.toLocaleString()} rows · ${Math.round(ms)} ms`,
  );
}
