/**
 * Fast inner-loop validator for the exercise bank alone.
 *
 * `npm run validate:content` is the real gate — it covers projects, interviews, labs
 * and the capstone too. This one exists because authoring 300 exercises needs a check
 * that runs in a second and reports every failure at once.
 *
 *   npx tsx scripts/validate-exercises.ts        all modules
 *   npx tsx scripts/validate-exercises.ts 3 4    modules 3 and 4 only
 */

import { runQuery, QueryError } from '../src/lib/warehouse/engine';
import { EXERCISES } from '../src/lib/content/exercises';

const only = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
const pool = only.length ? EXERCISES.filter((e) => only.includes(e.module)) : EXERCISES;

let ok = 0;
const fails: string[] = [];
const slow: Array<{ id: string; ms: number }> = [];

for (const e of pool) {
  if (e.hints.length < 2) fails.push(`${e.id}: fewer than 2 hints`);
  if (!e.concepts.length) fails.push(`${e.id}: no concepts`);
  try {
    const r = runQuery(e.solution, { trusted: true });
    if (r.rowCount === 0 && !e.allowEmpty) {
      fails.push(`${e.id} (${e.title}): 0 rows`);
      continue;
    }
    if (e.orderMatters && !/\bORDER\s+BY\b/i.test(e.solution)) {
      fails.push(`${e.id} (${e.title}): orderMatters without ORDER BY`);
      continue;
    }
    if (r.truncated) {
      fails.push(`${e.id} (${e.title}): hit the row cap`);
      continue;
    }
    if (r.ms > 300) slow.push({ id: e.id, ms: r.ms });
    ok++;
  } catch (err) {
    const q = err as QueryError;
    fails.push(`${e.id} (${e.title}): ${q.message}`);
  }
}

const byModule = new Map<number, number>();
for (const e of pool) byModule.set(e.module, (byModule.get(e.module) ?? 0) + 1);
console.log(
  [...byModule.entries()].sort((a, b) => a[0] - b[0])
    .map(([m, n]) => `M${String(m).padStart(2, '0')}:${n}`).join('  '),
);
console.log();
for (const f of fails) console.log(`  ✗ ${f}`);
if (slow.length) {
  console.log(`\n  slow (>300ms): ${slow.map((s) => `${s.id}=${Math.round(s.ms)}ms`).join(', ')}`);
}
console.log(`\n${ok}/${pool.length} exercise solutions valid`);
if (fails.length) process.exit(1);
