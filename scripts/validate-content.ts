/**
 * Content validator — the Phase 4 gate from docs/ROADMAP.md.
 *
 * Executes every reference solution in the platform against the warehouse. A course
 * whose "correct" answers do not run is worse than no course, so this fails the build.
 *
 * Checks per graded item:
 *   - the solution executes
 *   - it returns rows (unless it declares `allowEmpty`)
 *   - `orderMatters` agrees with the presence of an ORDER BY
 *   - ids are unique, hints exist, concepts are tagged
 *   - every exercise referenced by a day actually exists
 */

import { runQuery, QueryError } from '../src/lib/warehouse/engine';
import { EXERCISES, exerciseById } from '../src/lib/content/exercises';
import { DAYS } from '../src/lib/content/curriculum';
import { PROJECTS } from '../src/lib/content/projects';
import { INTERVIEWS } from '../src/lib/content/interviews';
import { LABS } from '../src/lib/content/labs';
import { CAPSTONE } from '../src/lib/content/capstone';
import { CHEATSHEETS } from '../src/lib/content/cheatsheets';
import { SECTION_ORDER } from '../src/lib/content/types';

interface Graded {
  kind: string;
  id: string;
  sql: string;
  orderMatters?: boolean;
  allowEmpty?: boolean;
  hints?: string[];
  concepts?: string[];
}

const problems: string[] = [];
const warn = (s: string) => problems.push(s);

function collect(): Graded[] {
  const out: Graded[] = [];

  for (const e of EXERCISES) {
    out.push({
      kind: 'exercise', id: e.id, sql: e.solution, orderMatters: e.orderMatters,
      allowEmpty: e.allowEmpty, hints: e.hints, concepts: e.concepts,
    });
  }
  for (const p of PROJECTS) {
    for (const t of p.tasks) {
      out.push({ kind: 'project', id: `${p.slug}/${t.id}`, sql: t.solution, orderMatters: t.orderMatters, hints: t.hints });
    }
  }
  for (const i of INTERVIEWS) {
    for (const q of i.questions) {
      out.push({ kind: 'interview', id: `${i.slug}/${q.id}`, sql: q.solution, orderMatters: q.orderMatters, hints: q.hints });
    }
  }
  for (const l of LABS) {
    for (const [n, s] of l.steps.entries()) {
      if (s.sql) out.push({ kind: 'lab-demo', id: `${l.slug}/step${n + 1}`, sql: s.sql, allowEmpty: true });
      if (s.task) {
        out.push({ kind: 'lab-task', id: `${l.slug}/task${n + 1}`, sql: s.task.solution, orderMatters: s.task.orderMatters, hints: s.task.hints });
      }
    }
  }
  for (const q of CAPSTONE) {
    out.push({ kind: 'capstone', id: q.id, sql: q.solution, orderMatters: q.orderMatters, hints: q.hints });
  }
  for (const d of DAYS) {
    for (const ex of d.examples) out.push({ kind: 'example', id: `day${d.day}/${ex.title}`, sql: ex.sql, allowEmpty: true });
    for (const t of d.project.tasks) {
      out.push({ kind: 'daily-project', id: `day${d.day}/${t.id}`, sql: t.solution, orderMatters: t.orderMatters, hints: t.hints });
    }
    if (d.playground.starter.trim()) {
      out.push({ kind: 'playground', id: `day${d.day}`, sql: d.playground.starter, allowEmpty: true });
    }
  }
  for (const cs of CHEATSHEETS) {
    for (const g of cs.groups) {
      for (const e of g.entries) {
        out.push({ kind: 'cheatsheet', id: `${cs.slug}/${e.id}`, sql: e.example, allowEmpty: true });
      }
    }
  }
  return out;
}

function structuralChecks(): void {
  const seen = new Set<string>();
  for (const e of EXERCISES) {
    if (seen.has(e.id)) warn(`duplicate exercise id ${e.id}`);
    seen.add(e.id);
    if (e.hints.length < 2) warn(`exercise ${e.id}: needs at least 2 hints, has ${e.hints.length}`);
    if (!e.concepts.length) warn(`exercise ${e.id}: no concepts tagged`);
    if (!e.tables.length) warn(`exercise ${e.id}: no tables listed`);
    if (e.prompt.length < 25) warn(`exercise ${e.id}: prompt is too terse`);
  }

  for (const d of DAYS) {
    for (const id of d.practice) {
      if (!exerciseById(id)) warn(`day ${d.day} references missing exercise ${id}`);
    }
    for (const id of d.assessment.exerciseIds) {
      if (!exerciseById(id)) warn(`day ${d.day} assessment references missing exercise ${id}`);
    }
    if (!exerciseById(d.challenge)) warn(`day ${d.day} challenge references missing exercise ${d.challenge}`);
    if (!d.quiz.length) warn(`day ${d.day}: no quiz questions`);
    if (!d.reflection.length) warn(`day ${d.day}: no reflection prompts`);
    for (const q of d.quiz) {
      if (q.kind !== 'order' && (q.answer < 0 || q.answer >= q.options.length)) {
        warn(`day ${d.day} quiz ${q.id}: answer index out of range`);
      }
    }
    for (const q of d.assessment.questions) {
      if (q.kind !== 'order' && (q.answer < 0 || q.answer >= q.options.length)) {
        warn(`day ${d.day} assessment ${q.id}: answer index out of range`);
      }
    }
  }

  const dayNumbers = DAYS.map((d) => d.day);
  for (let i = 1; i <= 14; i++) if (!dayNumbers.includes(i)) warn(`missing day ${i}`);
  if (SECTION_ORDER.length !== 10) warn('SECTION_ORDER should have 10 beats');

  for (const p of PROJECTS) if (!p.tasks.length) warn(`project ${p.slug}: no tasks`);
  for (const i of INTERVIEWS) {
    if (i.questions.length < 4) warn(`interview ${i.slug}: only ${i.questions.length} questions`);
    const order = ['easy', 'medium', 'hard', 'expert'];
    let last = -1;
    for (const q of i.questions) {
      const rank = order.indexOf(q.difficulty);
      if (rank < last) warn(`interview ${i.slug}/${q.id}: difficulty decreases (${q.difficulty})`);
      last = Math.max(last, rank);
    }
  }
}

function main(): void {
  structuralChecks();

  const items = collect();
  let ok = 0;
  const failures: string[] = [];
  let slowest = { id: '', ms: 0 };

  for (const item of items) {
    try {
      const r = runQuery(item.sql, { trusted: true });
      if (r.ms > slowest.ms) slowest = { id: `${item.kind} ${item.id}`, ms: r.ms };
      if (r.rowCount === 0 && !item.allowEmpty) {
        failures.push(`${item.kind} ${item.id}: solution returns 0 rows (set allowEmpty if intended)`);
        continue;
      }
      const hasOrderBy = /\bORDER\s+BY\b/i.test(item.sql);
      if (item.orderMatters && !hasOrderBy) {
        failures.push(`${item.kind} ${item.id}: orderMatters but the solution has no ORDER BY`);
        continue;
      }
      if (r.truncated) {
        failures.push(`${item.kind} ${item.id}: solution hits the 5000-row cap — add a LIMIT or aggregate`);
        continue;
      }
      ok++;
    } catch (e) {
      const err = e as QueryError;
      failures.push(`${item.kind} ${item.id}: ${err.kind ?? 'error'} — ${err.message}`);
    }
  }

  console.log(`Content validation\n`);
  console.log(`  exercises        ${EXERCISES.length}`);
  console.log(`  days             ${DAYS.length}`);
  console.log(`  projects         ${PROJECTS.length} (${PROJECTS.reduce((a, p) => a + p.tasks.length, 0)} tasks)`);
  console.log(`  interview sets   ${INTERVIEWS.length} (${INTERVIEWS.reduce((a, i) => a + i.questions.length, 0)} questions)`);
  console.log(`  labs             ${LABS.length}`);
  console.log(`  capstone         ${CAPSTONE.length}`);
  console.log(`  graded SQL items ${items.length}\n`);

  for (const p of problems) console.log(`  ⚠ ${p}`);
  for (const f of failures) console.log(`  ✗ ${f}`);

  console.log(`\n${ok}/${items.length} SQL items executed cleanly`);
  console.log(`slowest: ${slowest.id} (${slowest.ms} ms)`);

  if (failures.length || problems.length) {
    console.log(`\n${failures.length} failing, ${problems.length} structural problem(s)`);
    process.exit(1);
  }
  console.log('\nAll content valid.');
}

main();
