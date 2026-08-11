import { ex } from './helpers';

/**
 * Module 12, Thinking like an analyst (day 14).
 *
 * 6 exercises, all of them about judgement rather than syntax. Each one produces a
 * number that is technically correct and would be professionally negligent to publish
 * without the caveat attached, and asks the learner to produce the caveat too.
 */
export const M12 = [
  ex('12.1', 14, 'expert',
    "Simpson's paradox in channel data",
    'Return `device`, `channel`, `orders`, `revenue` and `aov` for completed orders on Paid Search and Paid Social, plus the same split by device. Order by device then channel. Then look at whether the channel ranking flips between devices.',
    ['orders'], ['segmentation', 'grain', 'rate-metrics'],
    `SELECT device, channel,
       COUNT(*) AS orders,
       SUM(gross_revenue) AS revenue,
       SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)) AS aov
FROM orders
WHERE status = 'completed'
  AND channel IN ('Paid Search', 'Paid Social')
GROUP BY device, channel
ORDER BY device, channel`,
    ['Group by both dimensions to see the interaction.',
      'Compare the AOV ranking within each device against the ranking overall.'],
    { orderMatters: true,
      explanation:
        "Simpson's paradox is when an aggregate comparison reverses inside every subgroup, because the groups have different mixes. Whenever you report a single comparative number, ask which confound could be driving it: device, geography, and new-vs-returning are the usual three." }),

  ex('12.2', 14, 'expert',
    'Sanity-check a number three ways',
    'Before publishing total 2024 revenue, verify it three ways: `from_orders`, `from_line_items` and `from_ga4_purchases`. They will not match exactly.',
    ['orders', 'order_items', 'ga4_events'], ['grain', 'join-fanout'],
    `SELECT
  (SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed') AS from_orders,
  (SELECT SUM(i.quantity * i.unit_price - i.line_discount)
   FROM order_items i
   JOIN orders o ON o.order_id = i.order_id
   WHERE o.status = 'completed') AS from_line_items,
  (SELECT SUM(ecommerce.purchase_revenue) FROM ga4_events WHERE event_name = 'purchase') AS from_ga4_purchases`,
    ['Three independent paths to the same concept.',
      'Each has a different grain and a different source system.',
      'Expect disagreement. The job is to explain its size and direction, not eliminate it.'],
    {
      explanation:
        'Order-level revenue includes seasonal uplift the line items do not carry, and GA4 only sees purchases that fired a tag on the website. Three numbers, three defensible definitions. Publishing one without knowing the other two is how analysts get ambushed in meetings.',
    }),

  ex('12.3', 14, 'expert',
    'Small samples lie',
    'Return `campaign_id`, `clicks`, `conversions` and `cvr` for Google campaigns, ordered by cvr descending. Notice which campaigns top the list and how few clicks they have.',
    ['google_ads_daily'], ['rate-metrics', 'grain'],
    `SELECT campaign_id,
       SUM(clicks) AS clicks,
       SUM(conversions) AS conversions,
       SAFE_DIVIDE(SUM(conversions), SUM(clicks)) AS cvr
FROM google_ads_daily
GROUP BY campaign_id
ORDER BY cvr DESC, campaign_id`,
    ['No minimum-volume filter here, on purpose.',
      'Look at the clicks column beside the rate.'],
    { orderMatters: true,
      explanation:
        'Rates computed on small denominators are noise wearing a number\'s clothes. The fix is a minimum-volume threshold, stated explicitly in the report: and chosen before you look at the results, not after.',
      trap: 'Ranking anything by a rate without a volume floor.' }),

  ex('12.4', 14, 'expert',
    'The denominator conversation',
    'Compute conversion rate four ways: per session, per user, per new user and per engaged session. Return all four from `ga4_sessions`, excluding QA traffic.',
    ['ga4_sessions'], ['rate-metrics', 'grain'],
    `SELECT
  SAFE_DIVIDE(SUM(converted), COUNT(*)) AS cvr_per_session,
  SAFE_DIVIDE(SUM(converted), COUNT(DISTINCT user_pseudo_id)) AS cvr_per_user,
  SAFE_DIVIDE(SUM(converted), COUNTIF(page_views = 1)) AS cvr_per_single_page_session,
  SAFE_DIVIDE(SUM(converted), COUNTIF(engaged = 1)) AS cvr_per_engaged_session
FROM ga4_sessions
WHERE source != 'internal-qa'`,
    ['Same numerator, four denominators.',
      'Each is a legitimate answer to "what is our conversion rate".'],
    {
      explanation:
        'These four numbers differ by more than a factor of two. Nobody who asks for "the conversion rate" knows which one they mean. Your job is to ask what decision it feeds, pick the denominator that matches, and then label it on the chart so the next person does not have to guess.',
    }),

  ex('12.5', 14, 'expert',
    'What the data cannot tell you',
    'Return `channel`, `spend`, `attributed_revenue` and `implied_roas` for paid channels. Then write down, in the reflection, why this number cannot establish that the spend caused the revenue.',
    ['ad_spend_daily', 'orders', 'customers'], ['roas', 'attribution', 'chained-cte'],
    `WITH spend AS (
  SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel
),
revenue AS (
  SELECT c.first_touch_channel AS channel, SUM(o.gross_revenue) AS attributed_revenue
  FROM orders o
  JOIN customers c ON c.customer_id = o.customer_id
  WHERE o.status = 'completed'
  GROUP BY c.first_touch_channel
)
SELECT s.channel, s.spend,
       COALESCE(r.attributed_revenue, 0) AS attributed_revenue,
       SAFE_DIVIDE(r.attributed_revenue, s.spend) AS implied_roas
FROM spend s
LEFT JOIN revenue r USING (channel)
ORDER BY implied_roas DESC, s.channel`,
    ['Standard spend-to-revenue join at channel grain.',
      'The SQL is easy. The epistemics are not.'],
    { orderMatters: true,
      explanation:
        'Every attribution model in this course is correlational. Brand search converts at a spectacular ROAS because it captures demand other channels created, turn it off and most of that revenue arrives through another door. Only a holdout test can separate incremental revenue from captured revenue, and no amount of SQL substitutes for it. Knowing this is the difference between an analyst and a reporting tool.' }),

  ex('12.6', 14, 'expert',
    'The number you would defend',
    'Produce the single slide: `metric` and `value` for the six numbers you would put in front of a CMO, as one row. Spend, revenue, gross profit, blended CAC, LTV:CAC and payback months.',
    ['ad_spend_daily', 'orders', 'customers', 'customer_ltv'], ['cac', 'ltv', 'roas'],
    `WITH s AS (SELECT SUM(spend) AS spend FROM ad_spend_daily),
c AS (SELECT COUNT(*) AS customers, AVG(lifetime_revenue) AS avg_ltv FROM customer_ltv),
o AS (SELECT SUM(gross_revenue) AS revenue, SUM(gross_revenue) - SUM(cogs) AS gross_profit
      FROM orders WHERE status = 'completed')
SELECT s.spend,
       o.revenue,
       o.gross_profit,
       SAFE_DIVIDE(s.spend, c.customers) AS blended_cac,
       SAFE_DIVIDE(c.avg_ltv, SAFE_DIVIDE(s.spend, c.customers)) AS ltv_cac,
       SAFE_DIVIDE(SAFE_DIVIDE(s.spend, c.customers), c.avg_ltv / 12) AS payback_months
FROM s, c, o`,
    ['Three single-row CTEs cross-joined together, a rare legitimate use of a comma join.',
      'A CROSS JOIN of one-row tables produces exactly one row.',
      'Every value here is one you have computed before; the skill is choosing which six.'],
    {
      explanation:
        'Six numbers, each one you can defend for ten minutes. That is the deliverable. Everything else in this course was practice for deciding what goes on this slide: and for being able to say, when challenged, exactly which rows are in each denominator.',
    }),
];
