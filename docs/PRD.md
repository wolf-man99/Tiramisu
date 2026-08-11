# GrowthSQL Academy, Product Requirements Document

**Version:** 1.0
**Status:** Implemented (v1)
**Owner:** Platform / Curriculum

---

## 1. Problem

Growth and performance marketers live inside dashboards they cannot extend. When the
question is *"which keyword actually produced profitable revenue, net of the 34% of
conversions that were view-through?"*, the dashboard has no answer and the data team
has a two-week queue.

The blocker is not intelligence. It is that every SQL course teaches `employees`,
`departments` and `salaries`. A marketer finishes the course able to write a `JOIN`
and still unable to compute blended CAC, because nobody ever showed them that CAC is
a `JOIN` between a spend table at campaign-day grain and a conversions table at
user-event grain, and that the whole problem is the grain mismatch.

## 2. Product thesis

> **Teach SQL exclusively through marketing questions, and the marketer never has to
> translate.** Every `SELECT` returns a number they already care about.

Three design commitments follow:

1. **No toy datasets.** The learner queries a 30-table marketing warehouse from day 1
: Google Ads, Meta, LinkedIn, GA4 event export, HubSpot, Salesforce, Stripe.
2. **Execution, not multiple choice.** Every answer is real SQL, run against a real
   database, graded by comparing result sets, not by string-matching the query.
3. **Hints, never answers.** The coach diagnoses the specific defect in the learner's
   query and escalates hints. It will not write the query for them.

## 3. Target user

| | |
|---|---|
| **Primary** | Performance/growth marketer, 2–8 yrs, owns paid or lifecycle budget, Excel-fluent, SQL-zero |
| **Secondary** | Growth PM, founder doing their own reporting, marketing analyst levelling into BigQuery |
| **Anti-persona** | Data engineer. We do not teach DDL, ingestion, or dbt. |

**Entry state:** Can read a pivot table. Has never written a query.
**Exit state (day 14):** Can independently answer a novel business question with a
multi-CTE, window-function BigQuery query against a GA4 export, and can defend the
grain and attribution choices they made.

## 4. Goals & non-goals

### Goals
- G1, Zero to independent BigQuery analysis in 14 days of ~90-minute sessions.
- G2. Every concept lands attached to a marketing metric, never in the abstract.
- G3: The learner *thinks* like an analyst: grain, nulls, attribution windows,
  denominator discipline, sanity-checking a number before shipping it.
- G4, Interview-ready: 10 company-styled SQL interview sets.
- G5, Runs entirely locally. No cloud account, no billing, no API key required.

### Non-goals
- Not a BI tool. Charts exist to teach, not to replace Looker.
- Not multi-tenant. Single local learner profile; no auth, no PII.
- Not a real BigQuery client. We emulate BigQuery *semantics and cost model* locally
  (see `docs/ARCHITECTURE.md` §5 for exactly what is and isn't faithful).

## 5. Success metrics

| Metric | Target |
|---|---|
| Day-14 completion (of starters) | ≥ 35% |
| First-attempt accuracy, module 5 (JOINs) | ≥ 55% |
| Median exercises/session | ≥ 12 |
| Capstone questions solved by finishers | ≥ 70 / 100 |
| Learners who reach "hint level 3" (answer-adjacent) | ≤ 20% of attempts |

## 6. Functional requirements

### FR-1 Query execution
Real SQL, executed server-side against an in-memory SQLite 3.51 warehouse with a
BigQuery compatibility layer. Read-only: DDL/DML rejected before execution. Hard caps
on wall-clock time (5 s) and returned rows (5 000).

### FR-2 Grading
The reference solution is executed at grade time and the learner's result set is
compared to it. Comparison is **order-insensitive by default** and order-sensitive
only when the exercise declares `orderMatters` (i.e. when the question says "top 5").
Column *names* are ignored; column *count, types and values* are compared with numeric
tolerance (1e-6 relative). This means any correct query passes, including approaches
the author never thought of.

### FR-3 Feedback
On failure the learner receives: a structured diff (missing rows / extra rows / wrong
values / wrong column count), a static-analysis diagnosis, and the next unrevealed
hint. Never the solution, until the learner explicitly clicks *reveal* (which forfeits
XP for that exercise).

### FR-4 Curriculum
14 days, 10 modules, each day comprising: theory → visual explanation → worked
examples → interactive playground → practice set → mini quiz → assessment →
challenge → reflection → daily project. Day N+1 is gated on passing day N's
assessment (bypassable; gating is advisory, not enforced lockout).

### FR-5 Practice
Modes: Easy / Medium / Hard / Expert, plus Interview, Blind (no schema panel), Timed,
Random, Daily Challenge, Weekly Challenge.

### FR-6 Projects
10 multi-task projects; each task is independently graded; project completion awards a
badge and a shareable summary.

### FR-7 Mock interviews
10 company sets (Google, Amazon, Meta, HubSpot, Atlassian, Uber, Airbnb, Razorpay,
Swiggy, Zomato). Questions strictly increase in difficulty within a set; a per-question
timer runs; the set produces a scored debrief.

### FR-8 BigQuery labs
Nine labs on GA4 export shape, `UNNEST`, `STRUCT`, `ARRAY`, partitioning, clustering,
query optimisation, cost reduction, dry runs. Labs display an estimated bytes-scanned
and dollar cost, computed from a column-statistics model.

### FR-9 Coach
Deterministic static analyser over the learner's SQL AST-ish token stream, producing
ranked diagnoses. Optional LLM augmentation when `ANTHROPIC_API_KEY` is set. The coach
is prompt-constrained and post-filtered to never emit a complete solution.

### FR-10 Gamification
XP, coins, levels (1–30), streaks with freeze, 40+ badges, titles, unlockables,
leaderboard against 24 seeded rivals with realistic progression curves.

### FR-11 Retention system
Bookmarks, notes (per lesson and per exercise), flashcards with SM-2 spaced repetition,
revision mode that resurfaces the learner's own failed exercises.

### FR-12 Analytics
Per-concept mastery, accuracy trend, time-per-exercise distribution, common mistake
taxonomy, weak-area detection feeding the dashboard's recommendations.

## 7. Content requirements

- Every dataset row is plausible: campaign names follow real naming conventions
  (`BR_Search_NonBrand_IN_Exact`), CTRs sit in-range by channel, CAC/LTV ratios are
  defensible, seasonality and weekday effects are present, and ~3% of rows are dirty
  on purpose (nulls, duplicates, negative refunds) because real data is.
- No `lorem ipsum`. No `foo`/`bar`. No `employees` table.

## 8. Constraints

- Local-first: `npm install && npm run dev` must produce a fully working platform with
  no external service.
- Deterministic: the warehouse is generated from a fixed seed so that every learner
  sees identical numbers and reference solutions stay valid.
- Accessible: WCAG AA contrast in both themes, full keyboard operation, focus-visible
  rings, `prefers-reduced-motion` respected by all animation.

## 9. Release scope (v1, this build)

Shipped: FR-1 … FR-12, all 10 modules, 14 days, 300 exercises, 10 projects, 10
interview sets, 9 labs, 6 cheatsheets, 3 glossaries, 100-question capstone.

Deferred: multi-user auth, real BigQuery OAuth passthrough, community solutions feed,
mobile-native editor.
