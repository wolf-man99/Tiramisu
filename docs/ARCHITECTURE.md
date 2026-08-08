# Architecture

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router, RSC) | Server components render curriculum without shipping it to the client |
| Language | TypeScript (strict) | Content is typed data — the compiler validates 300 exercises |
| Styling | Tailwind CSS v4 (CSS-first tokens) | No JS config; theme lives in `globals.css` as `@theme` |
| Components | shadcn-style primitives over Radix | Owned in-repo, no black boxes |
| Editor | Monaco + custom BigQuery language definition | Real IDE affordances: completion, hover docs, signature help |
| Charts | Recharts (primary) + Chart.js (labs cost visualiser) | Recharts composes with RSC; Chart.js used where canvas perf matters |
| Motion | Framer Motion | All animation gated behind `prefers-reduced-motion` |
| Progress DB | Prisma + SQLite (`prisma/dev.db`) | Learner state, durable across restarts |
| Warehouse | `node:sqlite` (built into Node 22) | Zero native deps; SQLite 3.51 has window funcs, CTEs, JSON table-valued funcs |

Two databases, deliberately separate:

```
prisma/dev.db        →  who the learner is and what they've done  (Prisma, on disk)
.data/warehouse.db   →  the marketing data they query             (node:sqlite, read-only)
```

The warehouse is never written to by learners, so it can be regenerated freely and
never needs migrations.

**Warehouse startup.** Generating 241 k rows takes ~2 s, which is too long to pay on
every cold Node process. `npm run setup` (also wired to `predev`/`prebuild`) generates
`.data/warehouse.db` once; the engine then opens it **read-only in 2 ms**. The file
carries a `_growthsql_meta` row stamping `WAREHOUSE_VERSION`, and a mismatch discards
the cache. If the file is missing or stale and the filesystem is not writable, the
engine falls back to building in memory so the app still works.

## 2. Directory map

```
docs/                      PRD, architecture, data model, curriculum, wireframes, roadmap
prisma/
  schema.prisma            learner-state models
  seed.ts                  profile + 24 leaderboard rivals + badge catalogue
src/
  app/
    (app)/                 authenticated-shell route group
      page.tsx             dashboard
      learn/[day]/         14 day pages
      playground/          full IDE
      practice/            9 practice modes
      projects/[slug]/     10 projects
      interviews/[slug]/   10 company sets
      labs/[slug]/         9 BigQuery labs
      cheatsheets/[slug]/  6 interactive cheatsheets
      glossary/            3 glossaries, searchable
      flashcards/          SM-2 review
      capstone/            100-question case study
      leaderboard/
      analytics/
    api/
      sql/run              execute arbitrary learner SQL (guarded)
      sql/grade            execute + compare against reference
      sql/dry-run          bytes-scanned + cost estimate
      schema                warehouse introspection for the schema panel
      coach                 hint / diagnosis engine
      progress/*           XP, streak, attempts, notes, bookmarks, flashcards
  components/
    ui/                    18 primitives (button, card, tabs, dialog, …)
    editor/                Monaco wrapper, BigQuery language, results grid
    learn/                 lesson renderer, quiz, assessment, reflection
    viz/                   join visualiser, window-frame animator, funnel, charts
    dashboard/             stat tiles, roadmap, streak calendar, recommendations
  lib/
    warehouse/
      ddl.ts               28 tables + 2 views
      generate.ts          deterministic seeded data generator
      engine.ts            connection cache, guards, execution, timing
      catalog.ts           table/column metadata + stats for cost model
    bigquery/
      udf.ts               ~50 BigQuery functions registered as SQLite UDFs
      transpile.ts         BigQuery SQL → SQLite SQL rewriter
      cost.ts              dry-run bytes/cost estimator
    grading/
      compare.ts           result-set equality with tolerance + ordering rules
      analyze.ts           static analysis → diagnoses
    content/
      curriculum/          14 day modules
      exercises/           300 exercises, module-split
      projects.ts  interviews.ts  labs.ts  capstone.ts
      cheatsheets.ts  glossary.ts  flashcards.ts
    progress/              XP maths, levels, streaks, badge rules, SM-2
```

## 3. Query execution pipeline

```
learner SQL
   │
   ├─ 1. guard()        reject DDL/DML/PRAGMA/ATTACH; single statement only
   ├─ 2. transpile()    BigQuery dialect → SQLite dialect
   ├─ 3. prepare()      node:sqlite, on the cached in-memory warehouse
   ├─ 4. execute()      wall-clock timed, row-capped at 5 000
   └─ 5. shape()        columns() metadata + rows → { columns, rows, ms, truncated }
```

**Guards.** A statement is rejected unless it begins with `SELECT` or `WITH` after
comment stripping, contains exactly one statement (no `;`-separated payloads), and
matches no denylisted keyword (`ATTACH`, `PRAGMA`, `VACUUM`, `INSERT`, `UPDATE`,
`DELETE`, `DROP`, `CREATE`, `ALTER`, `REPLACE`, `load_extension`). The connection is
additionally opened `readOnly` for learner queries. Guarding happens *before*
transpilation so the denylist can't be smuggled past by dialect rewriting.

**Timing.** SQLite is synchronous, so a runaway query cannot be interrupted
mid-statement from JS. The row cap is therefore enforced by *iterating* the statement
(`stmt.iterate()`) rather than `all()`, checking elapsed time every 256 rows and
aborting the iteration. This bounds pathological cross joins in practice.

## 4. Grading

`compare(actual, expected, opts)` returns a verdict plus a structured diff.

- Column names are ignored (a learner's alias should not fail them); column **count**
  must match.
- Values are canonicalised: numbers rounded to 1e-6 relative tolerance, dates
  normalised to ISO, `null`/`undefined` unified, booleans to 0/1.
- Unordered comparison hashes each row into a multiset and diffs the multisets, so
  duplicate rows are handled correctly.
- Ordered comparison (when `orderMatters`) compares positionally and reports the first
  divergent index.
- The diff reports up to 5 missing and 5 extra rows, which is what the UI renders.

Because the expected side is produced by *running* the reference solution at grade
time, exercises cannot drift out of sync with the data — and any alternative correct
formulation passes.

## 5. BigQuery emulation — what is and isn't faithful

**Faithful (implemented):**
- `SAFE_DIVIDE`, `SAFE_CAST`, `IFNULL`, `NULLIF`, `COALESCE`, `SAFE_MULTIPLY` family
- `DATE_DIFF`, `DATE_ADD`, `DATE_SUB`, `DATE_TRUNC`, `PARSE_DATE`, `FORMAT_DATE`,
  `EXTRACT(part FROM date)`, `CURRENT_DATE`, `TIMESTAMP_MICROS`
- String: `CONCAT`, `SPLIT` + `OFFSET`, `REGEXP_EXTRACT`, `REGEXP_CONTAINS`,
  `REGEXP_REPLACE`, `STARTS_WITH`, `ENDS_WITH`, `LPAD`, `RPAD`, `TRIM`, `LOWER/UPPER`
- Math: `ROUND`, `TRUNC`, `CEIL`, `FLOOR`, `POW`, `SQRT`, `ABS`, `MOD`, `GREATEST`,
  `LEAST`, `DIV`
- Aggregate: `COUNTIF`, `ANY_VALUE`, `STRING_AGG`, `ARRAY_AGG` (JSON-backed),
  `APPROX_COUNT_DISTINCT` (exact locally), `PERCENTILE_CONT` via `MEDIAN`-style UDAF
- Window functions: native SQLite (identical semantics for `ROW_NUMBER`, `RANK`,
  `DENSE_RANK`, `LAG`, `LEAD`, `FIRST_VALUE`, `LAST_VALUE`, `NTILE`, `SUM OVER`,
  frames incl. `ROWS BETWEEN … PRECEDING AND …`)
- `QUALIFY` — rewritten into a wrapping subquery with a `WHERE`
- Backtick-quoted identifiers, `project.dataset.table` three-part names
- `UNNEST(array)` in `FROM`/`CROSS JOIN` — rewritten to `json_each(...)`, including
  `WITH OFFSET`
- `STRUCT` field access `x.y` on JSON-backed struct columns → `->> '$.y'`
- `EXCEPT DISTINCT` / `SELECT * EXCEPT(col)`

**Emulated with a documented difference:**
- `ARRAY`/`STRUCT` columns are stored as JSON text. `UNNEST` therefore yields JSON
  values; `.value` and `->>` accessors are generated by the transpiler so learner SQL
  reads like BigQuery.
- Cost/dry-run is modelled from a static column-byte catalogue (`lib/warehouse/catalog.ts`),
  not measured. The *ranking* of expensive vs cheap queries is right; the absolute TB
  figure is a simulation scaled to a 1 TB-scale warehouse.

**Not emulated (and the labs say so):**
- Slot scheduling, BI Engine, materialised-view rewrite, streaming buffer semantics.

The learn pages surface this as an explicit "engine note" callout wherever a lesson
relies on emulated behaviour, so the learner is never taught a falsehood.

## 6. Rendering strategy

- Curriculum pages are **server components**. 300 exercises and 14 days of prose never
  enter the client bundle; only the active exercise is serialised.
- The playground, editor, quizzes and charts are client islands.
- Monaco is `dynamic(..., { ssr: false })` and code-split; it is not in the initial
  bundle of any route except `/playground`.
- Progress mutations are optimistic in a Zustand store, then reconciled against the
  API. A failed write rolls the store back and surfaces a toast.

## 7. Determinism

`lib/warehouse/generate.ts` uses a **mulberry32** PRNG seeded with a constant. Every
random draw — impression counts, conversion coin-flips, name selection — comes from
that single stream, in a fixed order. Consequences:

- Every install produces byte-identical warehouse data.
- Reference solutions and hard-coded expected values in prose stay valid.
- Adding a new table must be done **at the end** of the generation sequence, or all
  downstream data shifts. This is enforced by a checksum test.

## 8. Performance budget

Measured on the reference container (Node 22.22, 241 452 rows):

| Thing | Budget | Actual |
|---|---|---|
| Warehouse generation (`npm run setup`, one-off) | < 5 s | ~2.1 s |
| Warehouse open (per Node process, from cache) | < 100 ms | ~2 ms |
| Typical exercise query | < 50 ms | 0.1–40 ms |
| Heaviest teaching query (full `UNNEST` of `event_params`) | < 3 s | ~1.9 s |
| Grade round-trip (2 queries + compare) | < 150 ms | ~40 ms |

The open connection is cached on `globalThis`, surviving Next dev-server hot reloads.

The one query that flirts with its budget is a full-table `UNNEST(event_params)` —
56 k events × ~7 params = ~390 k synthetic rows. That is genuinely expensive in real
BigQuery too, and day 12 uses the cost as a teaching moment rather than hiding it.
Date UDFs are memoised on their arguments, which is what took that query from 2.3 s to
1.9 s and `FORMAT_DATE`-heavy queries from 1.7 s to 0.4 s: they are called once per
row but over very few distinct inputs.

## 9. Security posture

No auth, no PII, no network egress. The single untrusted input is learner SQL, which is
confined by the guard list, a read-only connection, an in-memory database with nothing
sensitive in it, and no `load_extension`/`ATTACH` reach. The optional Anthropic
integration sends only the exercise prompt and the learner's SQL, and is off unless a
key is present.
