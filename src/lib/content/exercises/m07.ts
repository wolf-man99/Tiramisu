import { ex } from './helpers';

/**
 * Module 7 — CTEs and subqueries (day 9).
 *
 * 22 exercises. From here on the craft standard changes: multi-step answers are
 * written as named CTEs that read top to bottom like a paragraph. Nested subqueries
 * still pass grading, but the coach flags them, because the real reason to use a CTE
 * is that a colleague has to read it in six months.
 */
export const M07 = [
  ex('7.1', 9, 'easy',
    'Your first CTE',
    'Using a CTE named `spend`, return `campaign_id` and `spend` for the ten highest-spending Google campaigns.',
    ['google_ads_daily'], ['cte'],
    `WITH spend AS (
  SELECT campaign_id, SUM(cost) AS spend
  FROM google_ads_daily
  GROUP BY campaign_id
)
SELECT campaign_id, spend
FROM spend
ORDER BY spend DESC, campaign_id
LIMIT 10`,
    ['`WITH name AS ( … )` defines a named result you can then select from.',
      'The main query comes after the closing bracket.'],
    { orderMatters: true,
      explanation: 'A CTE is a named intermediate result. It does not make the query faster — it makes it readable, which is the reason that actually matters.' }),

  ex('7.2', 9, 'easy',
    'Two CTEs',
    'Define `spend` (cost per campaign) and `revenue` (completed order revenue per campaign), then join them. Return `campaign_id`, `spend`, `revenue` for the top 10 by spend.',
    ['google_ads_daily', 'orders'], ['cte', 'chained-cte', 'left-join'],
    `WITH spend AS (
  SELECT campaign_id, SUM(cost) AS spend
  FROM google_ads_daily
  GROUP BY campaign_id
),
revenue AS (
  SELECT campaign_id, SUM(gross_revenue) AS revenue
  FROM orders
  WHERE status = 'completed' AND campaign_id IS NOT NULL
  GROUP BY campaign_id
)
SELECT s.campaign_id, s.spend, COALESCE(r.revenue, 0) AS revenue
FROM spend s
LEFT JOIN revenue r USING (campaign_id)
ORDER BY s.spend DESC, s.campaign_id
LIMIT 10`,
    ['Separate CTEs with a comma; do not repeat the WITH keyword.',
      'Each CTE aggregates to campaign grain, so joining them cannot fan out.'],
    { orderMatters: true }),

  ex('7.3', 9, 'medium',
    'Chained CTEs',
    'Chain three steps: `daily` (spend and clicks per date), `weekly` (roll up to week_start via date_dim), then the final select. Return `week_start`, `spend`, `clicks`, `cpc` for the first 12 weeks chronologically.',
    ['google_ads_daily', 'date_dim'], ['chained-cte', 'cte', 'date-trunc'],
    `WITH daily AS (
  SELECT date, SUM(cost) AS spend, SUM(clicks) AS clicks
  FROM google_ads_daily
  GROUP BY date
),
weekly AS (
  SELECT d.week_start, SUM(x.spend) AS spend, SUM(x.clicks) AS clicks
  FROM daily x
  JOIN date_dim d ON d.date = x.date
  GROUP BY d.week_start
)
SELECT week_start, spend, clicks, SAFE_DIVIDE(spend, clicks) AS cpc
FROM weekly
ORDER BY week_start
LIMIT 12`,
    ['A CTE can select from a CTE defined above it.',
      'Each step should do one thing and be nameable in a word.'],
    { orderMatters: true }),

  ex('7.4', 9, 'medium',
    'Scalar subquery',
    'Return `channel`, `revenue` and `pct_of_total` for completed orders, where the denominator is a scalar subquery over all completed orders. Order by revenue descending.',
    ['orders'], ['subquery', 'percent-of-total'],
    `SELECT channel,
       SUM(gross_revenue) AS revenue,
       SAFE_DIVIDE(SUM(gross_revenue),
                   (SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed')) AS pct_of_total
FROM orders
WHERE status = 'completed'
GROUP BY channel
ORDER BY revenue DESC`,
    ['A subquery returning exactly one row and one column can be used as a value.',
      'It is evaluated once, not once per row.'],
    { orderMatters: true }),

  ex('7.5', 9, 'medium',
    'Subquery in WHERE with IN',
    'Return `campaign_name` for Google campaigns that have at least one attributed completed order, using an IN subquery. Order by campaign_name.',
    ['google_ads_campaigns', 'orders'], ['subquery', 'in'],
    `SELECT campaign_name
FROM google_ads_campaigns
WHERE campaign_id IN (
  SELECT campaign_id FROM orders
  WHERE status = 'completed' AND campaign_id IS NOT NULL
)
ORDER BY campaign_name`,
    ['`WHERE col IN (SELECT …)` filters against a list produced by another query.',
      'The subquery must return exactly one column.'],
    { orderMatters: true }),

  ex('7.6', 9, 'hard',
    'The NOT IN catastrophe',
    'Return `with_null_guard` and `without_null_guard` — counts of Google campaigns not appearing in `orders.campaign_id`, computed with and without excluding NULLs from the subquery.',
    ['google_ads_campaigns', 'orders'], ['subquery', 'in', 'null-handling'],
    `SELECT
  (SELECT COUNT(*) FROM google_ads_campaigns
   WHERE campaign_id NOT IN (SELECT campaign_id FROM orders WHERE campaign_id IS NOT NULL)) AS with_null_guard,
  (SELECT COUNT(*) FROM google_ads_campaigns
   WHERE campaign_id NOT IN (SELECT campaign_id FROM orders)) AS without_null_guard`,
    ['The second subquery includes NULLs in its list.',
      '`x NOT IN (1, 2, NULL)` is never TRUE — it is UNKNOWN, because x might equal the NULL.',
      'So the unguarded version returns zero rows every time.'],
    {
      explanation:
        '`NOT IN` against a list containing even one NULL returns nothing, always, silently. This is the most vicious NULL behaviour in SQL: the query runs, returns 0, and looks like a legitimate finding. Use `NOT EXISTS` or add `WHERE col IS NOT NULL` to the subquery — and prefer NOT EXISTS, because it cannot be broken this way.',
      trap: 'NOT IN + NULL = no rows, with no warning.',
    }),

  ex('7.7', 9, 'medium',
    'EXISTS',
    'Return `customer_id` and `signup_date` for customers who have at least one completed order, using EXISTS. Order by customer_id, limit 20.',
    ['customers', 'orders'], ['exists', 'correlated-subquery'],
    `SELECT customer_id, signup_date
FROM customers c
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.customer_id AND o.status = 'completed'
)
ORDER BY customer_id
LIMIT 20`,
    ['EXISTS asks "does the subquery return any row?" — the columns it selects are irrelevant.',
      'The subquery references the outer table, which makes it correlated.',
      '`SELECT 1` is the convention: nobody cares what it returns.'],
    { orderMatters: true }),

  ex('7.8', 9, 'medium',
    'NOT EXISTS',
    'Return `customer_id` and `signup_date` for customers with no completed orders. Order by customer_id, limit 20.',
    ['customers', 'orders'], ['exists', 'anti-join'],
    `SELECT customer_id, signup_date
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.customer_id AND o.status = 'completed'
)
ORDER BY customer_id
LIMIT 20`,
    ['NOT EXISTS is the safe form of NOT IN — NULLs cannot break it.',
      'It is also usually the clearest way to write an anti-join.'],
    { orderMatters: true }),

  ex('7.9', 9, 'hard',
    'Correlated subquery in SELECT',
    'Return `campaign_id`, `campaign_name` and `order_count` — the number of completed orders per campaign, computed with a correlated subquery. Order by order_count descending, top 15.',
    ['google_ads_campaigns', 'orders'], ['correlated-subquery'],
    `SELECT c.campaign_id, c.campaign_name,
       (SELECT COUNT(*) FROM orders o
        WHERE o.campaign_id = c.campaign_id AND o.status = 'completed') AS order_count
FROM google_ads_campaigns c
ORDER BY order_count DESC, c.campaign_id
LIMIT 15`,
    ['The subquery runs once per outer row and references it.',
      'It naturally returns 0 rather than NULL for campaigns with no orders, because COUNT of nothing is 0.'],
    { orderMatters: true,
      explanation: 'Correlated subqueries are readable and slow — they run once per outer row. At 24 campaigns nobody notices; at 24 million rows this is the query that gets you a call from the data team. The LEFT JOIN + GROUP BY version does the same job in one pass.' }),

  ex('7.10', 9, 'medium',
    'Derived table',
    'Return `band` and `campaigns` by wrapping a spend aggregation in a subquery in the FROM clause and bucketing it. Bands: `high` over 40000, `medium` over 10000, else `low`. Order by campaigns descending.',
    ['google_ads_daily'], ['derived-table', 'case-when'],
    `SELECT CASE WHEN spend > 40000 THEN 'high'
            WHEN spend > 10000 THEN 'medium'
            ELSE 'low' END AS band,
       COUNT(*) AS campaigns
FROM (
  SELECT campaign_id, SUM(cost) AS spend
  FROM google_ads_daily
  GROUP BY campaign_id
)
GROUP BY band
ORDER BY campaigns DESC, band`,
    ['A subquery in FROM is a derived table — an unnamed CTE, effectively.',
      'You cannot reference a SELECT alias in the same SELECT, so the bucketing needs its own level.'],
    { orderMatters: true }),

  ex('7.11', 9, 'medium',
    'Above-average campaigns',
    'Return `campaign_id` and `spend` for campaigns spending more than the average campaign. Order by spend descending.',
    ['google_ads_daily'], ['subquery', 'having', 'derived-table'],
    `WITH per_campaign AS (
  SELECT campaign_id, SUM(cost) AS spend
  FROM google_ads_daily
  GROUP BY campaign_id
)
SELECT campaign_id, spend
FROM per_campaign
WHERE spend > (SELECT AVG(spend) FROM per_campaign)
ORDER BY spend DESC, campaign_id`,
    ['You need the per-campaign totals twice: once to filter, once as the source.',
      'A CTE lets you reference the same intermediate result more than once.'],
    { orderMatters: true,
      explanation: 'This is the case where a CTE genuinely beats a subquery: the same intermediate result is needed in two places, and writing it twice would be both verbose and a maintenance trap.' }),

  ex('7.12', 9, 'hard',
    'Keywords worse than their campaign average',
    'Return `keyword_id`, `campaign_id`, `keyword_cpa` and `campaign_cpa` for keywords with at least 100 clicks whose CPA is worse than their own campaign\'s CPA. Order by keyword_cpa descending, top 20.',
    ['google_ads_keyword_daily', 'google_ads_keywords'], ['chained-cte', 'inner-join', 'rate-metrics'],
    `WITH kw AS (
  SELECT k.keyword_id, k.campaign_id,
         SUM(kd.clicks) AS clicks,
         SUM(kd.cost) AS cost,
         SUM(kd.conversions) AS conversions
  FROM google_ads_keyword_daily kd
  JOIN google_ads_keywords k ON k.keyword_id = kd.keyword_id
  GROUP BY k.keyword_id, k.campaign_id
),
camp AS (
  SELECT campaign_id,
         SAFE_DIVIDE(SUM(cost), SUM(conversions)) AS campaign_cpa
  FROM kw
  GROUP BY campaign_id
)
SELECT kw.keyword_id,
       kw.campaign_id,
       SAFE_DIVIDE(kw.cost, kw.conversions) AS keyword_cpa,
       camp.campaign_cpa
FROM kw
JOIN camp USING (campaign_id)
WHERE kw.clicks >= 100
  AND kw.conversions > 0
  AND SAFE_DIVIDE(kw.cost, kw.conversions) > camp.campaign_cpa
ORDER BY keyword_cpa DESC, kw.keyword_id
LIMIT 20`,
    ['Build keyword totals first, then roll those same totals up to campaign level.',
      'The second CTE reads from the first — that is the whole point of chaining.',
      'Compare the two CPAs in the final WHERE.'],
    { orderMatters: true,
      explanation: 'Comparing a row to its own group\'s aggregate is one of the two things window functions were invented for. Day 10 rewrites this in half the lines.' }),

  ex('7.13', 9, 'medium',
    'CTE feeding a second aggregation',
    'Return `orders_per_customer` and `customers` — a distribution of how many completed orders customers place. Order by orders_per_customer.',
    ['orders'], ['cte', 'group-by'],
    `WITH per_customer AS (
  SELECT customer_id, COUNT(*) AS order_count
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
)
SELECT order_count AS orders_per_customer, COUNT(*) AS customers
FROM per_customer
GROUP BY order_count
ORDER BY orders_per_customer`,
    ['Aggregate once to get a number per customer, then aggregate again to count customers.',
      'This "group the groups" pattern needs two levels — you cannot do it in one.'],
    { orderMatters: true }),

  ex('7.14', 9, 'hard',
    'Cohort sizes',
    'Return `cohort_month` and `customers` — the number of customers whose first completed order fell in that month. Chronological.',
    ['orders'], ['cte', 'cohort', 'date-trunc'],
    `WITH first_order AS (
  SELECT customer_id, MIN(order_date) AS first_date
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
)
SELECT DATE_TRUNC(first_date, MONTH) AS cohort_month, COUNT(*) AS customers
FROM first_order
GROUP BY cohort_month
ORDER BY cohort_month`,
    ['A cohort is defined by a *first* event, so start with MIN per customer.',
      'Then truncate that first date to a month and count.'],
    { orderMatters: true }),

  ex('7.15', 9, 'hard',
    'Cohort activity matrix',
    'Build the cohort table: `cohort_month`, `month_number` (months since first order) and `customers`. Order by cohort_month then month_number, limit 40.',
    ['orders'], ['chained-cte', 'cohort', 'date-diff'],
    `WITH cohort AS (
  SELECT customer_id, DATE_TRUNC(MIN(order_date), MONTH) AS cohort_month
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
),
activity AS (
  SELECT c.cohort_month,
         DATE_DIFF(DATE_TRUNC(o.order_date, MONTH), c.cohort_month, MONTH) AS month_number,
         o.customer_id
  FROM orders o
  JOIN cohort c USING (customer_id)
  WHERE o.status = 'completed'
)
SELECT cohort_month, month_number, COUNT(DISTINCT customer_id) AS customers
FROM activity
GROUP BY cohort_month, month_number
ORDER BY cohort_month, month_number
LIMIT 40`,
    ['Three steps: define the cohort, tag every order with its month offset, then count.',
      'DATE_DIFF on two truncated months gives the offset.',
      'COUNT DISTINCT because a customer can order twice in the same month.'],
    { orderMatters: true,
      explanation: 'This is the shape every retention chart is built from. Naming the steps `cohort` and `activity` is not decoration — it is what lets you debug the middle of it when the numbers look wrong.' }),

  ex('7.16', 9, 'hard',
    'Retention rate from the matrix',
    'Extend the cohort matrix with `retention_rate` — customers in that month divided by the cohort\'s month-0 size. Order by cohort_month then month_number, limit 40.',
    ['orders'], ['chained-cte', 'cohort', 'retention'],
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
),
sizes AS (
  SELECT cohort_month, customers AS cohort_size
  FROM matrix WHERE month_number = 0
)
SELECT m.cohort_month, m.month_number, m.customers,
       SAFE_DIVIDE(m.customers, s.cohort_size) AS retention_rate
FROM matrix m
JOIN sizes s USING (cohort_month)
ORDER BY m.cohort_month, m.month_number
LIMIT 40`,
    ['Four CTEs, each doing one thing.',
      'The cohort size is just the month_number = 0 row of the matrix.',
      'Join the sizes back onto the matrix to compute the rate.'],
    { orderMatters: true }),

  ex('7.17', 9, 'hard',
    'Customers who bought in both halves',
    'Return `customers` — the count of customers with a completed order in both H1 and H2 of 2024 — using two CTEs and an inner join.',
    ['orders'], ['cte', 'inner-join', 'distinct'],
    `WITH h1 AS (
  SELECT DISTINCT customer_id FROM orders
  WHERE status = 'completed' AND order_date < '2024-07-01'
),
h2 AS (
  SELECT DISTINCT customer_id FROM orders
  WHERE status = 'completed' AND order_date >= '2024-07-01'
)
SELECT COUNT(*) AS customers
FROM h1 JOIN h2 USING (customer_id)`,
    ['Two distinct customer lists, one per half.',
      'An inner join between them keeps only customers in both.']),

  ex('7.18', 9, 'hard',
    'Products above their category average',
    'Return `product_name`, `category`, `list_price` and `category_avg` for products priced above their own category average. Order by category then product_name.',
    ['products'], ['cte', 'inner-join', 'correlated-subquery'],
    `WITH cat AS (
  SELECT category, AVG(list_price) AS category_avg
  FROM products
  GROUP BY category
)
SELECT p.product_name, p.category, p.list_price, c.category_avg
FROM products p
JOIN cat c USING (category)
WHERE p.list_price > c.category_avg
ORDER BY p.category, p.product_name`,
    ['Compute the per-category average once in a CTE.',
      'Join it back to the rows and compare.',
      'This is the "compare a row to its group" pattern again.'],
    { orderMatters: true }),

  ex('7.19', 9, 'hard',
    'MRR movement setup',
    'Using CTEs, return `month`, `new_mrr` and `churned_mrr` for 2024. New MRR is the sum of mrr for subscriptions started that month; churned is the sum for those cancelled that month. Chronological.',
    ['subscriptions'], ['chained-cte', 'mrr', 'date-trunc'],
    `WITH starts AS (
  SELECT DATE_TRUNC(started_at, MONTH) AS month, SUM(mrr) AS new_mrr
  FROM subscriptions
  GROUP BY month
),
churn AS (
  SELECT DATE_TRUNC(canceled_at, MONTH) AS month, SUM(mrr) AS churned_mrr
  FROM subscriptions
  WHERE canceled_at IS NOT NULL
  GROUP BY month
),
months AS (
  SELECT DISTINCT month_start AS month FROM date_dim
)
SELECT m.month,
       COALESCE(s.new_mrr, 0) AS new_mrr,
       COALESCE(c.churned_mrr, 0) AS churned_mrr
FROM months m
LEFT JOIN starts s USING (month)
LEFT JOIN churn c USING (month)
ORDER BY m.month`,
    ['Aggregate starts and cancellations separately — they are different events.',
      'Use a month spine so every month appears even with no churn.',
      'LEFT JOIN both onto the spine and COALESCE the gaps.'],
    { orderMatters: true }),

  ex('7.20', 9, 'expert',
    'Funnel with CTEs',
    'Build the GA4 funnel as one row: `sessions`, `viewed_item`, `added_to_cart`, `checked_out`, `purchased` — counting distinct sessions reaching each step. Use a CTE per step or conditional aggregation.',
    ['ga4_events'], ['cte', 'funnel', 'countif', 'distinct'],
    `WITH steps AS (
  SELECT ga_session_id,
         MAX(CASE WHEN event_name = 'session_start'  THEN 1 ELSE 0 END) AS s1,
         MAX(CASE WHEN event_name = 'view_item'      THEN 1 ELSE 0 END) AS s2,
         MAX(CASE WHEN event_name = 'add_to_cart'    THEN 1 ELSE 0 END) AS s3,
         MAX(CASE WHEN event_name = 'begin_checkout' THEN 1 ELSE 0 END) AS s4,
         MAX(CASE WHEN event_name = 'purchase'       THEN 1 ELSE 0 END) AS s5
  FROM ga4_events
  GROUP BY ga_session_id
)
SELECT SUM(s1) AS sessions,
       SUM(s2) AS viewed_item,
       SUM(s3) AS added_to_cart,
       SUM(s4) AS checked_out,
       SUM(s5) AS purchased
FROM steps`,
    ['Collapse the event stream to one row per session first, flagging which steps it reached.',
      'MAX over a 0/1 flag answers "did this session ever do X?".',
      'Then sum the flags.'],
    { explanation: 'Flattening to one row per session before counting is what makes this a *session* funnel rather than an *event* funnel. A session with three add_to_cart events should count once, and this shape guarantees it.' }),

  ex('7.21', 9, 'expert',
    'Funnel drop-off rates',
    'Extend the funnel with step-to-step conversion rates: `view_rate`, `cart_rate`, `checkout_rate`, `purchase_rate`.',
    ['ga4_events'], ['cte', 'funnel', 'rate-metrics'],
    `WITH steps AS (
  SELECT ga_session_id,
         MAX(CASE WHEN event_name = 'session_start'  THEN 1 ELSE 0 END) AS s1,
         MAX(CASE WHEN event_name = 'view_item'      THEN 1 ELSE 0 END) AS s2,
         MAX(CASE WHEN event_name = 'add_to_cart'    THEN 1 ELSE 0 END) AS s3,
         MAX(CASE WHEN event_name = 'begin_checkout' THEN 1 ELSE 0 END) AS s4,
         MAX(CASE WHEN event_name = 'purchase'       THEN 1 ELSE 0 END) AS s5
  FROM ga4_events
  GROUP BY ga_session_id
),
totals AS (
  SELECT SUM(s1) AS sessions, SUM(s2) AS viewed, SUM(s3) AS carted,
         SUM(s4) AS checked_out, SUM(s5) AS purchased
  FROM steps
)
SELECT sessions, viewed, carted, checked_out, purchased,
       SAFE_DIVIDE(viewed, sessions)        AS view_rate,
       SAFE_DIVIDE(carted, viewed)          AS cart_rate,
       SAFE_DIVIDE(checked_out, carted)     AS checkout_rate,
       SAFE_DIVIDE(purchased, checked_out)  AS purchase_rate
FROM totals`,
    ['Wrap the totals in their own CTE so you can reference each one by name.',
      'Each rate divides a step by the step immediately before it.'],
    { explanation: 'Step-to-step rates localise the problem. A funnel reported only against the top makes every step after the leaky one look broken too, which sends you optimising the wrong page.' }),

  ex('7.22', 9, 'expert',
    'The readable multi-CTE report',
    'Per channel, return `channel`, `spend`, `customers`, `revenue`, `cac` and `roas`. Spend comes from `ad_spend_daily` mapped to channel, customers and revenue from orders joined to customers. Order by roas descending.',
    ['ad_spend_daily', 'orders', 'customers'], ['chained-cte', 'cac', 'roas', 'left-join'],
    `WITH spend AS (
  SELECT channel, SUM(spend) AS spend
  FROM ad_spend_daily
  GROUP BY channel
),
outcomes AS (
  SELECT c.first_touch_channel AS channel,
         COUNT(DISTINCT o.customer_id) AS customers,
         SUM(o.gross_revenue) AS revenue
  FROM orders o
  JOIN customers c ON c.customer_id = o.customer_id
  WHERE o.status = 'completed'
  GROUP BY c.first_touch_channel
)
SELECT s.channel,
       s.spend,
       COALESCE(o.customers, 0) AS customers,
       COALESCE(o.revenue, 0) AS revenue,
       SAFE_DIVIDE(s.spend, o.customers) AS cac,
       SAFE_DIVIDE(o.revenue, s.spend) AS roas
FROM spend s
LEFT JOIN outcomes o USING (channel)
ORDER BY roas DESC, s.channel`,
    ['Two CTEs at the same grain (channel), then one join.',
      'CAC is spend per acquired customer; ROAS is revenue per unit of spend.',
      'Name each CTE for what it *is*, not for what it does.'],
    { orderMatters: true,
      explanation: 'Only Paid Search and Paid Social appear, because those are the only channels with spend in `ad_spend_daily`. That is honest: you cannot compute CAC for a channel you do not pay for, and pretending otherwise by dividing by zero is worse than showing fewer rows.' }),
];
