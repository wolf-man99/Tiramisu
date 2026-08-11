import type { Project, ProjectTask, ChartSpec } from './types';

/**
 * Ten multi-task projects.
 *
 * A project differs from an exercise in that its tasks compose: each one produces a
 * panel of a real deliverable, and completing all of them leaves the learner holding
 * something they could send. Tasks with a `chart` render the learner's own result set
 * in the project's live dashboard preview.
 */

const t = (
  id: string,
  title: string,
  brief: string,
  solution: string,
  hints: string[],
  extra: Partial<ProjectTask> = {},
): ProjectTask => ({ id, title, brief, solution: solution.trim(), hints, ...extra });

const chart = (type: ChartSpec['type'], x: number, y: number | number[], title: string): ChartSpec =>
  ({ type, x, y, title });

export const PROJECTS: Project[] = [
  {
    slug: 'google-ads-audit',
    index: 1,
    title: 'Audit a Google Ads account',
    subtitle: 'Find the waste, quantify it, and say what to do about it',
    scenario:
      'You have inherited a Google Ads account nobody has looked at properly in six months. ' +
      'The CMO wants to know, by Friday, where the money is going and how much of it is wasted.',
    deliverable: 'Six queries and a one-paragraph recommendation on where to cut and where to reinvest.',
    difficulty: 'medium',
    unlockDay: 6,
    tables: ['google_ads_campaigns', 'google_ads_daily', 'google_ads_keywords', 'google_ads_keyword_daily'],
    badge: 'account-auditor',
    tasks: [
      t('structure', 'Account structure',
        'How is the account organised? Return `channel_type`, `campaigns`, `spend` and `share_of_spend`. Order by spend descending.',
        `SELECT c.channel_type,
       COUNT(DISTINCT c.campaign_id) AS campaigns,
       SUM(d.cost) AS spend,
       SAFE_DIVIDE(SUM(d.cost), SUM(SUM(d.cost)) OVER ()) AS share_of_spend
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY c.channel_type
ORDER BY spend DESC`,
        ['Join daily performance to campaigns for the channel type.',
          'Share of spend needs a windowed SUM over the grouped totals.'],
        { orderMatters: true, chart: chart('bar', 0, 2, 'Spend by channel type') }),

      t('brand-split', 'Brand vs non-brand',
        'Brand campaigns look efficient because they capture demand others created. Return `brand_type`, `spend`, `conversions`, `cpa` and `roas`.',
        `SELECT CASE WHEN c.is_brand = 1 THEN 'Brand' ELSE 'Non-brand' END AS brand_type,
       SUM(d.cost) AS spend,
       SUM(d.conversions) AS conversions,
       SAFE_DIVIDE(SUM(d.cost), SUM(d.conversions)) AS cpa,
       SAFE_DIVIDE(SUM(d.conversion_value), SUM(d.cost)) AS roas
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY brand_type
ORDER BY spend DESC`,
        ['CASE on is_brand, then group by it.',
          'Every rate is a ratio of sums.'],
        { orderMatters: true }),

      t('wasted', 'Wasted spend',
        'Return `campaign_name`, `wasted_spend` and `wasted_days`: spend on campaign-days with zero conversions, excluding the last two days of the year. Order by wasted_spend descending.',
        `SELECT c.campaign_name,
       SUM(d.cost) AS wasted_spend,
       COUNT(*) AS wasted_days
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
WHERE d.conversions = 0
  AND d.cost > 0
  AND d.date <= '2024-12-29'
GROUP BY c.campaign_name
ORDER BY wasted_spend DESC, c.campaign_name`,
        ['Filter to zero-conversion days that still cost money.',
          'The lag-window filter stops you condemning days whose conversions have not landed.'],
        { orderMatters: true, chart: chart('bar', 0, 1, 'Wasted spend by campaign') }),

      t('keywords', 'Worst keywords',
        'Return `keyword_id`, `keyword_text`, `match_type`, `clicks` and `cost` for individual keywords with 50+ clicks and no conversions all year. Order by cost descending, top 20.',
        `SELECT k.keyword_id, k.keyword_text, k.match_type,
       SUM(kd.clicks) AS clicks,
       SUM(kd.cost) AS cost
FROM google_ads_keyword_daily kd
JOIN google_ads_keywords k ON k.keyword_id = kd.keyword_id
GROUP BY k.keyword_id, k.keyword_text, k.match_type
HAVING SUM(kd.clicks) >= 50 AND SUM(kd.conversions) = 0
ORDER BY cost DESC, k.keyword_id
LIMIT 20`,
        ['Group at keyword_id grain. This is a bid decision on a specific keyword, not on a phrase.',
          'Both conditions are on aggregates, so they belong in HAVING.',
          'Grouping by text instead would merge good and bad instances of the same phrase and hide the problem.'],
        { orderMatters: true }),

      t('quality', 'Quality Score exposure',
        'Return `quality_band` (`unscored`, `1-4`, `5-7`, `8-10`), `keywords` and `spend`. Order by spend descending.',
        `SELECT CASE
         WHEN k.quality_score IS NULL THEN 'unscored'
         WHEN k.quality_score <= 4 THEN '1-4'
         WHEN k.quality_score <= 7 THEN '5-7'
         ELSE '8-10' END AS quality_band,
       COUNT(DISTINCT k.keyword_id) AS keywords,
       SUM(kd.cost) AS spend
FROM google_ads_keywords k
LEFT JOIN google_ads_keyword_daily kd ON kd.keyword_id = k.keyword_id
GROUP BY quality_band
ORDER BY spend DESC, quality_band`,
        ['Handle the NULL branch first or unscored keywords fall into the wrong band.',
          'LEFT JOIN so keywords with no traffic still appear.'],
        { orderMatters: true, chart: chart('bar', 0, 2, 'Spend by Quality Score band') }),

      t('trend', 'Monthly efficiency trend',
        'Return `month`, `spend`, `conversions`, `cpa` and `mom_cpa_change`. Chronological.',
        `WITH monthly AS (
  SELECT DATE_TRUNC(date, MONTH) AS month,
         SUM(cost) AS spend,
         SUM(conversions) AS conversions
  FROM google_ads_daily
  GROUP BY month
)
SELECT month, spend, conversions,
       SAFE_DIVIDE(spend, conversions) AS cpa,
       SAFE_DIVIDE(spend, conversions)
         - LAG(SAFE_DIVIDE(spend, conversions)) OVER (ORDER BY month) AS mom_cpa_change
FROM monthly
ORDER BY month`,
        ['Aggregate to month first, then apply the window function.',
          'LAG needs an ORDER BY inside the OVER clause.'],
        { orderMatters: true, chart: chart('line', 0, [1, 3], 'Spend and CPA by month') }),
    ],
  },

  {
    slug: 'ga4-funnel',
    index: 2,
    title: 'Build a GA4 funnel',
    subtitle: 'From raw events to a drop-off chart the growth team will actually use',
    scenario:
      'The site converts at 8.9% and nobody knows where the other 91% go. Build the funnel ' +
      'from the raw GA4 export, then segment it so the leaks are attributable.',
    deliverable: 'A five-step funnel with drop-off rates, split by device and by channel.',
    difficulty: 'hard',
    unlockDay: 12,
    tables: ['ga4_events', 'ga4_sessions'],
    badge: 'funnel-builder',
    tasks: [
      t('steps', 'The five steps',
        'Return `sessions`, `view_item`, `add_to_cart`, `begin_checkout` and `purchase`, distinct sessions reaching each step.',
        `WITH per_session AS (
  SELECT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING)) AS session_key,
         MAX(CASE WHEN event_name = 'session_start'  THEN 1 ELSE 0 END) AS s1,
         MAX(CASE WHEN event_name = 'view_item'      THEN 1 ELSE 0 END) AS s2,
         MAX(CASE WHEN event_name = 'add_to_cart'    THEN 1 ELSE 0 END) AS s3,
         MAX(CASE WHEN event_name = 'begin_checkout' THEN 1 ELSE 0 END) AS s4,
         MAX(CASE WHEN event_name = 'purchase'       THEN 1 ELSE 0 END) AS s5
  FROM ga4_events GROUP BY session_key
)
SELECT SUM(s1) AS sessions, SUM(s2) AS view_item, SUM(s3) AS add_to_cart,
       SUM(s4) AS begin_checkout, SUM(s5) AS purchase
FROM per_session`,
        ['Flatten to one row per session with a flag per step.',
          'MAX over a 0/1 flag answers "did this session ever reach the step?".']),

      t('dropoff', 'Drop-off rates',
        'Return the same five counts plus `view_rate`, `cart_rate`, `checkout_rate` and `purchase_rate`, each step over the one before it.',
        `WITH per_session AS (
  SELECT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING)) AS session_key,
         MAX(CASE WHEN event_name = 'session_start'  THEN 1 ELSE 0 END) AS s1,
         MAX(CASE WHEN event_name = 'view_item'      THEN 1 ELSE 0 END) AS s2,
         MAX(CASE WHEN event_name = 'add_to_cart'    THEN 1 ELSE 0 END) AS s3,
         MAX(CASE WHEN event_name = 'begin_checkout' THEN 1 ELSE 0 END) AS s4,
         MAX(CASE WHEN event_name = 'purchase'       THEN 1 ELSE 0 END) AS s5
  FROM ga4_events GROUP BY session_key
), tot AS (
  SELECT SUM(s1) a, SUM(s2) b, SUM(s3) c, SUM(s4) d, SUM(s5) e FROM per_session
)
SELECT a AS sessions, b AS view_item, c AS add_to_cart, d AS begin_checkout, e AS purchase,
       SAFE_DIVIDE(b, a) AS view_rate,
       SAFE_DIVIDE(c, b) AS cart_rate,
       SAFE_DIVIDE(d, c) AS checkout_rate,
       SAFE_DIVIDE(e, d) AS purchase_rate
FROM tot`,
        ['Wrap the totals in their own CTE so each is nameable.',
          'Step-to-step rates, not step-to-top.']),

      t('by-device', 'Funnel by device',
        'Return `device_category`, `sessions`, `carts`, `purchases` and `cvr`. Order by sessions descending.',
        `WITH per_session AS (
  SELECT CONCAT(e.user_pseudo_id, '-', CAST(e.ga_session_id AS STRING)) AS session_key,
         MAX(e.device.category) AS device_category,
         MAX(CASE WHEN e.event_name = 'add_to_cart' THEN 1 ELSE 0 END) AS carted,
         MAX(CASE WHEN e.event_name = 'purchase' THEN 1 ELSE 0 END) AS purchased
  FROM ga4_events e GROUP BY session_key
)
SELECT device_category,
       COUNT(*) AS sessions,
       SUM(carted) AS carts,
       SUM(purchased) AS purchases,
       SAFE_DIVIDE(SUM(purchased), COUNT(*)) AS cvr
FROM per_session
GROUP BY device_category
ORDER BY sessions DESC, device_category`,
        ['Carry the device down from the events with MAX. It is constant within a session.',
          'Then group the flattened sessions.'],
        { orderMatters: true, chart: chart('bar', 0, 4, 'Conversion rate by device') }),

      t('by-channel', 'Funnel by channel',
        'Using `ga4_sessions` (excluding internal QA), return `channel_group`, `sessions`, `conversions`, `cvr` and `revenue_per_session`. Order by sessions descending.',
        `SELECT channel_group,
       COUNT(*) AS sessions,
       SUM(converted) AS conversions,
       SAFE_DIVIDE(SUM(converted), COUNT(*)) AS cvr,
       SAFE_DIVIDE(SUM(revenue), COUNT(*)) AS revenue_per_session
FROM ga4_sessions
WHERE source != 'internal-qa'
GROUP BY channel_group
ORDER BY sessions DESC, channel_group`,
        ['The flattened session table is the right tool once you have proved you can rebuild it.',
          'Revenue per session combines rate and value into one comparable number.'],
        { orderMatters: true, chart: chart('bar', 0, 3, 'CVR by channel') }),

      t('landing', 'Where the leak starts',
        'Return `landing_page`, `sessions`, `cvr` for pages with 150+ sessions, worst CVR first.',
        `SELECT landing_page,
       COUNT(*) AS sessions,
       SAFE_DIVIDE(SUM(converted), COUNT(*)) AS cvr
FROM ga4_sessions
WHERE source != 'internal-qa'
GROUP BY landing_page
HAVING COUNT(*) >= 150
ORDER BY cvr ASC, landing_page`,
        ['The volume floor belongs in HAVING.',
          'Ascending CVR puts the problem pages first.'],
        { orderMatters: true }),
    ],
  },

  {
    slug: 'marketing-dashboard',
    index: 3,
    title: 'Marketing dashboard',
    subtitle: 'The seven panels a CMO actually reads',
    scenario:
      'You have one page and about ninety seconds of your CMO\'s attention. Build the panels ' +
      'that answer "are we growing, is it profitable, and what changed?"',
    deliverable: 'Seven queries, each one panel of a live dashboard.',
    difficulty: 'hard',
    unlockDay: 10,
    tables: ['ad_spend_daily', 'orders', 'customers', 'ga4_sessions', 'subscriptions'],
    badge: 'dashboard-builder',
    tasks: [
      t('kpis', 'KPI row',
        'Return `spend`, `revenue`, `orders`, `aov`, `customers` and `blended_cac` in one row.',
        `SELECT
  (SELECT SUM(spend) FROM ad_spend_daily) AS spend,
  (SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed') AS revenue,
  (SELECT COUNT(*) FROM orders WHERE status = 'completed') AS orders,
  (SELECT SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)) FROM orders WHERE status = 'completed') AS aov,
  (SELECT COUNT(*) FROM customers) AS customers,
  SAFE_DIVIDE((SELECT SUM(spend) FROM ad_spend_daily), (SELECT COUNT(*) FROM customers)) AS blended_cac`,
        ['Scalar subqueries let unrelated aggregates share one row.',
          'Keep the status filter identical across every revenue figure.']),

      t('revenue-trend', 'Revenue trend',
        'Return `month`, `revenue` and `mom_pct` for completed orders. Chronological.',
        `WITH m AS (
  SELECT DATE_TRUNC(order_date, MONTH) AS month, SUM(gross_revenue) AS revenue
  FROM orders WHERE status = 'completed' GROUP BY month
)
SELECT month, revenue,
       SAFE_DIVIDE(revenue - LAG(revenue) OVER (ORDER BY month),
                   LAG(revenue) OVER (ORDER BY month)) AS mom_pct
FROM m ORDER BY month`,
        ['Aggregate to month, then LAG.',
          'SAFE_DIVIDE covers the first month, which has no previous value.'],
        { orderMatters: true, chart: chart('area', 0, 1, 'Revenue by month') }),

      t('channel-scorecard', 'Channel scorecard',
        'Return `channel`, `spend`, `customers`, `cac`, `revenue` and `roas`. Order by revenue descending.',
        `WITH s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel),
o AS (SELECT c.first_touch_channel AS channel,
             COUNT(DISTINCT o.customer_id) AS customers,
             SUM(o.gross_revenue) AS revenue
      FROM orders o JOIN customers c ON c.customer_id = o.customer_id
      WHERE o.status = 'completed' GROUP BY c.first_touch_channel)
SELECT o.channel,
       COALESCE(s.spend, 0) AS spend,
       o.customers,
       SAFE_DIVIDE(s.spend, o.customers) AS cac,
       o.revenue,
       SAFE_DIVIDE(o.revenue, s.spend) AS roas
FROM o LEFT JOIN s USING (channel)
ORDER BY o.revenue DESC, o.channel`,
        ['Two CTEs at channel grain, joined.',
          'Start FROM the outcomes so unpaid channels still appear, with a NULL CAC.'],
        { orderMatters: true, chart: chart('bar', 0, 4, 'Revenue by channel') }),

      t('funnel-panel', 'Site funnel',
        'Return `sessions`, `converted_sessions` and `cvr` from `ga4_sessions`, excluding QA traffic.',
        `SELECT COUNT(*) AS sessions,
       SUM(converted) AS converted_sessions,
       SAFE_DIVIDE(SUM(converted), COUNT(*)) AS cvr
FROM ga4_sessions
WHERE source != 'internal-qa'`,
        ['One row, three numbers.', 'Always filter the QA traffic first.']),

      t('cohort', 'Cohort retention',
        'Return `cohort_month`, `month_number`, `customers` and `retention_rate`, limit 40.',
        `WITH cohort AS (
  SELECT customer_id, DATE_TRUNC(MIN(order_date), MONTH) AS cohort_month
  FROM orders WHERE status = 'completed' GROUP BY customer_id
), activity AS (
  SELECT c.cohort_month,
         DATE_DIFF(DATE_TRUNC(o.order_date, MONTH), c.cohort_month, MONTH) AS month_number,
         o.customer_id
  FROM orders o JOIN cohort c USING (customer_id) WHERE o.status = 'completed'
), matrix AS (
  SELECT cohort_month, month_number, COUNT(DISTINCT customer_id) AS customers
  FROM activity GROUP BY cohort_month, month_number
)
SELECT cohort_month, month_number, customers,
       SAFE_DIVIDE(customers, FIRST_VALUE(customers) OVER (PARTITION BY cohort_month ORDER BY month_number)) AS retention_rate
FROM matrix
ORDER BY cohort_month, month_number
LIMIT 40`,
        ['Cohort → activity → matrix → rate.',
          'FIRST_VALUE gives the month-0 size without a self-join.'],
        { orderMatters: true, chart: chart('heatmap', 0, 3, 'Retention by cohort') }),

      t('ltv-cac', 'LTV:CAC by channel',
        'Return `channel`, `cac`, `avg_ltv` and `ltv_cac_ratio` for paid channels. Order by ratio descending.',
        `WITH s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel),
v AS (SELECT first_touch_channel AS channel, COUNT(*) AS customers, AVG(lifetime_revenue) AS avg_ltv
      FROM customer_ltv GROUP BY first_touch_channel)
SELECT s.channel,
       SAFE_DIVIDE(s.spend, v.customers) AS cac,
       v.avg_ltv,
       SAFE_DIVIDE(v.avg_ltv, SAFE_DIVIDE(s.spend, v.customers)) AS ltv_cac_ratio
FROM s JOIN v USING (channel)
ORDER BY ltv_cac_ratio DESC, s.channel`,
        ['The customer_ltv view saves you rebuilding lifetime revenue.',
          'Ratio is LTV divided by CAC, 3:1 is the conventional floor.'],
        { orderMatters: true }),

      t('summary', 'Executive summary',
        'Return `metric` values in one row: `gross_profit`, `margin_pct`, `active_mrr` and `site_cvr`.',
        `SELECT
  (SELECT SUM(gross_revenue) - SUM(cogs) FROM orders WHERE status = 'completed') AS gross_profit,
  (SELECT SAFE_DIVIDE(SUM(gross_revenue) - SUM(cogs), SUM(gross_revenue))
   FROM orders WHERE status = 'completed') AS margin_pct,
  (SELECT SUM(mrr) FROM subscriptions WHERE status = 'active') AS active_mrr,
  (SELECT SAFE_DIVIDE(SUM(converted), COUNT(*)) FROM ga4_sessions WHERE source != 'internal-qa') AS site_cvr`,
        ['Four scalar subqueries.', 'Profit before revenue. That is the order a CFO reads in.']),
    ],
  },

  {
    slug: 'customer-segmentation',
    index: 4,
    title: 'Customer segmentation',
    subtitle: 'RFM, deciles, and a segment the lifecycle team can actually target',
    scenario:
      'Lifecycle marketing wants segments to build campaigns against. Give them segments ' +
      'defined by behaviour, sized, and with a revenue number attached to each.',
    deliverable: 'RFM scores, value deciles, and a named-segment table with sizes and revenue.',
    difficulty: 'hard',
    unlockDay: 10,
    tables: ['customer_ltv', 'customers', 'orders'],
    badge: 'segmenter',
    tasks: [
      t('deciles', 'Value deciles',
        'Return `decile`, `customers`, `total_revenue` and `share_of_revenue`. Order by decile.',
        `WITH ranked AS (
  SELECT customer_id, lifetime_revenue,
         NTILE(10) OVER (ORDER BY lifetime_revenue DESC) AS decile
  FROM customer_ltv
)
SELECT decile, COUNT(*) AS customers, SUM(lifetime_revenue) AS total_revenue,
       SAFE_DIVIDE(SUM(lifetime_revenue), SUM(SUM(lifetime_revenue)) OVER ()) AS share_of_revenue
FROM ranked GROUP BY decile ORDER BY decile`,
        ['NTILE(10) over lifetime revenue descending.',
          'Share of revenue needs a windowed SUM over the group sums.'],
        { orderMatters: true, chart: chart('bar', 0, 3, 'Share of revenue by decile') }),

      t('rfm', 'RFM scores',
        'Return `r`, `f`, `m` and `customers`: the population of each RFM cell, top 20 cells by size.',
        `WITH scored AS (
  SELECT customer_id,
         NTILE(4) OVER (ORDER BY last_order_date) AS r,
         NTILE(4) OVER (ORDER BY orders_count) AS f,
         NTILE(4) OVER (ORDER BY lifetime_revenue) AS m
  FROM customer_ltv WHERE last_order_date IS NOT NULL
)
SELECT r, f, m, COUNT(*) AS customers
FROM scored GROUP BY r, f, m
ORDER BY customers DESC, r, f, m
LIMIT 20`,
        ['Three NTILE(4) windows over three different orderings.',
          'Exclude customers who never ordered. They have no R, F or M.'],
        { orderMatters: true }),

      t('named', 'Named segments',
        'Return `segment` and `customers` for Champions (r=4,f=4), Loyal (f>=3, r=3), At risk (r<=2, f>=3), New (f=1, r=4) and Other. Order by customers descending.',
        `WITH scored AS (
  SELECT customer_id,
         NTILE(4) OVER (ORDER BY last_order_date) AS r,
         NTILE(4) OVER (ORDER BY orders_count) AS f
  FROM customer_ltv WHERE last_order_date IS NOT NULL
)
SELECT CASE
         WHEN r = 4 AND f = 4 THEN 'Champions'
         WHEN r = 3 AND f >= 3 THEN 'Loyal'
         WHEN r <= 2 AND f >= 3 THEN 'At risk'
         WHEN r = 4 AND f = 1 THEN 'New'
         ELSE 'Other' END AS segment,
       COUNT(*) AS customers
FROM scored GROUP BY segment ORDER BY customers DESC, segment`,
        ['Order the CASE branches from most specific to least.',
          'The ELSE catches everyone the rules miss. Never let customers vanish.'],
        { orderMatters: true, chart: chart('pie', 0, 1, 'Segment sizes') }),

      t('segment-value', 'Segment value',
        'Return `segment`, `customers`, `total_revenue` and `avg_ltv`. Order by total_revenue descending.',
        `WITH scored AS (
  SELECT customer_id, lifetime_revenue,
         NTILE(4) OVER (ORDER BY last_order_date) AS r,
         NTILE(4) OVER (ORDER BY orders_count) AS f
  FROM customer_ltv WHERE last_order_date IS NOT NULL
)
SELECT CASE
         WHEN r = 4 AND f = 4 THEN 'Champions'
         WHEN r = 3 AND f >= 3 THEN 'Loyal'
         WHEN r <= 2 AND f >= 3 THEN 'At risk'
         WHEN r = 4 AND f = 1 THEN 'New'
         ELSE 'Other' END AS segment,
       COUNT(*) AS customers,
       SUM(lifetime_revenue) AS total_revenue,
       AVG(lifetime_revenue) AS avg_ltv
FROM scored GROUP BY segment ORDER BY total_revenue DESC, segment`,
        ['Same segmentation, now with money attached.',
          'A segment without a revenue number cannot be prioritised.'],
        { orderMatters: true }),

      t('channel-mix', 'Which channels produce Champions',
        'Return `first_touch_channel`, `champions` and `champion_rate`. The share of that channel\'s customers who are Champions. Order by champion_rate descending.',
        `WITH scored AS (
  SELECT l.customer_id, l.first_touch_channel,
         NTILE(4) OVER (ORDER BY l.last_order_date) AS r,
         NTILE(4) OVER (ORDER BY l.orders_count) AS f
  FROM customer_ltv l WHERE l.last_order_date IS NOT NULL
)
SELECT first_touch_channel,
       COUNTIF(r = 4 AND f = 4) AS champions,
       SAFE_DIVIDE(COUNTIF(r = 4 AND f = 4), COUNT(*)) AS champion_rate
FROM scored
GROUP BY first_touch_channel
ORDER BY champion_rate DESC, first_touch_channel`,
        ['COUNTIF for the numerator, COUNT(*) for the denominator.',
          'Rate, not count. Otherwise the biggest channel always wins.'],
        { orderMatters: true }),
    ],
  },

  {
    slug: 'retention-analysis',
    index: 5,
    title: 'Retention analysis',
    subtitle: 'Cohort triangles, curves, and the number behind them',
    scenario:
      'Growth has stalled and nobody can say whether acquisition slowed or retention worsened. ' +
      'Build the cohort view that settles it.',
    deliverable: 'A cohort matrix, retention curves, and a cohort-over-cohort comparison.',
    difficulty: 'hard',
    unlockDay: 10,
    tables: ['orders', 'subscriptions', 'product_events'],
    badge: 'retention-analyst',
    tasks: [
      t('sizes', 'Cohort sizes',
        'Return `cohort_month` and `customers`. Chronological.',
        `WITH f AS (
  SELECT customer_id, MIN(order_date) AS first_date
  FROM orders WHERE status = 'completed' GROUP BY customer_id
)
SELECT DATE_TRUNC(first_date, MONTH) AS cohort_month, COUNT(*) AS customers
FROM f GROUP BY cohort_month ORDER BY cohort_month`,
        ['A cohort is defined by a first event.', 'MIN per customer, then truncate.'],
        { orderMatters: true, chart: chart('bar', 0, 1, 'Cohort sizes') }),

      t('matrix', 'The triangle',
        'Return `cohort_month`, `month_number`, `customers`, `retention_rate`. Limit 60.',
        `WITH cohort AS (
  SELECT customer_id, DATE_TRUNC(MIN(order_date), MONTH) AS cohort_month
  FROM orders WHERE status = 'completed' GROUP BY customer_id
), activity AS (
  SELECT c.cohort_month,
         DATE_DIFF(DATE_TRUNC(o.order_date, MONTH), c.cohort_month, MONTH) AS month_number,
         o.customer_id
  FROM orders o JOIN cohort c USING (customer_id) WHERE o.status = 'completed'
), matrix AS (
  SELECT cohort_month, month_number, COUNT(DISTINCT customer_id) AS customers
  FROM activity GROUP BY cohort_month, month_number
)
SELECT cohort_month, month_number, customers,
       SAFE_DIVIDE(customers, FIRST_VALUE(customers) OVER (PARTITION BY cohort_month ORDER BY month_number)) AS retention_rate
FROM matrix ORDER BY cohort_month, month_number LIMIT 60`,
        ['Four steps, each named.', 'FIRST_VALUE within the cohort partition is the month-0 size.'],
        { orderMatters: true, chart: chart('heatmap', 0, 3, 'Cohort retention triangle') }),

      t('curve', 'Average retention curve',
        'Collapse the triangle into one curve: return `month_number` and `avg_retention` across all cohorts. Chronological.',
        `WITH cohort AS (
  SELECT customer_id, DATE_TRUNC(MIN(order_date), MONTH) AS cohort_month
  FROM orders WHERE status = 'completed' GROUP BY customer_id
), activity AS (
  SELECT c.cohort_month,
         DATE_DIFF(DATE_TRUNC(o.order_date, MONTH), c.cohort_month, MONTH) AS month_number,
         o.customer_id
  FROM orders o JOIN cohort c USING (customer_id) WHERE o.status = 'completed'
), matrix AS (
  SELECT cohort_month, month_number, COUNT(DISTINCT customer_id) AS customers
  FROM activity GROUP BY cohort_month, month_number
), rates AS (
  SELECT month_number,
         SAFE_DIVIDE(customers, FIRST_VALUE(customers) OVER (PARTITION BY cohort_month ORDER BY month_number)) AS rate
  FROM matrix
)
SELECT month_number, AVG(rate) AS avg_retention
FROM rates GROUP BY month_number ORDER BY month_number`,
        ['Compute the per-cohort rates first, then average them by month offset.',
          'This is one of the rare cases where averaging rates is right. Each cohort is a legitimate unit.'],
        { orderMatters: true, chart: chart('line', 0, 1, 'Average retention curve') }),

      t('subs-churn', 'Subscription churn by tier',
        'Return `tier`, `subs`, `churned` and `churn_rate`. Order by churn_rate descending.',
        `SELECT p.tier,
       COUNT(*) AS subs,
       COUNTIF(s.canceled_at IS NOT NULL) AS churned,
       SAFE_DIVIDE(COUNTIF(s.canceled_at IS NOT NULL), COUNT(*)) AS churn_rate
FROM subscriptions s JOIN plans p ON p.plan_id = s.plan_id
GROUP BY p.tier
ORDER BY churn_rate DESC, p.tier`,
        ['COUNTIF over IS NOT NULL counts the cancellations.',
          'Rate over the whole tier population.'],
        { orderMatters: true, chart: chart('bar', 0, 3, 'Churn rate by plan tier') }),

      t('activation-link', 'Does activation predict retention?',
        'Return `activated`, `customers` and `avg_days_subscribed`, comparing activated vs never-activated B2B subscriptions.',
        `WITH act AS (
  SELECT DISTINCT user_id FROM product_events WHERE event_name = 'activated'
)
SELECT CASE WHEN a.user_id IS NULL THEN 'never activated' ELSE 'activated' END AS activated,
       COUNT(*) AS customers,
       AVG(DATE_DIFF(COALESCE(s.canceled_at, DATE '2024-12-31'), s.started_at, DAY)) AS avg_days_subscribed
FROM subscriptions s
LEFT JOIN act a ON a.user_id = s.customer_id
GROUP BY activated
ORDER BY activated`,
        ['LEFT JOIN to the activated set, then CASE on whether it matched.',
          'COALESCE the cancellation date to year end for subscriptions still running.'],
        { orderMatters: true }),
    ],
  },

  {
    slug: 'ltv-dashboard',
    index: 6,
    title: 'LTV dashboard',
    subtitle: 'Historical, cohort-based and payback, three honest views of customer value',
    scenario:
      'Finance wants an LTV number for the board deck. You know there are at least three, ' +
      'and that the one they want is not the one they asked for.',
    deliverable: 'Historical LTV, fixed-window cohort LTV, LTV:CAC and payback period.',
    difficulty: 'expert',
    unlockDay: 13,
    tables: ['customer_ltv', 'orders', 'ad_spend_daily', 'customers'],
    badge: 'ltv-modeller',
    tasks: [
      t('distribution', 'LTV distribution',
        'Return `ltv_band` (`0`, `1-99`, `100-299`, `300-999`, `1000+`) and `customers`. Order by customers descending.',
        `SELECT CASE
         WHEN lifetime_revenue <= 0 THEN '0'
         WHEN lifetime_revenue < 100 THEN '1-99'
         WHEN lifetime_revenue < 300 THEN '100-299'
         WHEN lifetime_revenue < 1000 THEN '300-999'
         ELSE '1000+' END AS ltv_band,
       COUNT(*) AS customers
FROM customer_ltv
GROUP BY ltv_band
ORDER BY customers DESC, ltv_band`,
        ['Band with a CASE ladder, group by it.',
          'Put the zero case first. Refund-only customers can be negative.'],
        { orderMatters: true, chart: chart('bar', 0, 1, 'LTV distribution') }),

      t('by-channel', 'LTV by acquisition channel',
        'Return `first_touch_channel`, `customers`, `avg_ltv`, `median_ltv`. Order by avg_ltv descending.',
        `SELECT first_touch_channel,
       COUNT(*) AS customers,
       AVG(lifetime_revenue) AS avg_ltv,
       PERCENTILE_CONT(lifetime_revenue, 0.5) AS median_ltv
FROM customer_ltv
GROUP BY first_touch_channel
ORDER BY avg_ltv DESC, first_touch_channel`,
        ['Report mean and median together. The gap is the skew.',
          'PERCENTILE_CONT at 0.5 is the median.'],
        { orderMatters: true }),

      t('cohort-ltv', '90-day cohort LTV',
        'Return `cohort_month`, `customers` and `ltv_90d` for cohorts on or before September. Chronological.',
        `WITH f AS (
  SELECT customer_id, MIN(order_date) AS first_date
  FROM orders WHERE status = 'completed' GROUP BY customer_id
), w AS (
  SELECT f.customer_id, DATE_TRUNC(f.first_date, MONTH) AS cohort_month,
         SUM(CASE WHEN DATE_DIFF(o.order_date, f.first_date, DAY) <= 90 THEN o.gross_revenue ELSE 0 END) AS rev90
  FROM f JOIN orders o ON o.customer_id = f.customer_id AND o.status = 'completed'
  GROUP BY f.customer_id, cohort_month
)
SELECT cohort_month, COUNT(*) AS customers, AVG(rev90) AS ltv_90d
FROM w WHERE cohort_month <= '2024-09-01'
GROUP BY cohort_month ORDER BY cohort_month`,
        ['Anchor the window to each customer\'s own first order.',
          'Exclude cohorts too young to have a full 90 days.'],
        { orderMatters: true, chart: chart('line', 0, 2, '90-day LTV by cohort') }),

      t('ltv-cac', 'LTV:CAC and payback',
        'Return `channel`, `cac`, `avg_ltv`, `ltv_cac_ratio` and `payback_months`. Order by ltv_cac_ratio descending.',
        `WITH s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel),
v AS (SELECT first_touch_channel AS channel, COUNT(*) AS customers, AVG(lifetime_revenue) AS avg_ltv
      FROM customer_ltv GROUP BY first_touch_channel)
SELECT s.channel,
       SAFE_DIVIDE(s.spend, v.customers) AS cac,
       v.avg_ltv,
       SAFE_DIVIDE(v.avg_ltv, SAFE_DIVIDE(s.spend, v.customers)) AS ltv_cac_ratio,
       SAFE_DIVIDE(SAFE_DIVIDE(s.spend, v.customers), v.avg_ltv / 12) AS payback_months
FROM s JOIN v USING (channel)
ORDER BY ltv_cac_ratio DESC, s.channel`,
        ['Both metrics come from the same two numbers.',
          'Payback spreads LTV over 12 months to get a monthly rate.'],
        { orderMatters: true }),

      t('top-customers', 'Highest-LTV customers',
        'Return `customer_id`, `segment`, `first_touch_channel`, `orders_count` and `lifetime_revenue` for the top 25.',
        `SELECT customer_id, segment, first_touch_channel, orders_count, lifetime_revenue
FROM customer_ltv
ORDER BY lifetime_revenue DESC, customer_id
LIMIT 25`,
        ['The view has everything already.', 'Sort descending and take 25.'],
        { orderMatters: true }),
    ],
  },

  {
    slug: 'revenue-dashboard',
    index: 7,
    title: 'Revenue dashboard',
    subtitle: 'Gross, net, refunded, and profitable, four numbers people call "revenue"',
    scenario:
      'Three teams quote three different revenue numbers in the same meeting. Build the ' +
      'dashboard that names each one and shows how they reconcile.',
    deliverable: 'A revenue bridge, a product and category view, and a profit view.',
    difficulty: 'hard',
    unlockDay: 8,
    tables: ['orders', 'order_items', 'products', 'date_dim'],
    badge: 'revenue-analyst',
    tasks: [
      t('bridge', 'Revenue bridge',
        'Return `gross_revenue`, `refunds`, `net_revenue`, `discounts`, `cogs` and `gross_profit`.',
        `SELECT
  SUM(CASE WHEN status = 'completed' THEN gross_revenue ELSE 0 END) AS gross_revenue,
  ABS(SUM(CASE WHEN status = 'refunded' THEN gross_revenue ELSE 0 END)) AS refunds,
  SUM(CASE WHEN status IN ('completed','refunded') THEN gross_revenue ELSE 0 END) AS net_revenue,
  SUM(CASE WHEN status = 'completed' THEN discount_amount ELSE 0 END) AS discounts,
  SUM(CASE WHEN status = 'completed' THEN cogs ELSE 0 END) AS cogs,
  SUM(CASE WHEN status = 'completed' THEN gross_revenue - cogs ELSE 0 END) AS gross_profit
FROM orders`,
        ['One pass over orders with conditional aggregation per line of the bridge.',
          'Net revenue includes refunds because they are stored negative.']),

      t('monthly', 'Monthly revenue and orders',
        'Return `month`, `orders`, `revenue`, `aov`. Chronological.',
        `SELECT DATE_TRUNC(order_date, MONTH) AS month,
       COUNT(*) AS orders,
       SUM(gross_revenue) AS revenue,
       SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)) AS aov
FROM orders WHERE status = 'completed'
GROUP BY month ORDER BY month`,
        ['Truncate to month and aggregate.'],
        { orderMatters: true, chart: chart('area', 0, 2, 'Revenue by month') }),

      t('category', 'Revenue by product category',
        'Return `category`, `units`, `revenue`, `profit` and `margin_pct` from order line items. Order by revenue descending.',
        `SELECT p.category,
       SUM(i.quantity) AS units,
       SUM(i.quantity * i.unit_price - i.line_discount) AS revenue,
       SUM(i.quantity * (i.unit_price - p.unit_cost) - i.line_discount) AS profit,
       SAFE_DIVIDE(SUM(i.quantity * (i.unit_price - p.unit_cost) - i.line_discount),
                   SUM(i.quantity * i.unit_price - i.line_discount)) AS margin_pct
FROM order_items i
JOIN products p ON p.product_id = i.product_id
JOIN orders o ON o.order_id = i.order_id
WHERE o.status = 'completed'
GROUP BY p.category
ORDER BY revenue DESC, p.category`,
        ['Work at line-item grain and sum a line-item measure, never orders.gross_revenue.',
          'Join back to orders only to filter on status.'],
        { orderMatters: true, chart: chart('bar', 0, 2, 'Revenue by category') }),

      t('top-products', 'Best sellers',
        'Return `product_name`, `units`, `revenue` for the top 15 by revenue.',
        `SELECT p.product_name,
       SUM(i.quantity) AS units,
       SUM(i.quantity * i.unit_price - i.line_discount) AS revenue
FROM order_items i
JOIN products p ON p.product_id = i.product_id
JOIN orders o ON o.order_id = i.order_id
WHERE o.status = 'completed'
GROUP BY p.product_name
ORDER BY revenue DESC, p.product_name
LIMIT 15`,
        ['Same line-item grain, grouped by product.'],
        { orderMatters: true }),

      t('discount-impact', 'What discounting costs',
        'Return `used_coupon`, `orders`, `revenue`, `aov` and `margin_pct`. Order by used_coupon.',
        `SELECT CASE WHEN coupon_code IS NULL THEN 'no coupon' ELSE 'coupon' END AS used_coupon,
       COUNT(*) AS orders,
       SUM(gross_revenue) AS revenue,
       SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)) AS aov,
       SAFE_DIVIDE(SUM(gross_revenue) - SUM(cogs), SUM(gross_revenue)) AS margin_pct
FROM orders WHERE status = 'completed'
GROUP BY used_coupon ORDER BY used_coupon`,
        ['CASE on whether a coupon was present.',
          'Compare AOV and margin, not just order counts. Discounts buy volume at a price.'],
        { orderMatters: true }),

      t('seasonality', 'Day-of-week and holiday effects',
        'Return `day_name`, `is_holiday`, `orders`, `revenue`. Order by revenue descending, top 15.',
        `SELECT d.day_name, d.is_holiday,
       COUNT(*) AS orders,
       SUM(o.gross_revenue) AS revenue
FROM orders o JOIN date_dim d ON d.date = o.order_date
WHERE o.status = 'completed'
GROUP BY d.day_name, d.is_holiday
ORDER BY revenue DESC, d.day_name
LIMIT 15`,
        ['date_dim carries both attributes, no date arithmetic needed.'],
        { orderMatters: true }),
    ],
  },

  {
    slug: 'subscription-analytics',
    index: 8,
    title: 'Subscription analytics',
    subtitle: 'MRR, churn, and the movements behind the headline number',
    scenario:
      'MRR is flat month over month. That could mean nothing is happening, or that new ' +
      'business and churn are cancelling out. Find out which.',
    deliverable: 'An MRR bridge, churn by tier and reason, and failed-payment exposure.',
    difficulty: 'expert',
    unlockDay: 13,
    tables: ['subscriptions', 'plans', 'stripe_charges', 'date_dim'],
    badge: 'saas-analyst',
    tasks: [
      t('mrr-bridge', 'MRR bridge',
        'Return `month`, `new_mrr`, `churned_mrr`, `net_new_mrr`. Chronological.',
        `WITH months AS (SELECT DISTINCT month_start AS month FROM date_dim),
n AS (SELECT DATE_TRUNC(started_at, MONTH) AS month, SUM(mrr) AS new_mrr FROM subscriptions GROUP BY month),
c AS (SELECT DATE_TRUNC(canceled_at, MONTH) AS month, SUM(mrr) AS churned_mrr
      FROM subscriptions WHERE canceled_at IS NOT NULL GROUP BY month)
SELECT m.month,
       COALESCE(n.new_mrr, 0) AS new_mrr,
       COALESCE(c.churned_mrr, 0) AS churned_mrr,
       COALESCE(n.new_mrr, 0) - COALESCE(c.churned_mrr, 0) AS net_new_mrr
FROM months m LEFT JOIN n USING (month) LEFT JOIN c USING (month)
ORDER BY m.month`,
        ['Starts and cancellations are different events on different dates.',
          'A month spine keeps quiet months visible.'],
        { orderMatters: true, chart: chart('bar', 0, [1, 2], 'MRR movements') }),

      t('active-mrr', 'Active MRR over time',
        'Return `month` and `active_mrr`. MRR live at the start of each month. Chronological.',
        `WITH months AS (SELECT DISTINCT month_start AS month FROM date_dim)
SELECT m.month, COALESCE(SUM(s.mrr), 0) AS active_mrr
FROM months m
LEFT JOIN subscriptions s
       ON s.started_at < m.month
      AND (s.canceled_at IS NULL OR s.canceled_at >= m.month)
GROUP BY m.month
ORDER BY m.month`,
        ['A subscription is live if it started before the month and had not cancelled by it.',
          'The join condition carries both halves of that test.'],
        { orderMatters: true, chart: chart('line', 0, 1, 'Active MRR') }),

      t('churn-tier', 'Churn by tier',
        'Return `tier`, `subs`, `churned`, `churn_rate`, `churned_mrr`. Order by churned_mrr descending.',
        `SELECT p.tier,
       COUNT(*) AS subs,
       COUNTIF(s.canceled_at IS NOT NULL) AS churned,
       SAFE_DIVIDE(COUNTIF(s.canceled_at IS NOT NULL), COUNT(*)) AS churn_rate,
       SUM(CASE WHEN s.canceled_at IS NOT NULL THEN s.mrr ELSE 0 END) AS churned_mrr
FROM subscriptions s JOIN plans p ON p.plan_id = s.plan_id
GROUP BY p.tier ORDER BY churned_mrr DESC, p.tier`,
        ['Logo churn and revenue churn side by side.'],
        { orderMatters: true }),

      t('reasons', 'Why they leave',
        'Return `cancel_reason`, `subs` and `lost_mrr` for cancelled subscriptions. Order by lost_mrr descending.',
        `SELECT cancel_reason, COUNT(*) AS subs, SUM(mrr) AS lost_mrr
FROM subscriptions
WHERE canceled_at IS NOT NULL
GROUP BY cancel_reason
ORDER BY lost_mrr DESC, cancel_reason`,
        ['Filter to cancellations so the NULL reasons drop out.',
          'Rank by MRR lost, not by count.'],
        { orderMatters: true, chart: chart('bar', 0, 2, 'MRR lost by reason') }),

      t('involuntary', 'Involuntary churn',
        'Return `failure_code`, `failed_charges` and `at_risk_amount` from failed Stripe charges. Order by at_risk_amount descending.',
        `SELECT failure_code, COUNT(*) AS failed_charges, SUM(amount) AS at_risk_amount
FROM stripe_charges
WHERE status = 'failed'
GROUP BY failure_code
ORDER BY at_risk_amount DESC, failure_code`,
        ['Failed charges carry a failure_code; successful ones do not.'],
        { orderMatters: true }),

      t('trial-conversion', 'Trial conversion',
        'Return `had_trial`, `subs` and `still_active_rate`. Order by had_trial.',
        `SELECT CASE WHEN trial_end_at IS NULL THEN 'no trial' ELSE 'trial' END AS had_trial,
       COUNT(*) AS subs,
       SAFE_DIVIDE(COUNTIF(status = 'active'), COUNT(*)) AS still_active_rate
FROM subscriptions
GROUP BY had_trial ORDER BY had_trial`,
        ['CASE on whether a trial end date exists.',
          'Compare the share still active in each group.'],
        { orderMatters: true }),
    ],
  },

  {
    slug: 'meta-ads-analysis',
    index: 9,
    title: 'Meta Ads analysis',
    subtitle: 'Creative fatigue, frequency, and where the ROAS actually comes from',
    scenario:
      'Meta ROAS has been sliding for two months. The buying team says the algorithm changed. ' +
      'Check whether it is really creative fatigue.',
    deliverable: 'Creative-level performance, a fatigue curve, and a prospecting/retargeting split.',
    difficulty: 'hard',
    unlockDay: 10,
    tables: ['meta_ads_daily', 'meta_ads_campaigns'],
    badge: 'paid-social-analyst',
    tasks: [
      t('objective', 'Performance by objective',
        'Return `objective`, `spend`, `impressions`, `ctr`, `cpm`, `purchases`, `roas`. Order by spend descending.',
        `SELECT c.objective,
       SUM(d.spend) AS spend,
       SUM(d.impressions) AS impressions,
       SAFE_DIVIDE(SUM(d.clicks), SUM(d.impressions)) AS ctr,
       SAFE_DIVIDE(SUM(d.spend), SUM(d.impressions)) * 1000 AS cpm,
       SUM(d.purchases) AS purchases,
       SAFE_DIVIDE(SUM(d.purchase_value), SUM(d.spend)) AS roas
FROM meta_ads_daily d JOIN meta_ads_campaigns c USING (campaign_id)
GROUP BY c.objective ORDER BY spend DESC`,
        ['Join to campaigns for the objective.', 'All five rates are ratios of sums.'],
        { orderMatters: true, chart: chart('bar', 0, 6, 'ROAS by objective') }),

      t('format', 'Creative format',
        'Return `creative_format`, `spend`, `ctr`, `roas`, `thruplay_rate`. Order by spend descending.',
        `SELECT creative_format,
       SUM(spend) AS spend,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
       SAFE_DIVIDE(SUM(purchase_value), SUM(spend)) AS roas,
       SAFE_DIVIDE(SUM(thruplays), SUM(impressions)) AS thruplay_rate
FROM meta_ads_daily
GROUP BY creative_format ORDER BY spend DESC`,
        ['Thruplay rate is only meaningful for video formats. Expect zeros elsewhere.'],
        { orderMatters: true }),

      t('fatigue', 'Creative fatigue curve',
        'Return `days_live_band` (`0-13`, `14-29`, `30-59`, `60+`), `impressions`, `ctr` and `roas`, using each creative\'s first active date. Order by band.',
        `WITH firsts AS (
  SELECT creative_id, MIN(date) AS first_date FROM meta_ads_daily GROUP BY creative_id
), aged AS (
  SELECT d.*, DATE_DIFF(d.date, f.first_date, DAY) AS days_live
  FROM meta_ads_daily d JOIN firsts f USING (creative_id)
)
SELECT CASE
         WHEN days_live < 14 THEN '0-13'
         WHEN days_live < 30 THEN '14-29'
         WHEN days_live < 60 THEN '30-59'
         ELSE '60+' END AS days_live_band,
       SUM(impressions) AS impressions,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
       SAFE_DIVIDE(SUM(purchase_value), SUM(spend)) AS roas
FROM aged
GROUP BY days_live_band
ORDER BY days_live_band`,
        ['Find each creative\'s first date, then measure every row\'s age from it.',
          'Band the ages and compare CTR across bands.'],
        { orderMatters: true, chart: chart('line', 0, 2, 'CTR by creative age') }),

      t('frequency', 'Frequency and efficiency',
        'Return `frequency_band` (`<1.5`, `1.5-2.5`, `2.5-4`, `4+`), `spend`, `ctr`, `roas`. Order by frequency_band.',
        `SELECT CASE
         WHEN frequency < 1.5 THEN '<1.5'
         WHEN frequency < 2.5 THEN '1.5-2.5'
         WHEN frequency < 4 THEN '2.5-4'
         ELSE '4+' END AS frequency_band,
       SUM(spend) AS spend,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
       SAFE_DIVIDE(SUM(purchase_value), SUM(spend)) AS roas
FROM meta_ads_daily
GROUP BY frequency_band
ORDER BY frequency_band`,
        ['Band the frequency column and compare efficiency across bands.'],
        { orderMatters: true }),

      t('prospect-retarget', 'Prospecting vs retargeting',
        'Return `audience_type`, `spend`, `cpm`, `cvr` and `roas`, splitting on whether the campaign name contains Retargeting or Catalog. Order by spend descending.',
        `SELECT CASE WHEN c.campaign_name LIKE '%Retargeting%' OR c.campaign_name LIKE '%Catalog%'
            THEN 'retargeting' ELSE 'prospecting' END AS audience_type,
       SUM(d.spend) AS spend,
       SAFE_DIVIDE(SUM(d.spend), SUM(d.impressions)) * 1000 AS cpm,
       SAFE_DIVIDE(SUM(d.purchases), SUM(d.clicks)) AS cvr,
       SAFE_DIVIDE(SUM(d.purchase_value), SUM(d.spend)) AS roas
FROM meta_ads_daily d JOIN meta_ads_campaigns c USING (campaign_id)
GROUP BY audience_type ORDER BY spend DESC`,
        ['Parse the audience out of the naming convention with LIKE.',
          'Retargeting will show far better ROAS. The question is whether that revenue is incremental.'],
        { orderMatters: true }),
    ],
  },

  {
    slug: 'attribution-case-study',
    index: 10,
    title: 'Complete marketing analytics case study',
    subtitle: 'Six attribution models, one budget decision',
    scenario:
      'The CFO wants to cut 20% of paid budget and has asked which channel to cut. Every ' +
      'attribution model gives a different answer. Build all of them, then make the call.',
    deliverable: 'Six attribution models side by side, a journey analysis, and a written recommendation.',
    difficulty: 'expert',
    unlockDay: 14,
    tables: ['attribution_touchpoints', 'ad_spend_daily', 'customers', 'orders'],
    badge: 'attribution-master',
    tasks: [
      t('journeys', 'Journey shape',
        'Return `journey_length`, `journeys` and `conversion_rate` across all journeys. Order by journey_length.',
        `WITH j AS (
  SELECT user_pseudo_id, MAX(journey_length) AS journey_length, MAX(converted) AS converted
  FROM attribution_touchpoints GROUP BY user_pseudo_id
)
SELECT journey_length, COUNT(*) AS journeys,
       SAFE_DIVIDE(SUM(converted), COUNT(*)) AS conversion_rate
FROM j GROUP BY journey_length ORDER BY journey_length`,
        ['Collapse to one row per journey first.',
          'Longer journeys convert more, but that is partly survivorship.'],
        { orderMatters: true, chart: chart('bar', 0, 1, 'Journeys by length') }),

      t('models', 'Six models side by side',
        'Return `channel`, `first_touch`, `last_touch`, `linear`, `position_based`, `time_decay` and `last_non_direct`. Order by linear descending.',
        `WITH t AS (SELECT * FROM attribution_touchpoints WHERE converted = 1),
decay AS (
  SELECT channel, conversion_value * SAFE_DIVIDE(touch_position,
            SUM(touch_position) OVER (PARTITION BY user_pseudo_id)) AS credit
  FROM t
),
decay_agg AS (SELECT channel, SUM(credit) AS time_decay FROM decay GROUP BY channel),
lnd AS (
  SELECT channel, SUM(conversion_value) AS last_non_direct
  FROM (
    SELECT channel, conversion_value,
           ROW_NUMBER() OVER (PARTITION BY user_pseudo_id ORDER BY touch_position DESC) AS rn
    FROM t WHERE channel != 'Direct'
  ) WHERE rn = 1
  GROUP BY channel
),
base AS (
  SELECT channel,
         SUM(CASE WHEN touch_position = 1 THEN conversion_value ELSE 0 END) AS first_touch,
         SUM(CASE WHEN touch_position = journey_length THEN conversion_value ELSE 0 END) AS last_touch,
         SUM(SAFE_DIVIDE(conversion_value, journey_length)) AS linear,
         SUM(CASE
               WHEN journey_length = 1 THEN conversion_value
               WHEN touch_position = 1 OR touch_position = journey_length THEN conversion_value * 0.4
               ELSE SAFE_DIVIDE(conversion_value * 0.2, journey_length - 2) END) AS position_based
  FROM t GROUP BY channel
)
SELECT b.channel, b.first_touch, b.last_touch, b.linear, b.position_based,
       COALESCE(d.time_decay, 0) AS time_decay,
       COALESCE(l.last_non_direct, 0) AS last_non_direct
FROM base b
LEFT JOIN decay_agg d USING (channel)
LEFT JOIN lnd l USING (channel)
ORDER BY b.linear DESC, b.channel`,
        ['Build each model in its own CTE, then join them at channel grain.',
          'Time decay and last-non-direct need window functions; the other four are conditional aggregation.',
          'Last-non-direct filters Direct out *before* picking the last touch.'],
        { orderMatters: true, chart: chart('bar', 0, [1, 2, 3], 'Credit by model') }),

      t('paths', 'Most common paths',
        'Return `path` and `conversions` for the 15 most common converting journeys.',
        `WITH j AS (
  SELECT user_pseudo_id, STRING_AGG(channel, ' > ' ORDER BY touch_position) AS path
  FROM attribution_touchpoints WHERE converted = 1 GROUP BY user_pseudo_id
)
SELECT path, COUNT(*) AS conversions
FROM j GROUP BY path ORDER BY conversions DESC, path LIMIT 15`,
        ['STRING_AGG with an ORDER BY inside it.',
          'Single-touch paths will dominate. That is the finding.'],
        { orderMatters: true }),

      t('model-spread', 'How much do the models disagree?',
        'Return `channel`, `min_credit`, `max_credit` and `spread_pct` across first-touch, last-touch and linear. Order by spread_pct descending.',
        `WITH base AS (
  SELECT channel,
         SUM(CASE WHEN touch_position = 1 THEN conversion_value ELSE 0 END) AS first_touch,
         SUM(CASE WHEN touch_position = journey_length THEN conversion_value ELSE 0 END) AS last_touch,
         SUM(SAFE_DIVIDE(conversion_value, journey_length)) AS linear
  FROM attribution_touchpoints WHERE converted = 1 GROUP BY channel
)
SELECT channel,
       LEAST(first_touch, last_touch, linear) AS min_credit,
       GREATEST(first_touch, last_touch, linear) AS max_credit,
       SAFE_DIVIDE(GREATEST(first_touch, last_touch, linear) - LEAST(first_touch, last_touch, linear),
                   LEAST(first_touch, last_touch, linear)) AS spread_pct
FROM base
ORDER BY spread_pct DESC, channel`,
        ['GREATEST and LEAST take any number of arguments.',
          'The channels with the widest spread are the ones your model choice decides.'],
        { orderMatters: true }),

      t('decision', 'The budget decision',
        'Return `channel`, `spend`, `linear_credit` and `linear_roas` for paid channels only. Order by linear_roas ascending. The cut candidate is at the top.',
        `WITH credit AS (
  SELECT channel, SUM(SAFE_DIVIDE(conversion_value, journey_length)) AS linear_credit
  FROM attribution_touchpoints WHERE converted = 1 GROUP BY channel
), spend AS (
  SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel
)
SELECT s.channel, s.spend, COALESCE(c.linear_credit, 0) AS linear_credit,
       SAFE_DIVIDE(c.linear_credit, s.spend) AS linear_roas
FROM spend s LEFT JOIN credit c USING (channel)
ORDER BY linear_roas ASC, s.channel`,
        ['Only channels you pay for can be cut.',
          'Ascending ROAS puts the weakest first, but read the caveat before you act on it.'],
        { orderMatters: true }),
    ],
  },
];

export function projectBySlug(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
