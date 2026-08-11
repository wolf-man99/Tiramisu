# Implementation roadmap

Each phase is independently shippable and leaves the app in a working state.

## Phase 0, Foundation ✅
Next 16 + TS strict + Tailwind v4. Dark-first token system, 20 UI primitives, app shell,
sidebar, topbar, command palette, keyboard layer, theme toggle.

**Exit:** `npm run dev` renders an empty but navigable shell in both themes.

## Phase 1, The engine ✅
This is the riskiest part, so it goes first.

1. `lib/warehouse/ddl.ts`, 28 tables + 2 views
2. `lib/warehouse/generate.ts`: deterministic seeded generator, ~215 k rows
3. `lib/warehouse/engine.ts`: cached in-memory `node:sqlite`, guards, timing, row cap
4. `lib/bigquery/udf.ts`, ~50 BigQuery functions as UDFs
5. `lib/bigquery/transpile.ts`: dialect rewriter (`UNNEST`, `QUALIFY`, backticks,
   three-part names, `EXCEPT`, struct access)
6. `lib/grading/compare.ts`, result-set equality
7. `/api/sql/run`, `/api/sql/grade`, `/api/sql/dry-run`, `/api/schema`

**Exit:** a curl against `/api/sql/run` with a 5-CTE window-function BigQuery query
returns correct rows. **This gate must pass before any content is authored**, because
every exercise depends on the dialect surface being final.

## Phase 2, Workspace ✅
Monaco + BigQuery language, completion/hover/signature providers, schema tree with
column peek, results grid, diff view, hints, autosave, format, keyboard shortcuts,
resizable persisted panes. `/playground` goes live.

**Exit:** a human can explore the whole warehouse without leaving the app.

## Phase 3, Learner state ✅
Prisma schema, seed (profile + 24 rivals + badge catalogue + flashcards), `/api/progress/*`,
Zustand store, XP/level/streak maths, badge rules, SM-2.

**Exit:** solving an exercise durably increments XP and can award a badge.

## Phase 4, Content ✅
Authored in dependency order so the validator can run continuously:

1. 300 exercises across 12 modules
2. 14 days of curriculum (theory, visuals, examples, quizzes, assessments, challenges,
   reflections, daily projects)
3. 10 projects · 10 interview sets · 9 labs
4. 6 cheatsheets · 3 glossaries · flashcard decks
5. 100-question capstone

**Gate:** `npm run validate:content` executes every reference solution against the
warehouse and fails the build on any query that errors, returns zero rows where rows are
expected, or whose declared `orderMatters` disagrees with its `ORDER BY`.

## Phase 5, Application surfaces ✅
Dashboard, `/learn/[day]`, practice modes, projects, interviews, labs, cheatsheets,
glossary, flashcards, capstone, leaderboard, analytics.

## Phase 6, Coach ✅
Static analyser (30+ diagnostic rules), hint escalation, optimisation suggestions,
explain-the-plan, similar-question generation. Optional Anthropic augmentation behind
`ANTHROPIC_API_KEY` with a post-filter that strips any complete solution.

## Phase 7, Polish ✅
Reduced-motion pass, AA contrast audit, focus management, empty/loading/error states,
`npm run build` clean, README.

---

## Post-v1 backlog

| | Item | Why |
|---|---|---|
| P1 | Real BigQuery passthrough (OAuth + dry-run against the user's own project) | The last mile from simulation to production |
| P1 | Multi-user auth | Schema is already `profileId`-keyed |
| P2 | Community solutions feed with query-quality voting | Reading good SQL teaches faster than writing bad SQL |
| P2 | dbt-flavoured module: models, tests, docs | Natural next rung |
| P2 | Python/pandas bridge module | Marketers hit SQL's ceiling at statistics |
| P3 | Spaced-repetition email digests | Retention |
| P3 | Team mode: shared leaderboard, assigned cohorts | The B2B motion |
| P3 | Mobile-native review mode (flashcards + quizzes only) | Editor will never be good on a phone; review is |

## Known limitations in v1

- Cost/dry-run figures are modelled, not measured (`docs/ARCHITECTURE.md` §5).
- `FULL OUTER JOIN` and `RIGHT JOIN` are native in SQLite 3.39+; we are on 3.51, so
  these are faithful, but the lesson still flags that older engines lack them.
- The coach's static analyser is rule-based; it is precise but not exhaustive, and it
  says so rather than guessing.
- Single learner profile; the leaderboard rivals are simulated and progress on a curve.
