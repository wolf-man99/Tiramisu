import { ex } from './helpers';

/**
 * Module 8 — Window functions (day 10).
 *
 * 26 exercises. Window functions do two things nothing else can: compare a row to its
 * group without collapsing the rows, and look at neighbouring rows. Almost every
 * "period over period", "top N per group" and "running total" request is one of those
 * two, and each is a one-liner once you see it.
 */
export const M08 = [
  ex('8.1', 10, 'easy',
    'Your first window',
    'Return `campaign_id`, `date`, `cost` and `campaign_total` — the campaign\'s total cost repeated on every row — for the first 20 rows of google_ads_daily by campaign_id then date.',
    ['google_ads_daily'], ['percent-of-total'],
    `SELECT campaign_id, date, cost,
       SUM(cost) OVER (PARTITION BY campaign_id) AS campaign_total
FROM google_ads_daily
ORDER BY campaign_id, date, ad_group_id
LIMIT 20`,
    ['`SUM(x) OVER (PARTITION BY y)` aggregates within each partition but keeps every row.',
      'Unlike GROUP BY, nothing collapses.'],
    { orderMatters: true,
      explanation: 'This is the essential difference: GROUP BY returns one row per group; a window function returns every row, with the group\'s answer attached. That is what lets you compare a row to its own group.' }),

  ex('8.2', 10, 'easy',
    'Percent of total',
    'Return `campaign_id`, `spend` and `pct_of_all_spend` for each campaign, using a window function for the denominator. Order by spend descending.',
    ['google_ads_daily'], ['percent-of-total'],
    `SELECT campaign_id,
       SUM(cost) AS spend,
       SAFE_DIVIDE(SUM(cost), SUM(SUM(cost)) OVER ()) AS pct_of_all_spend
FROM google_ads_daily
GROUP BY campaign_id
ORDER BY spend DESC, campaign_id`,
    ['`OVER ()` with no PARTITION BY means "the whole result set".',
      'You can window over an aggregate: `SUM(SUM(cost)) OVER ()` sums the group sums.',
      'The window runs after GROUP BY, which is why this works.'],
    { orderMatters: true }),

  ex('8.3', 10, 'easy',
    'ROW_NUMBER',
    'Return `campaign_id`, `date`, `cost` and `rn` — the row number within each campaign ordered by date — for the first 20 rows.',
    ['google_ads_daily'], ['row-number'],
    `SELECT campaign_id, date, cost,
       ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY date, ad_group_id) AS rn
FROM google_ads_daily
ORDER BY campaign_id, date, ad_group_id
LIMIT 20`,
    ['ROW_NUMBER assigns 1, 2, 3… within each partition.',
      'The ORDER BY inside OVER decides the numbering; it is separate from the query\'s ORDER BY.'],
    { orderMatters: true }),

  ex('8.4', 10, 'medium',
    'RANK vs DENSE_RANK vs ROW_NUMBER',
    'Return `category`, `product_name`, `list_price`, and all three ranking functions (`rn`, `rnk`, `dense_rnk`) partitioned by category ordered by list_price descending. Order by category then list_price descending.',
    ['products'], ['rank', 'dense-rank', 'row-number'],
    `SELECT category, product_name, list_price,
       ROW_NUMBER() OVER (PARTITION BY category ORDER BY list_price DESC, product_id) AS rn,
       RANK()       OVER (PARTITION BY category ORDER BY list_price DESC) AS rnk,
       DENSE_RANK() OVER (PARTITION BY category ORDER BY list_price DESC) AS dense_rnk
FROM products
ORDER BY category, list_price DESC, product_id`,
    ['All three take the same OVER clause.',
      'They differ only in how they treat ties.'],
    { orderMatters: true,
      explanation: 'ROW_NUMBER never ties — it picks arbitrarily unless you add a tie-break. RANK ties then skips (1, 1, 3). DENSE_RANK ties then continues (1, 1, 2). Use ROW_NUMBER to *pick one*, RANK to *report a placing*.' }),

  ex('8.5', 10, 'medium',
    'Top N per group',
    'Return the two highest-priced products in each category: `category`, `product_name`, `list_price`. Order by category then list_price descending.',
    ['products'], ['row-number', 'qualify'],
    `SELECT category, product_name, list_price
FROM (
  SELECT category, product_name, list_price,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY list_price DESC, product_id) AS rn
  FROM products
)
WHERE rn <= 2
ORDER BY category, list_price DESC`,
    ['You cannot filter on a window function in WHERE — it has not been computed yet.',
      'Wrap the query in a subquery and filter outside it.',
      'BigQuery\'s QUALIFY does this in one step.'],
    { orderMatters: true,
      trap: '`WHERE ROW_NUMBER() OVER (…) <= 2` is a syntax error in every SQL dialect.' }),

  ex('8.6', 10, 'medium',
    'QUALIFY',
    'Same result as the previous exercise, written with QUALIFY: the top two products per category by price. Return `category`, `product_name`, `list_price`.',
    ['products'], ['qualify', 'row-number'],
    `SELECT category, product_name, list_price
FROM products
QUALIFY ROW_NUMBER() OVER (PARTITION BY category ORDER BY list_price DESC, product_id) <= 2
ORDER BY category, list_price DESC`,
    ['QUALIFY is to window functions what HAVING is to aggregates.',
      'It runs after SELECT, so the window function is available.',
      'It is a BigQuery extension — most other engines need the subquery form.'],
    { orderMatters: true }),

  ex('8.7', 10, 'medium',
    'LAG for period-over-period',
    'Return `month`, `revenue`, `prev_month_revenue` and `mom_change` for completed orders. Chronological.',
    ['orders'], ['lag-lead', 'date-trunc'],
    `WITH monthly AS (
  SELECT DATE_TRUNC(order_date, MONTH) AS month, SUM(gross_revenue) AS revenue
  FROM orders WHERE status = 'completed' GROUP BY month
)
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_month_revenue,
       revenue - LAG(revenue) OVER (ORDER BY month) AS mom_change
FROM monthly
ORDER BY month`,
    ['LAG looks at the previous row in the window\'s order.',
      'The first row has no previous row, so LAG returns NULL there.'],
    { orderMatters: true }),

  ex('8.8', 10, 'medium',
    'Month-over-month percentage',
    'Extend the previous query with `mom_pct` — the percentage change. Chronological.',
    ['orders'], ['lag-lead', 'safe-divide'],
    `WITH monthly AS (
  SELECT DATE_TRUNC(order_date, MONTH) AS month, SUM(gross_revenue) AS revenue
  FROM orders WHERE status = 'completed' GROUP BY month
)
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_month_revenue,
       SAFE_DIVIDE(revenue - LAG(revenue) OVER (ORDER BY month),
                   LAG(revenue) OVER (ORDER BY month)) AS mom_pct
FROM monthly
ORDER BY month`,
    ['Repeat the LAG expression in the numerator and denominator.',
      'SAFE_DIVIDE handles the first row, where the previous value is NULL.'],
    { orderMatters: true }),

  ex('8.9', 10, 'medium',
    'LEAD to look forward',
    'Return `month`, `revenue` and `next_month_revenue` for completed orders. Chronological.',
    ['orders'], ['lag-lead'],
    `WITH monthly AS (
  SELECT DATE_TRUNC(order_date, MONTH) AS month, SUM(gross_revenue) AS revenue
  FROM orders WHERE status = 'completed' GROUP BY month
)
SELECT month, revenue, LEAD(revenue) OVER (ORDER BY month) AS next_month_revenue
FROM monthly
ORDER BY month`,
    ['LEAD is LAG in the other direction.',
      'The last row has no next row.'],
    { orderMatters: true }),

  ex('8.10', 10, 'medium',
    'LAG with an offset and default',
    'Return `month`, `revenue` and `revenue_3mo_ago` — using LAG with an offset of 3 and a default of 0. Chronological.',
    ['orders'], ['lag-lead'],
    `WITH monthly AS (
  SELECT DATE_TRUNC(order_date, MONTH) AS month, SUM(gross_revenue) AS revenue
  FROM orders WHERE status = 'completed' GROUP BY month
)
SELECT month, revenue, LAG(revenue, 3, 0) OVER (ORDER BY month) AS revenue_3mo_ago
FROM monthly
ORDER BY month`,
    ['`LAG(col, offset, default)` — the second argument is how far back.',
      'The third argument replaces the NULL at the start of the window.'],
    { orderMatters: true }),

  ex('8.11', 10, 'medium',
    'Running total',
    'Return `month`, `revenue` and `cumulative_revenue` for completed orders. Chronological.',
    ['orders'], ['running-total'],
    `WITH monthly AS (
  SELECT DATE_TRUNC(order_date, MONTH) AS month, SUM(gross_revenue) AS revenue
  FROM orders WHERE status = 'completed' GROUP BY month
)
SELECT month, revenue,
       SUM(revenue) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative_revenue
FROM monthly
ORDER BY month`,
    ['Adding ORDER BY to a window turns the aggregate into a running one.',
      'The explicit frame says "everything from the start up to this row".',
      'Without a frame, `ORDER BY` defaults to exactly that — but writing it is clearer.'],
    { orderMatters: true }),

  ex('8.12', 10, 'hard',
    'Rolling 7-day spend',
    'Return `date`, `spend` and `rolling_7d` for `ad_spend_daily` in October 2024. Chronological.',
    ['ad_spend_daily'], ['rolling-window'],
    `WITH daily AS (
  SELECT date, SUM(spend) AS spend
  FROM ad_spend_daily
  GROUP BY date
)
SELECT date, spend,
       SUM(spend) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7d
FROM daily
WHERE date BETWEEN '2024-10-01' AND '2024-10-31'
ORDER BY date`,
    ['`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` is a 7-row window including today.',
      'Aggregate to one row per date first, or the frame counts rows rather than days.'],
    { orderMatters: true,
      trap: 'Applying a ROWS frame to un-aggregated data counts *rows*, not days — and a day with three campaigns then contributes three rows to the window.' }),

  ex('8.13', 10, 'hard',
    'Rolling average smooths the noise',
    'Return `date`, `orders` and `rolling_7d_avg_orders` for completed orders in Q4. Chronological.',
    ['orders'], ['rolling-window'],
    `WITH daily AS (
  SELECT order_date AS date, COUNT(*) AS orders
  FROM orders WHERE status = 'completed' GROUP BY order_date
)
SELECT date, orders,
       AVG(orders) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7d_avg_orders
FROM daily
WHERE date BETWEEN '2024-10-01' AND '2024-12-31'
ORDER BY date`,
    ['AVG works in a frame exactly like SUM.',
      'A 7-day rolling average cancels the weekday cycle, which is why it is the default for marketing time series.'],
    { orderMatters: true }),

  ex('8.14', 10, 'medium',
    'FIRST_VALUE',
    'Return `campaign_id`, `date`, `cost` and `first_day_cost` — the campaign\'s cost on its earliest recorded day. First 20 rows by campaign_id then date.',
    ['google_ads_daily'], ['first-last-value'],
    `SELECT campaign_id, date, cost,
       FIRST_VALUE(cost) OVER (PARTITION BY campaign_id ORDER BY date, ad_group_id) AS first_day_cost
FROM google_ads_daily
ORDER BY campaign_id, date, ad_group_id
LIMIT 20`,
    ['FIRST_VALUE reads the first row of the frame.',
      'With the default frame that is the first row of the partition.'],
    { orderMatters: true }),

  ex('8.15', 10, 'hard',
    'The LAST_VALUE trap',
    'Return `campaign_id`, `date`, `cost`, `last_naive` (LAST_VALUE with the default frame) and `last_correct` (with an explicit full frame). First 20 rows by campaign_id then date.',
    ['google_ads_daily'], ['first-last-value'],
    `SELECT campaign_id, date, cost,
       LAST_VALUE(cost) OVER (PARTITION BY campaign_id ORDER BY date, ad_group_id) AS last_naive,
       LAST_VALUE(cost) OVER (PARTITION BY campaign_id ORDER BY date, ad_group_id
                              ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_correct
FROM google_ads_daily
ORDER BY campaign_id, date, ad_group_id
LIMIT 20`,
    ['With ORDER BY and no explicit frame, the window ends at the *current row*.',
      'So the naive LAST_VALUE just returns the current row\'s value.',
      'You must widen the frame to UNBOUNDED FOLLOWING to reach the real last row.'],
    {
      explanation:
        'The default frame with ORDER BY is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. FIRST_VALUE is unaffected, LAST_VALUE is completely broken by it, and the query still runs. This catches everyone exactly once.',
      trap: 'LAST_VALUE without an explicit frame returns the current row.',
    }),

  ex('8.16', 10, 'medium',
    'NTILE for deciles',
    'Split customers into 10 deciles by lifetime revenue. Return `decile`, `customers`, `min_revenue`, `max_revenue` and `total_revenue`. Order by decile.',
    ['customer_ltv'], ['ntile', 'segmentation'],
    `WITH ranked AS (
  SELECT customer_id, lifetime_revenue,
         NTILE(10) OVER (ORDER BY lifetime_revenue DESC) AS decile
  FROM customer_ltv
)
SELECT decile,
       COUNT(*) AS customers,
       MIN(lifetime_revenue) AS min_revenue,
       MAX(lifetime_revenue) AS max_revenue,
       SUM(lifetime_revenue) AS total_revenue
FROM ranked
GROUP BY decile
ORDER BY decile`,
    ['NTILE(n) splits the ordered rows into n roughly equal buckets.',
      'Compute it in a CTE, then aggregate per bucket.'],
    { orderMatters: true,
      explanation: 'The top decile\'s share of total revenue is the number this query exists for. In most consumer businesses it is 40–60%, and it is the argument for every VIP programme ever built.' }),

  ex('8.17', 10, 'hard',
    'Deduplicate with ROW_NUMBER',
    'The orders table has 26 exact duplicates. Return `deduped_orders` and `deduped_revenue` by keeping only the first row per order_id.',
    ['orders'], ['dedup', 'row-number'],
    `WITH numbered AS (
  SELECT order_id, gross_revenue, status,
         ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY order_id) AS rn
  FROM orders
)
SELECT COUNT(*) AS deduped_orders, SUM(gross_revenue) AS deduped_revenue
FROM numbered
WHERE rn = 1 AND status = 'completed'`,
    ['Number the rows within each order_id, then keep only rn = 1.',
      'Unlike DISTINCT, this works even when the duplicates differ in some column.'],
    { explanation: 'ROW_NUMBER dedup is the general solution. The ORDER BY inside the window is where you express *which* copy to keep — the newest, the one with the most fields populated, whatever the business rule is.' }),

  ex('8.18', 10, 'hard',
    'Rank campaigns within their channel',
    'Return `channel_type`, `campaign_name`, `spend` and `rank_in_channel` for the top 3 spenders in each channel type. Order by channel_type then rank.',
    ['google_ads_daily', 'google_ads_campaigns'], ['rank', 'qualify'],
    `WITH spend AS (
  SELECT c.channel_type, c.campaign_name, SUM(d.cost) AS spend
  FROM google_ads_daily d
  JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
  GROUP BY c.channel_type, c.campaign_name
)
SELECT channel_type, campaign_name, spend,
       RANK() OVER (PARTITION BY channel_type ORDER BY spend DESC) AS rank_in_channel
FROM spend
QUALIFY RANK() OVER (PARTITION BY channel_type ORDER BY spend DESC) <= 3
ORDER BY channel_type, rank_in_channel, campaign_name`,
    ['Aggregate first, then rank the aggregates.',
      'QUALIFY filters on the rank.'],
    { orderMatters: true }),

  ex('8.19', 10, 'hard',
    'Share within a partition',
    'Return `channel_type`, `campaign_name`, `spend` and `pct_of_channel` — each campaign\'s share of its own channel\'s spend. Order by channel_type then pct_of_channel descending.',
    ['google_ads_daily', 'google_ads_campaigns'], ['percent-of-total'],
    `WITH spend AS (
  SELECT c.channel_type, c.campaign_name, SUM(d.cost) AS spend
  FROM google_ads_daily d
  JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
  GROUP BY c.channel_type, c.campaign_name
)
SELECT channel_type, campaign_name, spend,
       SAFE_DIVIDE(spend, SUM(spend) OVER (PARTITION BY channel_type)) AS pct_of_channel
FROM spend
ORDER BY channel_type, pct_of_channel DESC, campaign_name`,
    ['The denominator is a windowed SUM over the partition.',
      'No second query and no self-join needed.'],
    { orderMatters: true }),

  ex('8.20', 10, 'hard',
    'Days between a customer\'s orders',
    'Return `customer_id`, `order_date`, `prev_order_date` and `days_since_prev` for customers\' completed orders. Order by customer_id then order_date, limit 30.',
    ['orders'], ['lag-lead', 'date-diff'],
    `SELECT customer_id, order_date,
       LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id) AS prev_order_date,
       DATE_DIFF(order_date,
                 LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id),
                 DAY) AS days_since_prev
FROM orders
WHERE status = 'completed'
ORDER BY customer_id, order_date, order_id
LIMIT 30`,
    ['Partition by customer so LAG never crosses between customers.',
      'The first order of each customer has no previous one — NULL is correct there.'],
    { orderMatters: true,
      explanation: 'Median days-between-orders is the single most useful input to a lifecycle email programme: it tells you when someone is *late*, which is when a win-back email actually works.' }),

  ex('8.21', 10, 'hard',
    'First and latest touch per journey',
    'Return `user_pseudo_id`, `first_channel` and `last_channel` for converted journeys, using FIRST_VALUE and LAST_VALUE. Order by user_pseudo_id, limit 20.',
    ['attribution_touchpoints'], ['first-last-value', 'attribution'],
    `SELECT DISTINCT user_pseudo_id,
       FIRST_VALUE(channel) OVER (PARTITION BY user_pseudo_id ORDER BY touch_position) AS first_channel,
       LAST_VALUE(channel) OVER (PARTITION BY user_pseudo_id ORDER BY touch_position
                                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_channel
FROM attribution_touchpoints
WHERE converted = 1
ORDER BY user_pseudo_id
LIMIT 20`,
    ['Both window functions use the same partition but LAST_VALUE needs the widened frame.',
      'DISTINCT collapses the repeated rows per journey.'],
    { orderMatters: true }),

  ex('8.22', 10, 'hard',
    'Cumulative share (Pareto)',
    'Return `campaign_id`, `spend`, `pct_of_total` and `cumulative_pct` for Google campaigns ordered by spend descending — the classic 80/20 curve.',
    ['google_ads_daily'], ['running-total', 'percent-of-total'],
    `WITH spend AS (
  SELECT campaign_id, SUM(cost) AS spend
  FROM google_ads_daily
  GROUP BY campaign_id
)
SELECT campaign_id, spend,
       SAFE_DIVIDE(spend, SUM(spend) OVER ()) AS pct_of_total,
       SAFE_DIVIDE(SUM(spend) OVER (ORDER BY spend DESC, campaign_id
                                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
                   SUM(spend) OVER ()) AS cumulative_pct
FROM spend
ORDER BY spend DESC, campaign_id`,
    ['Two windows: one over everything for the denominator, one running for the numerator.',
      'Both can appear in the same SELECT.'],
    { orderMatters: true,
      explanation: 'Read down `cumulative_pct` to find where it crosses 0.8. That is how many campaigns carry 80% of the budget — and it is almost always far fewer than the team thinks.' }),

  ex('8.23', 10, 'hard',
    'Best day per campaign',
    'Return `campaign_id`, `date` and `cost` for each campaign\'s single highest-cost day. Order by cost descending, top 15.',
    ['google_ads_daily'], ['qualify', 'row-number'],
    `WITH daily AS (
  SELECT campaign_id, date, SUM(cost) AS cost
  FROM google_ads_daily
  GROUP BY campaign_id, date
)
SELECT campaign_id, date, cost
FROM daily
QUALIFY ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY cost DESC, date) = 1
ORDER BY cost DESC, campaign_id
LIMIT 15`,
    ['Aggregate to campaign-day first — the raw table is campaign-ad-group-day.',
      'ROW_NUMBER = 1 picks the top row per partition.'],
    { orderMatters: true }),

  ex('8.24', 10, 'expert',
    'Rolling 7-day ROAS by channel',
    'Return `channel`, `date`, `spend_7d`, `revenue_7d` and `roas_7d` for November 2024. Order by channel then date.',
    ['ad_spend_daily', 'orders'], ['rolling-window', 'roas', 'chained-cte'],
    `WITH spend AS (
  SELECT channel, date, SUM(spend) AS spend
  FROM ad_spend_daily
  GROUP BY channel, date
),
revenue AS (
  SELECT channel, order_date AS date, SUM(gross_revenue) AS revenue
  FROM orders
  WHERE status = 'completed'
  GROUP BY channel, order_date
),
joined AS (
  SELECT s.channel, s.date, s.spend, COALESCE(r.revenue, 0) AS revenue
  FROM spend s
  LEFT JOIN revenue r ON r.channel = s.channel AND r.date = s.date
)
SELECT channel, date,
       SUM(spend)   OVER (PARTITION BY channel ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS spend_7d,
       SUM(revenue) OVER (PARTITION BY channel ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS revenue_7d,
       SAFE_DIVIDE(
         SUM(revenue) OVER (PARTITION BY channel ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),
         SUM(spend)   OVER (PARTITION BY channel ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
       ) AS roas_7d
FROM joined
WHERE date BETWEEN '2024-11-01' AND '2024-11-30'
ORDER BY channel, date`,
    ['Build one row per channel-date first, so the ROWS frame counts days.',
      'Partition the rolling window by channel so it never bleeds across channels.',
      'Rolling ROAS is rolling revenue over rolling spend — not an average of daily ROAS.'],
    { orderMatters: true }),

  ex('8.25', 10, 'expert',
    'Rank movement week over week',
    'For the top campaigns by weekly spend, return `week_start`, `campaign_id`, `spend`, `rank_this_week` and `rank_last_week`. Order by week_start then rank_this_week, limit 40.',
    ['google_ads_daily', 'date_dim'], ['rank', 'lag-lead', 'chained-cte'],
    `WITH weekly AS (
  SELECT d.week_start, g.campaign_id, SUM(g.cost) AS spend
  FROM google_ads_daily g
  JOIN date_dim d ON d.date = g.date
  GROUP BY d.week_start, g.campaign_id
),
ranked AS (
  SELECT week_start, campaign_id, spend,
         RANK() OVER (PARTITION BY week_start ORDER BY spend DESC) AS rank_this_week
  FROM weekly
)
SELECT week_start, campaign_id, spend, rank_this_week,
       LAG(rank_this_week) OVER (PARTITION BY campaign_id ORDER BY week_start) AS rank_last_week
FROM ranked
ORDER BY week_start, rank_this_week, campaign_id
LIMIT 40`,
    ['Rank within each week first.',
      'Then LAG that rank, partitioned by *campaign* and ordered by week — a different partition from the ranking.',
      'Two window functions with different partitions, in two steps.'],
    { orderMatters: true,
      explanation: 'Changing the partition between the two steps is the key move. Ranking partitions by week; the week-over-week comparison partitions by campaign. Trying to do both in one step is the usual dead end.' }),

  ex('8.26', 10, 'expert',
    'Retention curve with windows',
    'Return `cohort_month`, `month_number`, `customers` and `retention_rate` using a window function for the cohort size instead of a self-join. Order by cohort_month then month_number, limit 40.',
    ['orders'], ['first-last-value', 'cohort', 'retention', 'chained-cte'],
    `WITH cohort AS (
  SELECT customer_id, DATE_TRUNC(MIN(order_date), MONTH) AS cohort_month
  FROM orders WHERE status = 'completed' GROUP BY customer_id
),
activity AS (
  SELECT c.cohort_month,
         DATE_DIFF(DATE_TRUNC(o.order_date, MONTH), c.cohort_month, MONTH) AS month_number,
         o.customer_id
  FROM orders o JOIN cohort c USING (customer_id)
  WHERE o.status = 'completed'
),
matrix AS (
  SELECT cohort_month, month_number, COUNT(DISTINCT customer_id) AS customers
  FROM activity GROUP BY cohort_month, month_number
)
SELECT cohort_month, month_number, customers,
       SAFE_DIVIDE(customers,
                   FIRST_VALUE(customers) OVER (PARTITION BY cohort_month ORDER BY month_number)) AS retention_rate
FROM matrix
ORDER BY cohort_month, month_number
LIMIT 40`,
    ['The cohort size is the month_number = 0 value — which is the FIRST_VALUE in the partition.',
      'That removes the extra CTE and the join the day-9 version needed.'],
    { orderMatters: true,
      explanation: 'Compare this to exercise 7.16. Same answer, one fewer CTE and no join. Window functions replace an entire class of self-joins, and the readability gain compounds in queries anyone else has to maintain.' }),
];
