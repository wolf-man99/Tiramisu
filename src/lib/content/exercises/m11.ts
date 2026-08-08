import { ex } from './helpers';

/**
 * Module 11 — Marketing analytics (day 13). The heart of the platform.
 *
 * 30 exercises. Every other module exists to make this one possible. Each metric is
 * derived from first principles, implemented, and then stress-tested against the edge
 * case that breaks the naive version — because the difference between a marketer who
 * "knows SQL" and one who can be trusted with a number is entirely in the edge cases.
 */
export const M11 = [
  // ── efficiency metrics ──
  ex('11.1', 13, 'medium',
    'CTR, CPC and CPM per platform',
    'From `ad_spend_daily`, return `platform`, `spend`, `impressions`, `clicks`, `ctr`, `cpc` and `cpm`. Order by spend descending.',
    ['ad_spend_daily'], ['rate-metrics', 'safe-divide', 'group-by'],
    `SELECT platform,
       SUM(spend) AS spend,
       SUM(impressions) AS impressions,
       SUM(clicks) AS clicks,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
       SAFE_DIVIDE(SUM(spend), SUM(clicks)) AS cpc,
       SAFE_DIVIDE(SUM(spend), SUM(impressions)) * 1000 AS cpm
FROM ad_spend_daily
GROUP BY platform
ORDER BY spend DESC`,
    ['Three rates, each a ratio of sums.',
      'CPM is per *thousand* impressions, so multiply by 1000.'],
    { orderMatters: true }),

  ex('11.2', 13, 'medium',
    'Blended CAC',
    'Return `total_spend`, `new_customers` and `blended_cac` — total paid spend divided by all customers acquired in 2024.',
    ['ad_spend_daily', 'customers'], ['cac', 'safe-divide'],
    `SELECT (SELECT SUM(spend) FROM ad_spend_daily) AS total_spend,
       (SELECT COUNT(*) FROM customers) AS new_customers,
       SAFE_DIVIDE((SELECT SUM(spend) FROM ad_spend_daily),
                   (SELECT COUNT(*) FROM customers)) AS blended_cac`,
    ['Blended CAC divides *all* paid spend by *all* new customers.',
      'Two scalar subqueries and their ratio.'],
    {
      explanation:
        'Blended CAC is the honest headline number and a terrible optimisation target. It charges paid media for the customers organic and direct brought in for free, so it always looks worse than any channel-level CAC — and it is the number your CFO will quote back at you.',
    }),

  ex('11.3', 13, 'hard',
    'Paid-only CAC',
    'Return `paid_spend`, `paid_customers` and `paid_cac`, counting only customers whose first touch was Paid Search, Paid Social or Display.',
    ['ad_spend_daily', 'customers'], ['cac', 'safe-divide', 'in'],
    `SELECT (SELECT SUM(spend) FROM ad_spend_daily) AS paid_spend,
       (SELECT COUNT(*) FROM customers
        WHERE first_touch_channel IN ('Paid Search', 'Paid Social', 'Display')) AS paid_customers,
       SAFE_DIVIDE((SELECT SUM(spend) FROM ad_spend_daily),
                   (SELECT COUNT(*) FROM customers
                    WHERE first_touch_channel IN ('Paid Search', 'Paid Social', 'Display'))) AS paid_cac`,
    ['Same spend, smaller denominator.',
      'Restrict the customer count to paid-sourced first touches.'],
    { explanation: 'Paid CAC is higher than blended CAC, always. Which one to publish depends entirely on the decision: blended for "can this business work", paid for "should I spend the next dollar".' }),

  ex('11.4', 13, 'hard',
    'CAC by channel',
    'Return `channel`, `spend`, `customers` and `cac`, joining `ad_spend_daily` spend to first-touch customer counts. Order by cac ascending.',
    ['ad_spend_daily', 'customers'], ['cac', 'chained-cte', 'left-join'],
    `WITH spend AS (
  SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel
),
acquired AS (
  SELECT first_touch_channel AS channel, COUNT(*) AS customers
  FROM customers GROUP BY first_touch_channel
)
SELECT s.channel, s.spend, COALESCE(a.customers, 0) AS customers,
       SAFE_DIVIDE(s.spend, a.customers) AS cac
FROM spend s
LEFT JOIN acquired a USING (channel)
ORDER BY cac, s.channel`,
    ['Two CTEs at channel grain, then a join.',
      'Only channels with spend can have a CAC — organic has no cost to divide.'],
    { orderMatters: true }),

  ex('11.5', 13, 'medium',
    'ROAS: platform-reported vs warehouse truth',
    'Return `platform`, `spend`, `platform_revenue`, `platform_roas` from `ad_spend_daily`. Order by platform_roas descending.',
    ['ad_spend_daily'], ['roas', 'safe-divide'],
    `SELECT platform,
       SUM(spend) AS spend,
       SUM(platform_revenue) AS platform_revenue,
       SAFE_DIVIDE(SUM(platform_revenue), SUM(spend)) AS platform_roas
FROM ad_spend_daily
GROUP BY platform
ORDER BY platform_roas DESC`,
    ['This is what each ad platform claims it earned you.',
      'LinkedIn reports leads, not revenue, so its platform_revenue is zero.'],
    { orderMatters: true,
      trap: 'Summing platform-reported revenue across platforms double-counts every conversion both platforms claim.' }),

  ex('11.6', 13, 'hard',
    'The attribution gap',
    'Compare what the platforms claim to what the warehouse can see. Return `platform_reported_revenue`, `warehouse_attributed_revenue` and `gap_ratio`.',
    ['ad_spend_daily', 'orders'], ['roas', 'attribution'],
    `SELECT
  (SELECT SUM(platform_revenue) FROM ad_spend_daily) AS platform_reported_revenue,
  (SELECT SUM(gross_revenue) FROM orders
   WHERE status = 'completed' AND campaign_id IS NOT NULL) AS warehouse_attributed_revenue,
  SAFE_DIVIDE(
    (SELECT SUM(platform_revenue) FROM ad_spend_daily),
    (SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed' AND campaign_id IS NOT NULL)
  ) AS gap_ratio`,
    ['Each platform counts conversions on its own attribution window.',
      'The warehouse counts an order once, against one campaign.',
      'The ratio between them is the size of the disagreement.'],
    {
      explanation:
        'Platforms overclaim, structurally and by design: Meta counts a 7-day-click/1-day-view purchase, Google counts last-click, and they both count the same order. The warehouse number is lower and is the one to plan with. The gap is not a bug to fix — it is a fact to explain to whoever asks why the dashboard disagrees with Ads Manager.',
    }),

  ex('11.7', 13, 'medium',
    'AOV, mean and median',
    'Return `mean_aov` and `median_aov` for completed orders — and notice the difference.',
    ['orders'], ['aov', 'avg'],
    `SELECT AVG(gross_revenue) AS mean_aov,
       PERCENTILE_CONT(gross_revenue, 0.5) AS median_aov
FROM orders
WHERE status = 'completed'`,
    ['AVG is the mean; PERCENTILE_CONT at 0.5 is the median.',
      'Order values are right-skewed, so the mean sits above the median.'],
    { explanation: 'The mean is pulled up by a handful of large orders. When someone asks "what does a typical customer spend", the median is the honest answer and the mean is the flattering one.' }),

  ex('11.8', 13, 'medium',
    'AOV by channel',
    'Return `channel`, `orders`, `revenue` and `aov` for completed orders. Order by aov descending.',
    ['orders'], ['aov', 'group-by'],
    `SELECT channel, COUNT(*) AS orders, SUM(gross_revenue) AS revenue,
       SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)) AS aov
FROM orders
WHERE status = 'completed'
GROUP BY channel
ORDER BY aov DESC, channel`,
    ['AOV is revenue over order count, per group.',
      'SUM(gross_revenue) / COUNT(*) — sums first, then divide.'],
    { orderMatters: true }),

  // ── LTV ──
  ex('11.9', 13, 'medium',
    'Historical LTV per customer',
    'Return `customer_id`, `orders_count` and `lifetime_revenue` for the 20 highest-value customers.',
    ['customer_ltv'], ['ltv'],
    `SELECT customer_id, orders_count, lifetime_revenue
FROM customer_ltv
ORDER BY lifetime_revenue DESC, customer_id
LIMIT 20`,
    ['The `customer_ltv` view already aggregates completed orders per customer.',
      'Historical LTV is simply the sum of what they have spent so far.'],
    { orderMatters: true }),

  ex('11.10', 13, 'hard',
    'LTV by acquisition channel',
    'Return `first_touch_channel`, `customers`, `avg_ltv` and `total_ltv`. Order by avg_ltv descending.',
    ['customer_ltv'], ['ltv', 'group-by'],
    `SELECT first_touch_channel, COUNT(*) AS customers,
       AVG(lifetime_revenue) AS avg_ltv,
       SUM(lifetime_revenue) AS total_ltv
FROM customer_ltv
GROUP BY first_touch_channel
ORDER BY avg_ltv DESC, first_touch_channel`,
    ['Group the view by the acquisition channel.',
      'Report both the average and the total — they rank channels differently.'],
    { orderMatters: true,
      explanation: 'A channel with high average LTV and few customers is a niche worth expanding; high total and low average is a volume channel. Reporting only one of the two hides half the decision.' }),

  ex('11.11', 13, 'expert',
    'LTV:CAC by channel',
    'The ratio that decides budget. Return `channel`, `cac`, `avg_ltv` and `ltv_cac_ratio` for paid channels. Order by ltv_cac_ratio descending.',
    ['ad_spend_daily', 'customer_ltv'], ['ltv', 'cac', 'chained-cte'],
    `WITH spend AS (
  SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel
),
value AS (
  SELECT first_touch_channel AS channel,
         COUNT(*) AS customers,
         AVG(lifetime_revenue) AS avg_ltv
  FROM customer_ltv GROUP BY first_touch_channel
)
SELECT s.channel,
       SAFE_DIVIDE(s.spend, v.customers) AS cac,
       v.avg_ltv,
       SAFE_DIVIDE(v.avg_ltv, SAFE_DIVIDE(s.spend, v.customers)) AS ltv_cac_ratio
FROM spend s
JOIN value v USING (channel)
ORDER BY ltv_cac_ratio DESC, s.channel`,
    ['CAC per channel, average LTV per channel, then divide.',
      'The conventional healthy threshold is 3:1 — below that you are buying revenue you cannot afford.'],
    { orderMatters: true,
      explanation: 'This ratio uses *historical* LTV, so it understates every channel — customers acquired in December have had one month to spend. Comparing channels is fair only when their cohorts are the same age, which is why serious LTV work is always cohort-based.' }),

  ex('11.12', 13, 'expert',
    'Cohort LTV at a fixed age',
    'Fix the age problem. Return `cohort_month`, `customers` and `ltv_90d` — average revenue per customer within 90 days of their first order, for cohorts old enough to have 90 days. Chronological.',
    ['orders'], ['ltv', 'cohort', 'chained-cte', 'date-diff'],
    `WITH first_order AS (
  SELECT customer_id, MIN(order_date) AS first_date
  FROM orders WHERE status = 'completed' GROUP BY customer_id
),
windowed AS (
  SELECT f.customer_id,
         DATE_TRUNC(f.first_date, MONTH) AS cohort_month,
         SUM(CASE WHEN DATE_DIFF(o.order_date, f.first_date, DAY) <= 90
                  THEN o.gross_revenue ELSE 0 END) AS revenue_90d
  FROM first_order f
  JOIN orders o ON o.customer_id = f.customer_id AND o.status = 'completed'
  GROUP BY f.customer_id, cohort_month
)
SELECT cohort_month,
       COUNT(*) AS customers,
       AVG(revenue_90d) AS ltv_90d
FROM windowed
WHERE cohort_month <= '2024-09-01'
GROUP BY cohort_month
ORDER BY cohort_month`,
    ['Anchor every customer to their own first order date, then measure a fixed window from it.',
      'Exclude cohorts too young to have completed the window — otherwise they look terrible.',
      'The CASE inside SUM restricts to the 90-day window without dropping the customer.'],
    { orderMatters: true,
      explanation: 'Fixed-window cohort LTV is the only fair way to compare acquisition months. Truncating the young cohorts is not cheating — including them is, because a 30-day-old cohort cannot have 90-day revenue.' }),

  ex('11.13', 13, 'hard',
    'Payback period',
    'Return `channel`, `cac`, `avg_monthly_revenue_per_customer` and `payback_months`. Order by payback_months ascending.',
    ['ad_spend_daily', 'customer_ltv'], ['cac', 'ltv', 'chained-cte'],
    `WITH spend AS (
  SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel
),
value AS (
  SELECT first_touch_channel AS channel,
         COUNT(*) AS customers,
         AVG(lifetime_revenue) / 12 AS avg_monthly_revenue
  FROM customer_ltv GROUP BY first_touch_channel
)
SELECT s.channel,
       SAFE_DIVIDE(s.spend, v.customers) AS cac,
       v.avg_monthly_revenue AS avg_monthly_revenue_per_customer,
       SAFE_DIVIDE(SAFE_DIVIDE(s.spend, v.customers), v.avg_monthly_revenue) AS payback_months
FROM spend s
JOIN value v USING (channel)
ORDER BY payback_months, s.channel`,
    ['Payback is CAC divided by monthly revenue per customer.',
      'Spread annual revenue over 12 months for a monthly figure.'],
    { orderMatters: true,
      explanation: 'Payback period is the metric that decides whether you can grow without financing. A 3-month payback funds itself; an 18-month payback means every new customer is a loan you are taking out.' }),

  // ── retention & churn ──
  ex('11.14', 13, 'hard',
    'Day-1, day-7 and day-30 retention',
    'From `product_events`, return `d1`, `d7` and `d30` — the share of activated users who returned within 1, 7 and 30 days of activating.',
    ['product_events'], ['retention', 'chained-cte', 'date-diff'],
    `WITH activation AS (
  SELECT user_id, MIN(DATE(event_time)) AS activated_on
  FROM product_events
  WHERE event_name = 'activated'
  GROUP BY user_id
),
returns AS (
  SELECT a.user_id,
         MAX(CASE WHEN DATE_DIFF(DATE(p.event_time), a.activated_on, DAY) BETWEEN 1 AND 1 THEN 1 ELSE 0 END) AS r1,
         MAX(CASE WHEN DATE_DIFF(DATE(p.event_time), a.activated_on, DAY) BETWEEN 1 AND 7 THEN 1 ELSE 0 END) AS r7,
         MAX(CASE WHEN DATE_DIFF(DATE(p.event_time), a.activated_on, DAY) BETWEEN 1 AND 30 THEN 1 ELSE 0 END) AS r30
  FROM activation a
  JOIN product_events p ON p.user_id = a.user_id
  GROUP BY a.user_id
)
SELECT SAFE_DIVIDE(SUM(r1), COUNT(*)) AS d1,
       SAFE_DIVIDE(SUM(r7), COUNT(*)) AS d7,
       SAFE_DIVIDE(SUM(r30), COUNT(*)) AS d30
FROM returns`,
    ['Anchor on each user\'s activation date.',
      'A "return" is any event on a later day — so the day-offset range starts at 1, not 0.',
      'MAX over a flag answers "did they ever return in this window?".'],
    { explanation: 'Starting the window at day 1 rather than day 0 is the whole definition. Include day 0 and every user "retains", because activating is itself an event.' }),

  ex('11.15', 13, 'hard',
    'Monthly logo churn',
    'Return `month`, `active_start`, `churned` and `churn_rate` for subscriptions in 2024. Chronological.',
    ['subscriptions', 'date_dim'], ['churn', 'chained-cte'],
    `WITH months AS (
  SELECT DISTINCT month_start AS month FROM date_dim
),
active_at_start AS (
  SELECT m.month, COUNT(*) AS active_start
  FROM months m
  JOIN subscriptions s
    ON s.started_at < m.month
   AND (s.canceled_at IS NULL OR s.canceled_at >= m.month)
  GROUP BY m.month
),
churned AS (
  SELECT DATE_TRUNC(canceled_at, MONTH) AS month, COUNT(*) AS churned
  FROM subscriptions WHERE canceled_at IS NOT NULL
  GROUP BY month
)
SELECT a.month, a.active_start, COALESCE(c.churned, 0) AS churned,
       SAFE_DIVIDE(c.churned, a.active_start) AS churn_rate
FROM active_at_start a
LEFT JOIN churned c USING (month)
ORDER BY a.month`,
    ['A subscription is active at the start of a month if it started before it and had not cancelled by then.',
      'Churn rate is cancellations that month over the population at the start of the month.',
      'Using end-of-month as the denominator understates churn — the churned ones are already gone.'],
    { orderMatters: true,
      trap: 'Dividing churned by the *end*-of-period count. The denominator must be the population that had the opportunity to churn.' }),

  ex('11.16', 13, 'hard',
    'Revenue churn vs logo churn',
    'Return `month`, `churned_logos` and `churned_mrr` for 2024, so you can see they tell different stories. Chronological.',
    ['subscriptions'], ['churn', 'mrr'],
    `SELECT DATE_TRUNC(canceled_at, MONTH) AS month,
       COUNT(*) AS churned_logos,
       SUM(mrr) AS churned_mrr
FROM subscriptions
WHERE canceled_at IS NOT NULL
GROUP BY month
ORDER BY month`,
    ['Count subscriptions for logo churn, sum MRR for revenue churn.',
      'One large account leaving can dwarf ten small ones.'],
    { orderMatters: true,
      explanation: 'Logo churn measures product-market fit; revenue churn measures the P&L. A month where you lose many small accounts and no big ones looks like a crisis on one metric and a rounding error on the other.' }),

  ex('11.17', 13, 'expert',
    'The MRR bridge',
    'Return `month`, `new_mrr`, `churned_mrr` and `net_new_mrr` for 2024, using a month spine so every month appears. Chronological.',
    ['subscriptions', 'date_dim'], ['mrr', 'chained-cte', 'date-spine'],
    `WITH months AS (
  SELECT DISTINCT month_start AS month FROM date_dim
),
new_mrr AS (
  SELECT DATE_TRUNC(started_at, MONTH) AS month, SUM(mrr) AS new_mrr
  FROM subscriptions GROUP BY month
),
churn_mrr AS (
  SELECT DATE_TRUNC(canceled_at, MONTH) AS month, SUM(mrr) AS churned_mrr
  FROM subscriptions WHERE canceled_at IS NOT NULL GROUP BY month
)
SELECT m.month,
       COALESCE(n.new_mrr, 0) AS new_mrr,
       COALESCE(c.churned_mrr, 0) AS churned_mrr,
       COALESCE(n.new_mrr, 0) - COALESCE(c.churned_mrr, 0) AS net_new_mrr
FROM months m
LEFT JOIN new_mrr n USING (month)
LEFT JOIN churn_mrr c USING (month)
ORDER BY m.month`,
    ['New and churned MRR are different events on different dates — aggregate them separately.',
      'A month spine guarantees months with no churn still appear.',
      'Net new is simply new minus churned.'],
    { orderMatters: true,
      explanation: 'A full MRR bridge also splits expansion, contraction and reactivation. This warehouse has no plan-change history, so those three are out of reach — and saying so is better than inventing them.' }),

  ex('11.18', 13, 'hard',
    'Net revenue retention',
    'Return `starting_mrr`, `churned_mrr` and `nrr` for subscriptions active at the start of 2024-07-01, measured against their status at year end.',
    ['subscriptions'], ['churn', 'mrr'],
    `WITH cohort AS (
  SELECT subscription_id, mrr, canceled_at
  FROM subscriptions
  WHERE started_at < '2024-07-01'
    AND (canceled_at IS NULL OR canceled_at >= '2024-07-01')
)
SELECT SUM(mrr) AS starting_mrr,
       SUM(CASE WHEN canceled_at IS NOT NULL AND canceled_at <= '2024-12-31' THEN mrr ELSE 0 END) AS churned_mrr,
       SAFE_DIVIDE(
         SUM(mrr) - SUM(CASE WHEN canceled_at IS NOT NULL AND canceled_at <= '2024-12-31' THEN mrr ELSE 0 END),
         SUM(mrr)
       ) AS nrr
FROM cohort`,
    ['Fix a cohort at a point in time, then measure what is left of it later.',
      'NRR above 100% requires expansion revenue, which this dataset does not model — so expect a number below 1.'],
    { explanation: 'Real NRR includes upgrades, which is how SaaS companies report figures above 100%. Without plan-change history the honest ceiling here is 1.0, and claiming otherwise would be fiction.' }),

  // ── funnel & activation ──
  ex('11.19', 13, 'medium',
    'Signup conversion rate',
    'Return `sessions`, `signups` and `signup_rate` from `ga4_events`, excluding nothing.',
    ['ga4_events'], ['funnel', 'rate-metrics'],
    `SELECT COUNTIF(event_name = 'session_start') AS sessions,
       COUNTIF(event_name = 'sign_up') AS signups,
       SAFE_DIVIDE(COUNTIF(event_name = 'sign_up'), COUNTIF(event_name = 'session_start')) AS signup_rate
FROM ga4_events`,
    ['Two COUNTIFs and their ratio.',
      'The denominator is session_start events; the numerator is sign_up events.']),

  ex('11.20', 13, 'hard',
    'Activation rate and time to activate',
    'Return `signed_up`, `activated`, `activation_rate` and `avg_days_to_activate` from `product_events` and `customers`.',
    ['product_events', 'customers'], ['activation', 'date-diff', 'chained-cte'],
    `WITH activation AS (
  SELECT user_id, MIN(DATE(event_time)) AS activated_on
  FROM product_events WHERE event_name = 'activated'
  GROUP BY user_id
)
SELECT COUNT(DISTINCT c.customer_id) AS signed_up,
       COUNT(DISTINCT a.user_id) AS activated,
       SAFE_DIVIDE(COUNT(DISTINCT a.user_id), COUNT(DISTINCT c.customer_id)) AS activation_rate,
       AVG(DATE_DIFF(a.activated_on, c.signup_date, DAY)) AS avg_days_to_activate
FROM customers c
LEFT JOIN activation a ON a.user_id = c.customer_id
WHERE c.is_b2b = 1`,
    ['LEFT JOIN so unactivated customers stay in the denominator.',
      'AVG over DATE_DIFF skips the NULLs from unactivated users automatically.'],
    { explanation: 'Activation rate is the highest-leverage number in SaaS: it is upstream of retention, expansion and referral, and it is the only one you can move in a week.' }),

  ex('11.21', 13, 'hard',
    'Funnel drop-off by channel',
    'Return `channel_group`, `sessions`, `converted` and `cvr` from `ga4_sessions`, excluding QA traffic and keeping channels with at least 200 sessions. Order by cvr descending.',
    ['ga4_sessions'], ['funnel', 'rate-metrics', 'having'],
    `SELECT channel_group,
       COUNT(*) AS sessions,
       SUM(converted) AS converted,
       SAFE_DIVIDE(SUM(converted), COUNT(*)) AS cvr
FROM ga4_sessions
WHERE source != 'internal-qa'
GROUP BY channel_group
HAVING COUNT(*) >= 200
ORDER BY cvr DESC, channel_group`,
    ['Filter QA traffic, group by channel, require a minimum volume.',
      'The volume floor is a property of the group, so it belongs in HAVING.'],
    { orderMatters: true }),

  ex('11.22', 13, 'hard',
    'Top converting landing pages',
    'Return `landing_page`, `sessions`, `conversions`, `cvr` and `revenue_per_session` for pages with at least 150 sessions. Order by cvr descending.',
    ['ga4_sessions'], ['funnel', 'rate-metrics', 'having'],
    `SELECT landing_page,
       COUNT(*) AS sessions,
       SUM(converted) AS conversions,
       SAFE_DIVIDE(SUM(converted), COUNT(*)) AS cvr,
       SAFE_DIVIDE(SUM(revenue), COUNT(*)) AS revenue_per_session
FROM ga4_sessions
WHERE source != 'internal-qa'
GROUP BY landing_page
HAVING COUNT(*) >= 150
ORDER BY cvr DESC, landing_page`,
    ['Revenue per session is the metric that ranks pages honestly — it combines rate and value.',
      'Group by landing_page, then HAVING COUNT(*) >= 150 before sorting by cvr.'],
    { orderMatters: true,
      explanation: 'A page with a 6% conversion rate on £20 orders loses to one with 3% on £90 orders. Ranking landing pages by CVR alone systematically favours the cheap ones.' }),

  // ── attribution ──
  ex('11.23', 13, 'hard',
    'First-touch vs last-touch attribution',
    'Return `channel`, `first_touch_value` and `last_touch_value` from converted journeys. Order by first_touch_value descending.',
    ['attribution_touchpoints'], ['attribution', 'conditional-aggregation'],
    `SELECT channel,
       SUM(CASE WHEN touch_position = 1 THEN conversion_value ELSE 0 END) AS first_touch_value,
       SUM(CASE WHEN touch_position = journey_length THEN conversion_value ELSE 0 END) AS last_touch_value
FROM attribution_touchpoints
WHERE converted = 1
GROUP BY channel
ORDER BY first_touch_value DESC, channel`,
    ['Position 1 is the first touch; position = journey_length is the last.',
      'Conditional aggregation gives both models in one pass.'],
    { orderMatters: true,
      explanation: 'The two columns disagree sharply, and neither is "right". First touch flatters discovery channels; last touch flatters closing channels. The gap between the columns is the size of the argument you are about to have with the paid social team.' }),

  ex('11.24', 13, 'expert',
    'Four attribution models side by side',
    'Return `channel`, `first_touch`, `last_touch`, `linear` and `position_based` (40/20/40) credit from converted journeys. Order by linear descending.',
    ['attribution_touchpoints'], ['attribution', 'conditional-aggregation'],
    `SELECT channel,
       SUM(CASE WHEN touch_position = 1 THEN conversion_value ELSE 0 END) AS first_touch,
       SUM(CASE WHEN touch_position = journey_length THEN conversion_value ELSE 0 END) AS last_touch,
       SUM(SAFE_DIVIDE(conversion_value, journey_length)) AS linear,
       SUM(
         CASE
           WHEN journey_length = 1 THEN conversion_value
           WHEN touch_position = 1 OR touch_position = journey_length THEN conversion_value * 0.4
           ELSE SAFE_DIVIDE(conversion_value * 0.2, journey_length - 2)
         END
       ) AS position_based
FROM attribution_touchpoints
WHERE converted = 1
GROUP BY channel
ORDER BY linear DESC, channel`,
    ['Linear splits the value evenly across every touch in the journey.',
      'Position-based gives 40% to first, 40% to last and shares 20% among the middle.',
      'A one-touch journey has to be special-cased or it loses value.'],
    { orderMatters: true,
      explanation: 'All four columns sum to roughly the same total — they redistribute the same revenue, they do not create it. Choosing a model is choosing whose contribution to believe, and it is a business decision dressed up as a technical one.' }),

  ex('11.25', 13, 'expert',
    'Time-decay attribution',
    'Return `channel` and `time_decay_value`, weighting each touch by how close it is to the conversion (weight = touch_position / sum of positions in the journey). Order by time_decay_value descending.',
    ['attribution_touchpoints'], ['attribution', 'percent-of-total'],
    `WITH weighted AS (
  SELECT channel,
         conversion_value * SAFE_DIVIDE(
           touch_position,
           SUM(touch_position) OVER (PARTITION BY user_pseudo_id)
         ) AS credit
  FROM attribution_touchpoints
  WHERE converted = 1
)
SELECT channel, SUM(credit) AS time_decay_value
FROM weighted
GROUP BY channel
ORDER BY time_decay_value DESC, channel`,
    ['Each touch gets a weight proportional to its position, so later touches get more.',
      'The denominator is the sum of positions within the journey — a window function.',
      'A window function cannot be nested inside an aggregate, so compute the per-touch credit in a CTE first, then SUM it.'],
    { orderMatters: true }),

  ex('11.26', 13, 'hard',
    'Customer journey paths',
    'Return `path` and `conversions` — the 15 most common channel sequences among converted journeys.',
    ['attribution_touchpoints'], ['attribution', 'string-functions'],
    `WITH journeys AS (
  SELECT user_pseudo_id,
         STRING_AGG(channel, ' > ' ORDER BY touch_position) AS path
  FROM attribution_touchpoints
  WHERE converted = 1
  GROUP BY user_pseudo_id
)
SELECT path, COUNT(*) AS conversions
FROM journeys
GROUP BY path
ORDER BY conversions DESC, path
LIMIT 15`,
    ['Build one path string per journey, then count identical paths.',
      'The ORDER BY inside STRING_AGG is mandatory or the paths are meaningless.'],
    { orderMatters: true,
      explanation: 'Path analysis degrades fast: with 8 channels and journeys up to 7 touches, the long tail is enormous and the top paths are almost all single-touch. That is itself the finding — most conversions are simpler than the multi-touch narrative suggests.' }),

  // ── segmentation & profitability ──
  ex('11.27', 13, 'hard',
    'Most profitable cities',
    'Return `city`, `orders`, `revenue`, `gross_profit` and `margin_pct` for completed orders, cleaning the city values, keeping cities with at least 40 orders. Order by gross_profit descending.',
    ['orders'], ['segmentation', 'string-functions', 'having'],
    `SELECT INITCAP(TRIM(city)) AS city,
       COUNT(*) AS orders,
       SUM(gross_revenue) AS revenue,
       SUM(gross_revenue) - SUM(cogs) AS gross_profit,
       SAFE_DIVIDE(SUM(gross_revenue) - SUM(cogs), SUM(gross_revenue)) AS margin_pct
FROM orders
WHERE status = 'completed'
GROUP BY city
HAVING COUNT(*) >= 40
ORDER BY gross_profit DESC, city`,
    ['Clean the city in both SELECT and GROUP BY.',
      'Profit is revenue minus COGS; margin is profit over revenue.'],
    { orderMatters: true }),

  ex('11.28', 13, 'expert',
    'RFM segmentation',
    'Score customers on Recency, Frequency and Monetary using NTILE(4), then return `segment` and `customers`. Champions are R=4,F=4; At risk are R<=2 with F>=3; everyone else is Other. Order by customers descending.',
    ['customer_ltv'], ['segmentation', 'ntile', 'case-when'],
    `WITH scored AS (
  SELECT customer_id,
         NTILE(4) OVER (ORDER BY last_order_date) AS r,
         NTILE(4) OVER (ORDER BY orders_count) AS f,
         NTILE(4) OVER (ORDER BY lifetime_revenue) AS m
  FROM customer_ltv
  WHERE last_order_date IS NOT NULL
)
SELECT CASE
         WHEN r = 4 AND f = 4 THEN 'Champions'
         WHEN r <= 2 AND f >= 3 THEN 'At risk'
         ELSE 'Other'
       END AS segment,
       COUNT(*) AS customers
FROM scored
GROUP BY segment
ORDER BY customers DESC, segment`,
    ['NTILE(4) over each dimension gives a 1–4 score.',
      'Higher recency quartile means more recent, because the order is ascending on the date.',
      'Exclude customers who never ordered — they have no R, F or M.'],
    { orderMatters: true,
      explanation: '"At risk" — high frequency, low recency — is the most valuable segment in this table. They proved they like you and then stopped, which is the cheapest churn there is to reverse.' }),

  ex('11.29', 13, 'expert',
    'Which keyword generated the highest revenue',
    'The interview classic. Return `keyword_text`, `match_type`, `clicks`, `cost`, `conversion_value` and `roas` for the top 15 keywords by conversion value, with at least 30 clicks.',
    ['google_ads_keyword_daily', 'google_ads_keywords'], ['roas', 'inner-join', 'having'],
    `SELECT k.keyword_text,
       k.match_type,
       SUM(kd.clicks) AS clicks,
       SUM(kd.cost) AS cost,
       SUM(kd.conversion_value) AS conversion_value,
       SAFE_DIVIDE(SUM(kd.conversion_value), SUM(kd.cost)) AS roas
FROM google_ads_keyword_daily kd
JOIN google_ads_keywords k ON k.keyword_id = kd.keyword_id
GROUP BY k.keyword_text, k.match_type
HAVING SUM(kd.clicks) >= 30
ORDER BY conversion_value DESC, k.keyword_text
LIMIT 15`,
    ['Group by the keyword text and match type, not the id — the same text runs on several ids.',
      'The minimum-click filter keeps the ROAS meaningful.'],
    { orderMatters: true,
      explanation: 'Grouping by keyword_id would split the same keyword across ad groups and understate every one of them. Grouping by text and match type is what a stakeholder means when they say "which keyword".' }),

  ex('11.30', 13, 'expert',
    'The one-query executive summary',
    'Fourteen KPIs in one row: spend, revenue, orders, AOV, customers, blended CAC, ROAS, gross profit, margin, active subs, MRR, churned subs, sessions and site CVR.',
    ['ad_spend_daily', 'orders', 'customers', 'subscriptions', 'ga4_sessions'],
    ['cac', 'roas', 'aov', 'mrr', 'churn', 'rate-metrics'],
    `SELECT
  (SELECT SUM(spend) FROM ad_spend_daily) AS spend,
  (SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed') AS revenue,
  (SELECT COUNT(*) FROM orders WHERE status = 'completed') AS orders,
  (SELECT SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)) FROM orders WHERE status = 'completed') AS aov,
  (SELECT COUNT(*) FROM customers) AS customers,
  SAFE_DIVIDE((SELECT SUM(spend) FROM ad_spend_daily), (SELECT COUNT(*) FROM customers)) AS blended_cac,
  SAFE_DIVIDE((SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed'),
              (SELECT SUM(spend) FROM ad_spend_daily)) AS roas,
  (SELECT SUM(gross_revenue) - SUM(cogs) FROM orders WHERE status = 'completed') AS gross_profit,
  (SELECT SAFE_DIVIDE(SUM(gross_revenue) - SUM(cogs), SUM(gross_revenue))
   FROM orders WHERE status = 'completed') AS margin_pct,
  (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') AS active_subs,
  (SELECT SUM(mrr) FROM subscriptions WHERE status = 'active') AS mrr,
  (SELECT COUNT(*) FROM subscriptions WHERE canceled_at IS NOT NULL) AS churned_subs,
  (SELECT COUNT(*) FROM ga4_sessions WHERE source != 'internal-qa') AS sessions,
  (SELECT SAFE_DIVIDE(SUM(converted), COUNT(*)) FROM ga4_sessions WHERE source != 'internal-qa') AS site_cvr`,
    ['Fourteen scalar subqueries in one SELECT.',
      'Each one is a query you have already written in this module.',
      'Consistency of filters across the KPIs matters more than elegance — every revenue figure must use the same status filter.'],
    {
      explanation:
        'This is the query that gets scheduled and emailed every Monday. Its real difficulty is not SQL: it is making sure "revenue" means the same thing in the numerator of ROAS as it does in the AOV, so nobody can reconcile two of your own numbers against each other and find a gap.',
    }),
];
