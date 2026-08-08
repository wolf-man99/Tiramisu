import type { FlashcardSeed } from './types';

/**
 * Flashcard decks for spaced repetition (SM-2, see lib/progress/srs.ts).
 *
 * Cards test recall of the things that are cheap to forget and expensive to get wrong:
 * clause order, NULL behaviour, which denominator, which BigQuery function.
 */

const c = (id: string, deck: string, front: string, back: string, concept: string): FlashcardSeed =>
  ({ id, deck, front, back, concept });

export const FLASHCARDS: FlashcardSeed[] = [
  // ── SQL fundamentals ──
  c('f01', 'SQL fundamentals', 'In what order does SQL actually execute its clauses?',
    'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT. This is why WHERE cannot see a SELECT alias and ORDER BY can.', 'execution-order'),
  c('f02', 'SQL fundamentals', 'What is the difference between WHERE and HAVING?',
    'WHERE filters rows before grouping; HAVING filters groups after. `WHERE SUM(x) > 100` is an error because the sum does not exist yet.', 'having'),
  c('f03', 'SQL fundamentals', 'COUNT(*) vs COUNT(col) vs COUNT(DISTINCT col)?',
    'COUNT(*) counts rows. COUNT(col) skips NULLs. COUNT(DISTINCT col) counts unique non-NULL values. Three different numbers from one column.', 'count'),
  c('f04', 'SQL fundamentals', 'Why does `WHERE campaign_id != 42` lose rows you expected to keep?',
    'It silently drops every row where campaign_id IS NULL. Any comparison with NULL is UNKNOWN, and WHERE keeps only TRUE. Add `OR campaign_id IS NULL`.', 'null-handling'),
  c('f05', 'SQL fundamentals', 'What does `SELECT DISTINCT a, b` return?',
    'Distinct *pairs* of (a, b) — not distinct a alongside distinct b. DISTINCT applies to the whole select list.', 'distinct'),
  c('f06', 'SQL fundamentals', 'Is BETWEEN inclusive?',
    'Yes, on both ends. `BETWEEN \'2024-03-01\' AND \'2024-04-01\'` quietly includes one day of April.', 'between'),
  c('f07', 'SQL fundamentals', 'What does `_` mean inside a LIKE pattern?',
    'Exactly one character — it is a wildcard, not a literal underscore. `LIKE \'GB_%\'` also matches GBx. Escape it if you mean the character.', 'like'),
  c('f08', 'SQL fundamentals', 'Why add a tie-break column to ORDER BY before LIMIT?',
    'Without one, rows tied on the sort key can come back in any order, so "the top 10" is not reproducible between runs.', 'order-by'),

  // ── Aggregation ──
  c('f09', 'Aggregation', 'Why is AVG(clicks / impressions) wrong for CTR?',
    'It weights every row equally, so a 12-impression day counts as much as a 40,000-impression one. A rate is a ratio of sums: SUM(clicks) / SUM(impressions).', 'rate-metrics'),
  c('f10', 'Aggregation', 'What does AVG do with NULLs?',
    'Skips them entirely, shrinking the denominator. Sometimes right (unsurveyed CSAT), sometimes catastrophic (missing discount that really means zero).', 'avg'),
  c('f11', 'Aggregation', 'How do you pivot rows into columns in plain SQL?',
    'Conditional aggregation: `SUM(CASE WHEN cond THEN x ELSE 0 END)`, one per output column. Everything a spreadsheet pivot table does is this plus a GROUP BY.', 'pivot'),
  c('f12', 'Aggregation', 'What does COUNTIF return when nothing matches?',
    '0, not NULL — because it compiles to COUNT(CASE WHEN …), and COUNT of nothing is zero. SUM(CASE …) would give NULL.', 'countif'),

  // ── Joins ──
  c('f13', 'Joins', 'Where does a filter on the right table of a LEFT JOIN belong?',
    'In the ON clause. In WHERE it tests NULL for unmatched rows, fails, and silently converts the LEFT JOIN into an INNER JOIN.', 'left-join'),
  c('f14', 'Joins', 'How do you find rows in A with no match in B?',
    'Anti-join: `LEFT JOIN B ON … WHERE B.key IS NULL`. Or `NOT EXISTS`, which is immune to the NOT IN + NULL trap.', 'anti-join'),
  c('f15', 'Joins', 'What is fan-out and how do you avoid it?',
    'Joining to a finer grain duplicates the coarse side, so summing a coarse-grain column inflates it. Aggregate each side to a common grain before joining.', 'join-fanout'),
  c('f16', 'Joins', 'Why does `x NOT IN (SELECT y FROM t)` sometimes return nothing at all?',
    'Because the subquery contains a NULL. `x NOT IN (1, 2, NULL)` is never TRUE — it is UNKNOWN. Use NOT EXISTS, or add IS NOT NULL to the subquery.', 'in'),
  c('f17', 'Joins', 'What is a date spine and why bother?',
    'A complete calendar the facts are LEFT JOINed onto. Without it, days with no activity have no row, and a line chart draws straight through the gap.', 'date-spine'),
  c('f18', 'Joins', 'Why does a self join need an inequality in its ON clause?',
    'Without one you get every pair twice, in both orders, plus every row paired with itself. `b.key > a.key` keeps exactly one of each pair.', 'self-join'),

  // ── Window functions ──
  c('f19', 'Window functions', 'What is the difference between GROUP BY and a window function?',
    'GROUP BY returns one row per group. A window function returns every row with the group\'s answer attached — which is what lets you compare a row to its own group.', 'percent-of-total'),
  c('f20', 'Window functions', 'ROW_NUMBER vs RANK vs DENSE_RANK?',
    'ROW_NUMBER never ties (1,2,3). RANK ties then skips (1,1,3). DENSE_RANK ties then continues (1,1,2). Use ROW_NUMBER to pick one, RANK to report a placing.', 'rank'),
  c('f21', 'Window functions', 'Why does LAST_VALUE return the current row?',
    'The default frame with ORDER BY ends at CURRENT ROW. Widen it: `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`. FIRST_VALUE is unaffected.', 'first-last-value'),
  c('f22', 'Window functions', 'How do you write a rolling 7-day total?',
    '`SUM(x) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` — and aggregate to one row per day first, or the frame counts rows, not days.', 'rolling-window'),
  c('f23', 'Window functions', 'How do you filter on a window function?',
    'QUALIFY in BigQuery, or wrap the query in a subquery and filter outside. WHERE cannot see a window function — it runs before SELECT.', 'qualify'),
  c('f24', 'Window functions', 'How do you deduplicate rows that are not exact copies?',
    '`ROW_NUMBER() OVER (PARTITION BY key ORDER BY <which to keep>) = 1`. DISTINCT only removes exact duplicates.', 'dedup'),

  // ── BigQuery ──
  c('f25', 'BigQuery', 'What does on-demand BigQuery actually charge for?',
    'Bytes scanned — not rows returned, not query time. LIMIT does not reduce it, because the scan happens before the limit.', 'cost-optimisation'),
  c('f26', 'BigQuery', 'What stops partition pruning from working?',
    'Any function applied to the partitioning column. `WHERE date >= \'2024-06-01\'` prunes; `WHERE EXTRACT(MONTH FROM date) = 6` scans everything.', 'partitioning'),
  c('f27', 'BigQuery', 'STRUCT or ARRAY — which needs UNNEST?',
    'ARRAY. A STRUCT is one nested record, reached with a dot: `device.category`. An ARRAY is repeated and must be flattened.', 'struct'),
  c('f28', 'BigQuery', 'What does UNNEST do to your row count?',
    'Multiplies it by the array length — it is an implicit CROSS JOIN. 56k events with 7 params each become ~390k rows. Filter before you UNNEST.', 'unnest'),
  c('f29', 'BigQuery', 'How do you read two event_params onto the same row?',
    'A scalar subquery per parameter: `(SELECT ep.value.string_value FROM UNNEST(e.event_params) ep WHERE ep.key = \'source\')`. The outer grain is preserved.', 'ga4-params'),
  c('f30', 'BigQuery', 'What does SAFE_DIVIDE do?',
    'Returns NULL instead of erroring when the denominator is zero. The most useful BigQuery function for marketers, because every rate has a sometimes-zero denominator.', 'safe-divide'),
  c('f31', 'BigQuery', 'What unit is GA4\'s event_timestamp in?',
    'Microseconds. Use TIMESTAMP_MICROS. TIMESTAMP_SECONDS gives you dates in the wrong millennium.', 'ga4-schema'),
  c('f32', 'BigQuery', 'What type is GA4\'s event_date, and why?',
    'A STRING formatted YYYYMMDD. It is the partitioning column, and that format sorts and ranges correctly as text — so you get pruning without any conversion.', 'ga4-schema'),
  c('f33', 'BigQuery', 'Which order do clustering columns work in?',
    'Left to right, like a composite index. Clustering by (event_name, user_pseudo_id) helps a filter on event_name, or both — not on user_pseudo_id alone.', 'clustering'),

  // ── Marketing metrics ──
  c('f34', 'Marketing metrics', 'What is the difference between blended and paid CAC?',
    'Blended divides all paid spend by all new customers including organic; paid CAC divides by paid-sourced customers only. Blended is honest, paid is actionable.', 'cac'),
  c('f35', 'Marketing metrics', 'Why is platform-reported ROAS higher than warehouse ROAS?',
    'Each platform counts the same conversion on its own attribution window — Meta on 7-day-click/1-day-view, Google on last click. They both claim it.', 'roas'),
  c('f36', 'Marketing metrics', 'What is the correct denominator for churn rate?',
    'The population at the *start* of the period — the customers who had the opportunity to churn. Using the end count understates churn, because the churned ones are already gone.', 'churn'),
  c('f37', 'Marketing metrics', 'Why is historical LTV unfair across cohorts?',
    'A December cohort has had one month to spend; a January cohort has had twelve. Compare at a fixed age instead — 90-day or 12-month LTV.', 'ltv'),
  c('f38', 'Marketing metrics', 'What does an LTV:CAC of 3 mean?',
    'You earn three times what you pay to acquire. It is the conventional floor — and it is only as honest as the LTV window behind it.', 'ltv'),
  c('f39', 'Marketing metrics', 'Should funnel rates be step-to-step or step-to-top?',
    'Step-to-step, to localise the leak. Measured against the top, every step after the leaky one also looks broken and you optimise the wrong page.', 'funnel'),
  c('f40', 'Marketing metrics', 'Name four legitimate denominators for "conversion rate".',
    'Per session, per user, per new user, per engaged session. They differ by more than 2×. Ask what decision the number feeds before picking one.', 'funnel'),
  c('f41', 'Marketing metrics', 'What does attribution not tell you?',
    'Incrementality. Every model is correlational — brand search converts brilliantly because it captures demand other channels created. Only a holdout separates the two.', 'attribution'),
  c('f42', 'Marketing metrics', 'Why count MQLs by stage date rather than lifecycle_stage?',
    'The label says where a contact is *now*, so counting it undercounts every stage already passed. The funnel stops decreasing monotonically and stops making sense.', 'funnel'),
  c('f43', 'Marketing metrics', 'What is the most valuable RFM segment?',
    '"At risk" — high frequency, low recency. They proved they like you and then stopped, which is the cheapest churn there is to reverse.', 'segmentation'),
  c('f44', 'Marketing metrics', 'What does payback period tell you that LTV:CAC does not?',
    'Whether growth can self-fund. A three-month payback finances itself; an eighteen-month payback means every new customer is a loan you are taking out.', 'cac'),

  // ── Thinking ──
  c('f45', 'Analyst thinking', 'What is the first question to ask of any unfamiliar table?',
    'What is the grain — what does one row represent? Almost every analytical bug is a grain mistake.', 'grain'),
  c('f46', 'Analyst thinking', 'How do you prove a table\'s grain?',
    'Compare COUNT(*) to COUNT(DISTINCT <the claimed key>). If they differ, the key is not unique — as orders.order_id is not, in this warehouse.', 'grain'),
  c('f47', 'Analyst thinking', 'Why report a volume floor alongside any rate?',
    'A rate on a small denominator is noise wearing a number\'s clothes. Choose the threshold before you look at the results, and state it.', 'rate-metrics'),
  c('f48', 'Analyst thinking', 'What is Simpson\'s paradox in marketing data?',
    'An aggregate comparison that reverses inside every subgroup, because the groups have different mixes. Check device, geography and new-vs-returning before believing a single comparative number.', 'segmentation'),
];

export function flashcardDecks(): string[] {
  return [...new Set(FLASHCARDS.map((f) => f.deck))];
}
