# Curriculum map — 14 days, 12 modules

Every day follows the same ten-beat structure, because a predictable shape lets the
learner spend their attention on SQL instead of on navigation:

```
1 Theory  2 Visual  3 Examples  4 Playground  5 Practice
6 Quiz    7 Assessment  8 Challenge  9 Reflection  10 Daily project
```

**Time budget per day:** 75–110 minutes.
**Gate:** the day's assessment must score ≥ 70% to mark the day complete. Gating is
advisory — the learner can always move on, but the roadmap shows the gap.

| Day | Module | Theme | Exercises |
|---|---|---|---|
| 1 | M1 | How data is actually stored | 8 |
| 2 | M2 | Reading data: SELECT | 20 |
| 3 | M3 | Filtering: WHERE | 30 |
| 4 | M4a | Aggregation | 22 |
| 5 | M4b | GROUP BY / HAVING | 18 |
| 6 | M5a | JOINs: INNER, LEFT | 26 |
| 7 | M5b | JOINs: RIGHT, FULL, SELF, CROSS, fan-out | 24 |
| 8 | M6 | CASE, dates, strings, math, NULLs | 40 |
| 9 | M7 | CTEs & subqueries | 22 |
| 10 | M8 | Window functions | 26 |
| 11 | M9 | BigQuery: cost, partitioning, nested data | 14 |
| 12 | M10 | GA4 export schema | 14 |
| 13 | M11 | Marketing analytics: CAC, ROAS, LTV, retention, attribution | 30 |
| 14 | M12 | Thinking like an analyst + capstone kickoff | 6 |
| | | **Total** | **300** |

---

## Day 1 — M1 · How data is actually stored

**Objective.** Explain, in the learner's own words, why the marketing data they see in
Looker is stored across many narrow tables rather than one wide sheet.

**Concepts.** Database · table · row · column · data type · primary key · foreign key ·
schema · dataset · grain · normalisation (1NF→3NF) · denormalisation and when a
marketer *wants* it.

**The framing that makes it stick.** A spreadsheet has one grain. A warehouse has one
grain *per table*, and every bug a junior analyst ships is a grain mistake. Day 1 ends
with the learner able to state the grain of any table in the warehouse.

**Visual.** Animated walk from a flat 40-column ad-report CSV → normalised
`campaigns` / `ad_groups` / `daily_metrics`, showing each redundant cell dissolving.

**Daily project.** *Warehouse audit*: for 8 named tables, state the grain, the primary
key, and one question the table can answer alone.

## Day 2 — M2 · Reading data: SELECT

**Concepts.** `SELECT` · column projection · `AS` aliases · `SELECT *` and why it costs
money in BigQuery · `LIMIT` · `DISTINCT` · `ORDER BY` (multi-key, `ASC`/`DESC`,
`NULLS FIRST/LAST`) · computed columns · operator precedence.

**Marketing spine.** Every exercise returns something a marketer would paste into
Slack: "the 10 highest-spend campaign-days", "unique creative formats we ran on Meta".

**Trap taught.** `SELECT DISTINCT campaign_id, campaign_name` is not "distinct
campaigns" if a name ever changed. Exercise 2.14 makes them find the one that did.

**Daily project.** *Campaign inventory*: a one-query catalogue of everything running,
sorted for a Monday standup.

## Day 3 — M3 · Filtering: WHERE

**Concepts.** `WHERE` · comparison operators · `AND`/`OR`/`NOT` and precedence ·
parenthesisation · `LIKE` and wildcards · `IN` · `BETWEEN` (and its inclusive edges) ·
`IS NULL` / `IS NOT NULL` · three-valued logic · filtering dates stored as strings.

**The lesson that matters most.** `NULL != NULL`. A filter of
`WHERE campaign_id != 42` silently drops every row where `campaign_id IS NULL`.
Exercise 3.22 has the learner lose 1 180 orders to this and then find them.

**Visual.** Truth-table animator: toggle `A`, `B` and `NULL` and watch `AND`/`OR`/`NOT`
resolve, with a live row count from `orders`.

**Daily project.** *Wasted-spend finder*: every campaign-day with spend and zero
conversions, excluding brand and excluding the two-day conversion lag window.

## Day 4 — M4a · Aggregation

**Concepts.** `COUNT(*)` vs `COUNT(col)` vs `COUNT(DISTINCT col)` · `SUM` · `AVG` and
why it ignores NULLs · `MIN`/`MAX` · aggregates over filtered sets · `COUNTIF` ·
rate metrics as `SUM(a)/SUM(b)` not `AVG(rate)`.

**The single most valuable idea in the course.** *Never average a rate.* Averaging
per-campaign CTR gives every campaign equal weight regardless of size. Exercise 4.9
shows the two answers side by side: 3.1% vs 1.4%, from the same data.

**Daily project.** *Channel scorecard*: spend, clicks, CTR, CPC, conversions, CPA,
ROAS — one row per channel, every rate correctly weighted.

## Day 5 — M4b · GROUP BY / HAVING

**Concepts.** `GROUP BY` · grouping by multiple keys · the "every non-aggregated column
must be grouped" rule · `HAVING` vs `WHERE` (before/after aggregation) · ordering by an
aggregate · grouping by an expression · logical query execution order
(`FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`).

**Visual.** The execution-order pipeline animates a query one clause at a time, showing
the row count after each stage.

**Daily project.** *Keyword efficiency report*: keywords with ≥ 100 clicks whose CPA is
worse than their campaign's average.

## Day 6 — M5a · JOINs: INNER and LEFT

**Concepts.** Join keys · `INNER JOIN` · `LEFT JOIN` · `ON` vs `WHERE` on an outer join
(the classic bug that silently converts `LEFT` to `INNER`) · multi-table joins ·
joining on a date · anti-join via `LEFT JOIN … WHERE b.key IS NULL`.

**Visual.** Two tables rendered as row-sets; picking a join type animates rows sliding
into the result with unmatched rows fading to NULL-filled ghosts.

**Daily project.** *Spend-to-revenue bridge*: join ad spend to orders and quantify how
much revenue has no attributable campaign.

## Day 7 — M5b · The rest of the JOIN family

**Concepts.** `RIGHT JOIN` · `FULL OUTER JOIN` (and SQLite/BigQuery differences) ·
`SELF JOIN` (previous-order lookup, manager chains) · `CROSS JOIN` and the date-spine
pattern · **fan-out**: why joining `orders` to `order_items` and summing
`orders.gross_revenue` inflates revenue by 1.8× · join-then-aggregate vs
aggregate-then-join.

**Daily project.** *Complete daily report with no missing days*, built on a
`CROSS JOIN` date spine so zero-order days appear as zeros rather than vanishing.

## Day 8 — M6 · CASE, dates, strings, math, NULLs

**Concepts.** `CASE WHEN` (searched and simple) · `CASE` inside aggregates =
conditional aggregation, i.e. pivoting · date parsing and formatting · `DATE_DIFF`,
`DATE_TRUNC`, `EXTRACT` · GA4's `YYYYMMDD` strings and microsecond timestamps ·
`CONCAT`, `SPLIT`, `REGEXP_EXTRACT` for parsing campaign names and UTMs ·
`ROUND`/`SAFE_DIVIDE` · `COALESCE`, `IFNULL`, `NULLIF` · the difference between "zero"
and "unknown".

**Daily project.** *Campaign-name parser*: decompose `GB_Search_NonBrand_UK_Exact` into
five typed columns using only string functions, then report by each.

## Day 9 — M7 · CTEs & subqueries

**Concepts.** `WITH` · chained CTEs · scalar subqueries · `IN` / `NOT IN` subqueries
(and the `NOT IN` + NULL catastrophe) · `EXISTS` / `NOT EXISTS` · correlated subqueries
and their cost · derived tables · when a CTE beats a subquery for *readability*, which
is the real reason to use one.

**Craft standard introduced.** From day 9 on, every multi-step answer is written as
named CTEs that read top-to-bottom like a paragraph. Nested-subquery answers still pass
grading but the coach flags them for readability.

**Daily project.** *Cohort table builder*, staged as `cohorts → activity → matrix`.

## Day 10 — M8 · Window functions

**Concepts.** `OVER()` · `PARTITION BY` · `ORDER BY` inside a window · `ROW_NUMBER` /
`RANK` / `DENSE_RANK` and when the difference bites · `LAG` / `LEAD` for
period-over-period · `FIRST_VALUE` / `LAST_VALUE` and the frame-default trap ·
`NTILE` for deciles · frames: `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` for rolling
7-day · running totals · `SUM(x) OVER (PARTITION BY …)` for percent-of-total ·
`QUALIFY` · dedup with `ROW_NUMBER() = 1`.

**Visual.** Frame animator: scrub a cursor down a table and watch the window frame
highlight and the aggregate recompute, for each frame spec.

**Daily project.** *Rolling 7-day ROAS with week-over-week delta*, per channel.

## Day 11 — M9 · BigQuery in anger

**Concepts.** Projects/datasets/tables · slots and the on-demand pricing model ·
**bytes scanned is the only thing you pay for** · why `SELECT *` is the expensive
mistake · partitioning (ingestion-time vs column) and partition pruning · clustering ·
`_TABLE_SUFFIX` and wildcard tables · nested (`STRUCT`) and repeated (`ARRAY`) fields ·
`UNNEST` and the implicit `CROSS JOIN` · dry runs · `maximum_bytes_billed` ·
materialised views vs scheduled queries.

**Lab-driven.** This day is nine hands-on labs; each shows a before/after
bytes-scanned figure and dollar cost.

**Daily project.** *Cut a 4.2 TB query to under 40 GB* without changing its output.

## Day 12 — M10 · The GA4 export schema

**Concepts.** One row per event · `event_date` is a string · `event_timestamp` is
microseconds · `user_pseudo_id` vs `user_id` · reconstructing a session from
`ga_session_id` in `event_params` · `UNNEST(event_params)` and the pivot idiom ·
`items` for e-commerce · `traffic_source` (first-touch, immutable) vs session-scoped
source/medium · channel grouping rebuilt by hand · `device`, `geo` ·
sessions/users/engagement defined exactly as the GA4 UI defines them, and why your SQL
will still disagree with the UI by 1–3%.

**Daily project.** *Rebuild the GA4 "Traffic acquisition" report from raw events*, then
reconcile it against `ga4_sessions` and explain every discrepancy.

## Day 13 — M11 · Marketing analytics (the heart)

This is the module the other twelve exist to enable. Every metric is derived from first
principles, then implemented, then stress-tested against an edge case.

| Metric | What the learner builds |
|---|---|
| CTR / CPC / CPM | Correctly weighted, per channel and campaign |
| CAC | Blended vs paid-only vs channel-level; the denominator argument |
| ROAS | Platform-reported vs warehouse-truth, and the gap between them |
| AOV | And why median ≠ mean when whales exist |
| LTV | Historical cumulative, cohort-based, and predicted (simple retention-curve model) |
| LTV:CAC | By channel, with payback period in months |
| Retention | Day-1/7/30, classic and rolling; the cohort matrix |
| Churn | Logo vs revenue churn; gross vs net revenue retention |
| MRR | New / expansion / contraction / churned / reactivation — the MRR bridge |
| Activation | Defining the aha-moment event and measuring time-to-activate |
| Funnel | Step conversion, drop-off, and strict-order vs any-order funnels |
| Cohorts | Acquisition cohorts, behavioural cohorts, cohort-over-cohort |
| Attribution | First-touch, last-touch, last-non-direct, linear, time-decay, position-based — all six on one dataset, side by side |
| Customer journey | Path sequencing with `STRING_AGG` over ordered touchpoints |
| Payback | Months to recover CAC by channel |
| Incrementality | Why every model above is correlational, and what a holdout would cost |

**Daily project.** *The one-query executive summary*: 14 KPIs, current period vs prior
period, with deltas.

## Day 14 — M12 · Thinking like an analyst

**Concepts.** Choosing a grain before writing a line · sanity-checking a number three
ways · the denominator conversation · Simpson's paradox in channel data · confidence in
small samples · when a metric is directionally useful but numerically wrong · how to
present a query result to a CMO · query readability as a professional obligation ·
optimisation as a habit.

**Deliverable.** Capstone kickoff — the learner becomes Growth Analyst at Northbeam and
takes 100 business questions across GA4, CRM, ads, revenue, products, subscriptions and
support.

---

## Concept → exercise index

Concepts are tagged on every exercise and roll up into the mastery model that drives
weak-area detection and revision. The 62 tracked concepts:

`select` `alias` `limit` `distinct` `order-by` `where` `boolean-logic` `like` `in`
`between` `null-handling` `count` `sum` `avg` `min-max` `countif` `group-by` `having`
`rate-metrics` `execution-order` `inner-join` `left-join` `right-join` `full-join`
`self-join` `cross-join` `anti-join` `join-fanout` `date-spine` `case-when`
`conditional-aggregation` `pivot` `date-functions` `date-trunc` `date-diff`
`string-functions` `regexp` `split-parse` `math-functions` `safe-divide` `coalesce`
`cte` `chained-cte` `subquery` `correlated-subquery` `exists` `derived-table`
`row-number` `rank` `dense-rank` `lag-lead` `first-last-value` `ntile` `running-total`
`rolling-window` `percent-of-total` `qualify` `dedup` `unnest` `struct` `array`
`partitioning` `clustering` `cost-optimisation` `ga4-schema` `ga4-params`
`funnel` `cohort` `retention` `churn` `mrr` `ltv` `cac` `roas` `aov` `attribution`
`activation` `segmentation` `grain`
