import { ex } from './helpers';

/**
 * Module 4 — Aggregation, GROUP BY and HAVING (days 4 and 5).
 *
 * 40 exercises. The load-bearing idea is *never average a rate*: a weighted rate and
 * an average of rates are different numbers, and the second one is almost always
 * wrong. Several exercises here compute both side by side so the gap is undeniable.
 */
export const M04 = [
  // ── day 4: the aggregate functions themselves ──
  ex('4.1', 4, 'easy',
    'Total spend',
    'What did we spend on Google Ads across the whole year? Return one column, `total_spend`.',
    ['google_ads_daily'], ['sum'],
    'SELECT SUM(cost) AS total_spend FROM google_ads_daily',
    ['`SUM(col)` adds every value in the column.',
      'No GROUP BY is needed when you want a single total over everything.']),

  ex('4.2', 4, 'easy',
    'Three counts that disagree',
    'Return `all_rows` = COUNT(*), `rows_with_user` = COUNT(user_id), and `distinct_users` = COUNT(DISTINCT user_id) from `ga4_events`.',
    ['ga4_events'], ['count', 'null-handling'],
    `SELECT COUNT(*) AS all_rows,
       COUNT(user_id) AS rows_with_user,
       COUNT(DISTINCT user_id) AS distinct_users
FROM ga4_events`,
    ['`COUNT(*)` counts rows. `COUNT(col)` counts rows where col is not NULL.',
      '`COUNT(DISTINCT col)` counts unique non-NULL values.'],
    {
      explanation:
        'Three very different numbers from one table. `user_id` is NULL until someone logs in, so COUNT(user_id) silently reports only logged-in traffic. If you ever write "users" in a report, you must be able to say which of these three you meant.',
      trap: 'COUNT(column) looks like COUNT(*) but quietly skips NULLs.',
    }),

  ex('4.3', 4, 'easy',
    'Average order value',
    'Return the average `gross_revenue` of completed orders as `aov`.',
    ['orders'], ['avg', 'where'],
    "SELECT AVG(gross_revenue) AS aov FROM orders WHERE status = 'completed'",
    ['AVG ignores NULLs but not zeroes.',
      'Filter to completed orders so refunds do not drag the average negative.']),

  ex('4.4', 4, 'easy',
    'Cheapest and dearest',
    'Return `min_price` and `max_price` from `products`.',
    ['products'], ['min-max'],
    'SELECT MIN(list_price) AS min_price, MAX(list_price) AS max_price FROM products',
    ['MIN and MAX work on numbers, text and dates.',
      'Both go in the same SELECT list.']),

  ex('4.5', 4, 'easy',
    'How long is our data?',
    'Return `first_date` and `last_date` — the earliest and latest `order_date` in `orders`.',
    ['orders'], ['min-max'],
    'SELECT MIN(order_date) AS first_date, MAX(order_date) AS last_date FROM orders',
    ['MIN/MAX on an ISO date string gives the chronological extremes.',
      'This is the first query to run against any new table.']),

  ex('4.6', 4, 'easy',
    'Spend per channel type',
    'Return `channel_type` and `spend` (total cost) per channel type, highest spend first.',
    ['google_ads_daily', 'google_ads_campaigns'], ['group-by', 'sum', 'inner-join'],
    `SELECT c.channel_type, SUM(d.cost) AS spend
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY c.channel_type
ORDER BY spend DESC`,
    ['The channel type lives on the campaign table, the cost on the daily table.',
      'GROUP BY the column you are splitting by, SUM the measure.',
      'Every non-aggregated column in SELECT must appear in GROUP BY.'],
    { orderMatters: true }),

  ex('4.7', 4, 'easy',
    'Orders per channel',
    'Return `channel` and `orders` (a count of completed orders) per channel, most orders first.',
    ['orders'], ['group-by', 'count'],
    `SELECT channel, COUNT(*) AS orders
FROM orders
WHERE status = 'completed'
GROUP BY channel
ORDER BY orders DESC, channel`,
    ['WHERE filters rows before grouping.',
      'COUNT(*) inside a GROUP BY counts rows per group.'],
    { orderMatters: true }),

  ex('4.8', 4, 'medium',
    'Revenue and AOV per channel',
    'Return `channel`, `orders`, `revenue` and `aov` for completed orders, ordered by revenue descending.',
    ['orders'], ['group-by', 'sum', 'count', 'avg', 'rate-metrics'],
    `SELECT channel,
       COUNT(*) AS orders,
       SUM(gross_revenue) AS revenue,
       SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)) AS aov
FROM orders
WHERE status = 'completed'
GROUP BY channel
ORDER BY revenue DESC`,
    ['AOV is total revenue divided by order count.',
      'You can compute it as SUM/COUNT rather than AVG — they agree here, and SUM/COUNT is the habit that generalises.'],
    { orderMatters: true }),

  ex('4.9', 4, 'hard',
    'Never average a rate',
    'Compute Google Ads CTR two ways in one row: `weighted_ctr` = total clicks / total impressions, and `average_of_ctrs` = the mean of each row\'s own CTR. Then look at the gap.',
    ['google_ads_daily'], ['rate-metrics', 'avg', 'safe-divide'],
    `SELECT SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS weighted_ctr,
       AVG(SAFE_DIVIDE(clicks, impressions))      AS average_of_ctrs
FROM google_ads_daily`,
    ['The weighted version divides the totals.',
      'The naive version averages the per-row rates.',
      'Both are one line each — the lesson is in the difference, not the syntax.'],
    {
      explanation:
        'The two numbers are not close. Averaging per-row CTR gives a campaign-day with 12 impressions exactly as much weight as one with 40,000. The rule: **a rate is a ratio of sums, never a mean of ratios.** This single mistake is responsible for more wrong marketing dashboards than any other.',
      trap: 'AVG(rate) treats every row as equally important. It almost never is.',
    }),

  ex('4.10', 4, 'medium',
    'Channel scorecard',
    'Build the paid-media scorecard: per `channel_type`, return `spend`, `impressions`, `clicks`, `ctr`, `cpc`, `conversions` and `cpa`. Order by spend descending.',
    ['google_ads_daily', 'google_ads_campaigns'], ['group-by', 'rate-metrics', 'safe-divide', 'inner-join'],
    `SELECT c.channel_type,
       SUM(d.cost)         AS spend,
       SUM(d.impressions)  AS impressions,
       SUM(d.clicks)       AS clicks,
       SAFE_DIVIDE(SUM(d.clicks), SUM(d.impressions))  AS ctr,
       SAFE_DIVIDE(SUM(d.cost), SUM(d.clicks))         AS cpc,
       SUM(d.conversions)  AS conversions,
       SAFE_DIVIDE(SUM(d.cost), SUM(d.conversions))    AS cpa
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY c.channel_type
ORDER BY spend DESC`,
    ['Every rate is SUM(numerator) / SUM(denominator).',
      'Wrap each division in SAFE_DIVIDE — some channels have zero conversions.',
      'One GROUP BY, many aggregates.'],
    { orderMatters: true,
      explanation: 'This shape — dimension, then volumes, then rates derived from those volumes — is the backbone of nearly every paid-media report you will ever write.' }),

  ex('4.11', 4, 'medium',
    'COUNTIF for conditional counts',
    'Return `total_days`, `zero_click_days` and `zero_impression_days` from `google_ads_daily`.',
    ['google_ads_daily'], ['countif', 'count'],
    `SELECT COUNT(*) AS total_days,
       COUNTIF(clicks = 0) AS zero_click_days,
       COUNTIF(impressions = 0) AS zero_impression_days
FROM google_ads_daily`,
    ['`COUNTIF(condition)` counts the rows where the condition is true.',
      'It is BigQuery shorthand for `COUNT(CASE WHEN condition THEN 1 END)`.']),

  ex('4.12', 4, 'medium',
    'Distinct customers who bought',
    'Return `buyers` — the number of distinct customers with at least one completed order — and `orders`, the number of completed orders.',
    ['orders'], ['count', 'distinct'],
    `SELECT COUNT(DISTINCT customer_id) AS buyers, COUNT(*) AS orders
FROM orders
WHERE status = 'completed'`,
    ['Two aggregates over the same filtered set.',
      'The ratio between them is your repeat-purchase rate.']),

  ex('4.13', 4, 'medium',
    'Revenue by month',
    'Return `month` (the first day of each month) and `revenue` for completed orders, chronologically.',
    ['orders'], ['group-by', 'date-trunc', 'sum'],
    `SELECT DATE_TRUNC(order_date, MONTH) AS month,
       SUM(gross_revenue) AS revenue
FROM orders
WHERE status = 'completed'
GROUP BY month
ORDER BY month`,
    ['`DATE_TRUNC(date, MONTH)` snaps a date back to the first of its month.',
      'Group by the truncated value, not the raw date.'],
    { orderMatters: true }),

  ex('4.14', 4, 'medium',
    'Best day of week to sell',
    'Using `date_dim`, return `day_name`, `orders` and `revenue` for completed orders by day of week, ordered by revenue descending.',
    ['orders', 'date_dim'], ['group-by', 'inner-join', 'sum', 'count'],
    `SELECT d.day_name,
       COUNT(*) AS orders,
       SUM(o.gross_revenue) AS revenue
FROM orders o
JOIN date_dim d ON d.date = o.order_date
WHERE o.status = 'completed'
GROUP BY d.day_name
ORDER BY revenue DESC`,
    ['Join to date_dim to get the day name without date arithmetic.',
      'Group by the name, aggregate the orders.'],
    { orderMatters: true }),

  ex('4.15', 4, 'medium',
    'Top 10 spending campaigns',
    'Return `campaign_name` and `spend` for the ten highest-spending Google campaigns.',
    ['google_ads_daily', 'google_ads_campaigns'], ['group-by', 'sum', 'order-by', 'limit'],
    `SELECT c.campaign_name, SUM(d.cost) AS spend
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY c.campaign_name
ORDER BY spend DESC, c.campaign_name
LIMIT 10`,
    ['Group first, then sort by the aggregate, then limit.',
      'LIMIT runs last of all.'],
    { orderMatters: true }),

  ex('4.16', 4, 'medium',
    'Revenue per country, cleaned',
    'Return `country` and `revenue` from completed orders, but normalise `city`-style messiness by trimming and title-casing nothing — country is clean, so just group. Order by revenue descending.',
    ['orders'], ['group-by', 'sum'],
    `SELECT country, SUM(gross_revenue) AS revenue
FROM orders
WHERE status = 'completed'
GROUP BY country
ORDER BY revenue DESC, country`,
    ['A straight GROUP BY on a clean column.',
      'Compare this to grouping on `city`, which is not clean.'],
    { orderMatters: true }),

  ex('4.17', 4, 'hard',
    'The 8% of conversions you just deleted',
    'Return `raw_conversions` = SUM(conversions), and `truncated_conversions` = SUM(CAST(conversions AS INT64)) from `google_ads_daily`. Google reports fractional conversions.',
    ['google_ads_daily'], ['sum', 'math-functions'],
    `SELECT SUM(conversions) AS raw_conversions,
       SUM(CAST(conversions AS INT64)) AS truncated_conversions
FROM google_ads_daily`,
    ['`CAST(x AS INT64)` truncates towards zero — it does not round.',
      'Apply the cast per row, inside the SUM.'],
    {
      explanation:
        'Casting each row to an integer throws away the fractional part of every single row, and those fractions add up to a real number of conversions. Google attributes fractionally because one conversion can be credited across several ads. If you need whole numbers, round the *total*, never the rows.',
      trap: 'CAST truncates. ROUND rounds. They differ on every row with a fraction.',
    }),

  ex('4.18', 4, 'medium',
    'Group by a computed expression',
    'Bucket products into `price_band` — `budget` under 50, `mid` from 50 to 149, `premium` at 150 and above — and return the band with `products` and `avg_margin`. Order by avg_margin descending.',
    ['products'], ['group-by', 'case-when', 'avg'],
    `SELECT CASE WHEN list_price < 50 THEN 'budget'
            WHEN list_price < 150 THEN 'mid'
            ELSE 'premium' END AS price_band,
       COUNT(*) AS products,
       AVG(list_price - unit_cost) AS avg_margin
FROM products
GROUP BY price_band
ORDER BY avg_margin DESC`,
    ['A CASE expression can be grouped by, exactly like a column.',
      'CASE evaluates top to bottom and stops at the first match, so the bands do not need explicit lower bounds.'],
    { orderMatters: true }),

  ex('4.19', 4, 'medium',
    'Email engagement rates',
    'Per email `segment`, return `sends`, `open_rate` and `click_rate` (both weighted, using delivered as the denominator for opens and opens as the denominator for clicks). Order by open_rate descending.',
    ['email_campaigns'], ['group-by', 'rate-metrics', 'safe-divide'],
    `SELECT segment,
       SUM(sent) AS sends,
       SAFE_DIVIDE(SUM(unique_opens), SUM(delivered))     AS open_rate,
       SAFE_DIVIDE(SUM(unique_clicks), SUM(unique_opens)) AS click_rate
FROM email_campaigns
GROUP BY segment
ORDER BY open_rate DESC`,
    ['Open rate is opens over *delivered*, not over sent — bounces never had a chance to open.',
      'Click-to-open rate uses opens as the denominator.'],
    { orderMatters: true,
      explanation: 'Which denominator you choose changes the story. Click rate over *sent* measures the whole programme; click rate over *opens* measures the creative. Report the wrong one and you will optimise the wrong thing.' }),

  ex('4.20', 4, 'medium',
    'Subscription MRR by tier',
    'Return `tier`, `subs` and `mrr` for active subscriptions, ordered by mrr descending.',
    ['subscriptions', 'plans'], ['group-by', 'sum', 'inner-join'],
    `SELECT p.tier, COUNT(*) AS subs, SUM(s.mrr) AS mrr
FROM subscriptions s
JOIN plans p ON p.plan_id = s.plan_id
WHERE s.status = 'active'
GROUP BY p.tier
ORDER BY mrr DESC`,
    ['The tier is on plans, the MRR on subscriptions.',
      'Filter to active before aggregating.'],
    { orderMatters: true }),

  ex('4.21', 4, 'medium',
    'Meta performance by creative format',
    'Return `creative_format`, `spend`, `impressions`, `ctr`, `cpm` and `roas` (purchase_value / spend). Order by spend descending.',
    ['meta_ads_daily'], ['group-by', 'rate-metrics', 'safe-divide', 'roas'],
    `SELECT creative_format,
       SUM(spend) AS spend,
       SUM(impressions) AS impressions,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions))          AS ctr,
       SAFE_DIVIDE(SUM(spend), SUM(impressions)) * 1000    AS cpm,
       SAFE_DIVIDE(SUM(purchase_value), SUM(spend))        AS roas
FROM meta_ads_daily
GROUP BY creative_format
ORDER BY spend DESC`,
    ['Four aggregates and three derived rates from one GROUP BY.',
      'ROAS is revenue divided by spend — a multiple, not a percentage.'],
    { orderMatters: true }),

  ex('4.22', 4, 'hard',
    'Conditional aggregation is a pivot',
    'Return one row per `channel` with revenue split across devices: `mobile_revenue`, `desktop_revenue`, `tablet_revenue`, and `total_revenue`. Completed orders only, ordered by total_revenue descending.',
    ['orders'], ['group-by', 'conditional-aggregation', 'pivot', 'case-when'],
    `SELECT channel,
       SUM(CASE WHEN device = 'mobile'  THEN gross_revenue ELSE 0 END) AS mobile_revenue,
       SUM(CASE WHEN device = 'desktop' THEN gross_revenue ELSE 0 END) AS desktop_revenue,
       SUM(CASE WHEN device = 'tablet'  THEN gross_revenue ELSE 0 END) AS tablet_revenue,
       SUM(gross_revenue) AS total_revenue
FROM orders
WHERE status = 'completed'
GROUP BY channel
ORDER BY total_revenue DESC`,
    ['Put the CASE *inside* the SUM, not outside it.',
      'Each CASE contributes the revenue only for its own device and 0 otherwise.',
      'This turns rows into columns — a pivot, written by hand.'],
    { orderMatters: true,
      explanation: 'SUM(CASE WHEN …) is the single most useful pattern in analytical SQL. Anything you would build with a spreadsheet pivot table is this, plus a GROUP BY.' }),

  // ── day 5: GROUP BY / HAVING proper ──
  ex('4.23', 5, 'medium',
    'HAVING filters groups',
    'Return `campaign_id` and `spend` for Google campaigns that spent more than 20,000 in total. Order by spend descending.',
    ['google_ads_daily'], ['group-by', 'having', 'sum'],
    `SELECT campaign_id, SUM(cost) AS spend
FROM google_ads_daily
GROUP BY campaign_id
HAVING SUM(cost) > 20000
ORDER BY spend DESC`,
    ['WHERE filters rows before grouping; HAVING filters groups after.',
      'You cannot put an aggregate in WHERE.'],
    { orderMatters: true,
      trap: '`WHERE SUM(cost) > 20000` is an error — at WHERE time the sum does not exist yet.' }),

  ex('4.24', 5, 'medium',
    'WHERE and HAVING together',
    'Return `campaign_id`, `clicks` and `conversions` for SEARCH-campaign days in Q4 only, keeping campaigns with more than 500 clicks in the quarter. Order by clicks descending.',
    ['google_ads_daily', 'google_ads_campaigns'], ['group-by', 'having', 'where', 'inner-join'],
    `SELECT d.campaign_id,
       SUM(d.clicks) AS clicks,
       SUM(d.conversions) AS conversions
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
WHERE c.channel_type = 'SEARCH'
  AND d.date >= '2024-10-01'
GROUP BY d.campaign_id
HAVING SUM(d.clicks) > 500
ORDER BY clicks DESC, d.campaign_id`,
    ['Row-level conditions (channel, date) go in WHERE.',
      'Group-level conditions (total clicks) go in HAVING.',
      'Both can appear in the same query — they do different jobs.'],
    { orderMatters: true }),

  ex('4.25', 5, 'medium',
    'Group by two keys',
    'Return `country`, `device` and `revenue` for completed orders, ordered by revenue descending, top 15.',
    ['orders'], ['group-by', 'sum'],
    `SELECT country, device, SUM(gross_revenue) AS revenue
FROM orders
WHERE status = 'completed'
GROUP BY country, device
ORDER BY revenue DESC, country, device
LIMIT 15`,
    ['GROUP BY takes a list — the groups become every distinct combination.',
      'Both grouped columns must appear in SELECT if you want to see them.'],
    { orderMatters: true }),

  ex('4.26', 5, 'medium',
    'Repeat buyers',
    'Return `customer_id` and `orders` for customers with more than 3 completed orders, most orders first, top 20.',
    ['orders'], ['group-by', 'having', 'count'],
    `SELECT customer_id, COUNT(*) AS orders
FROM orders
WHERE status = 'completed'
GROUP BY customer_id
HAVING COUNT(*) > 3
ORDER BY orders DESC, customer_id
LIMIT 20`,
    ['Count per customer, then filter the counts with HAVING.',
      'HAVING sees the aggregate; WHERE would not. Sort by the count and take 20.'],
    { orderMatters: true }),

  ex('4.27', 5, 'medium',
    'Keywords worth looking at',
    'Return `keyword_id`, `clicks`, `cost` and `cpa` for keywords with at least 100 clicks and at least one conversion. Order by cpa descending, top 20 — the worst offenders first.',
    ['google_ads_keyword_daily'], ['group-by', 'having', 'safe-divide', 'rate-metrics'],
    `SELECT keyword_id,
       SUM(clicks) AS clicks,
       SUM(cost) AS cost,
       SAFE_DIVIDE(SUM(cost), SUM(conversions)) AS cpa
FROM google_ads_keyword_daily
GROUP BY keyword_id
HAVING SUM(clicks) >= 100 AND SUM(conversions) > 0
ORDER BY cpa DESC, keyword_id
LIMIT 20`,
    ['Two conditions in HAVING, joined by AND.',
      'Requiring at least one conversion keeps the CPA finite.'],
    { orderMatters: true,
      explanation: 'The minimum-clicks threshold is not fussiness. A keyword with 4 clicks and no conversions has a CPA of infinity and tells you nothing; you need enough volume for the number to mean something.' }),

  ex('4.28', 5, 'hard',
    'Zero-conversion keywords',
    'Find keywords that burned money and returned nothing. Return `keyword_id`, `clicks` and `cost` for keywords with at least 50 clicks and exactly zero conversions across the year. Highest cost first, top 20.',
    ['google_ads_keyword_daily'], ['group-by', 'having', 'sum'],
    `SELECT keyword_id,
       SUM(clicks) AS clicks,
       SUM(cost) AS cost
FROM google_ads_keyword_daily
GROUP BY keyword_id
HAVING SUM(clicks) >= 50 AND SUM(conversions) = 0
ORDER BY cost DESC, keyword_id
LIMIT 20`,
    ['A group can be filtered on an aggregate that is not in the SELECT list.',
      'SUM(conversions) = 0 across the whole year is the "returned nothing" test.'],
    { orderMatters: true }),

  ex('4.29', 5, 'medium',
    'Sessions and conversion rate by channel',
    'Return `channel_group`, `sessions`, `conversions` and `cvr` from `ga4_sessions`, excluding internal QA traffic. Order by sessions descending.',
    ['ga4_sessions'], ['group-by', 'rate-metrics', 'safe-divide', 'where'],
    `SELECT channel_group,
       COUNT(*) AS sessions,
       SUM(converted) AS conversions,
       SAFE_DIVIDE(SUM(converted), COUNT(*)) AS cvr
FROM ga4_sessions
WHERE source != 'internal-qa'
GROUP BY channel_group
ORDER BY sessions DESC`,
    ['`converted` is a 0/1 flag, so SUM of it is a count of conversions.',
      'Filter the QA traffic out before aggregating.'],
    { orderMatters: true }),

  ex('4.30', 5, 'medium',
    'Landing page performance',
    'Return `landing_page`, `sessions`, `conversions` and `cvr`, for pages with at least 100 sessions. Order by cvr descending.',
    ['ga4_sessions'], ['group-by', 'having', 'rate-metrics', 'safe-divide'],
    `SELECT landing_page,
       COUNT(*) AS sessions,
       SUM(converted) AS conversions,
       SAFE_DIVIDE(SUM(converted), COUNT(*)) AS cvr
FROM ga4_sessions
WHERE source != 'internal-qa'
GROUP BY landing_page
HAVING COUNT(*) >= 100
ORDER BY cvr DESC, landing_page`,
    ['The minimum-sessions filter belongs in HAVING, because it is a property of the group.',
      'Sort by the computed rate.'],
    { orderMatters: true }),

  ex('4.31', 5, 'medium',
    'Support load by category',
    'Return `category`, `tickets`, `resolved` and `avg_csat` from `support_tickets`, ordered by tickets descending.',
    ['support_tickets'], ['group-by', 'count', 'avg', 'null-handling'],
    `SELECT category,
       COUNT(*) AS tickets,
       COUNTIF(resolved_at IS NOT NULL) AS resolved,
       AVG(csat) AS avg_csat
FROM support_tickets
GROUP BY category
ORDER BY tickets DESC, category`,
    ['COUNTIF for the conditional count.',
      'AVG(csat) skips the NULLs automatically — which is what you want here, since an unsurveyed ticket has no score.'],
    { orderMatters: true,
      explanation: 'AVG ignoring NULLs is usually right and occasionally catastrophic. Here it is right: an unsurveyed ticket should not count as a zero. For a metric like "average discount" it would be wrong, because a missing discount really is zero.' }),

  ex('4.32', 5, 'hard',
    'Lifecycle funnel counts',
    'From `hubspot_contacts`, return one row with `contacts`, `mqls`, `sqls` and `customers` — counting contacts that reached each stage by their stage dates, not their current label.',
    ['hubspot_contacts'], ['count', 'countif', 'null-handling', 'funnel'],
    `SELECT COUNT(*) AS contacts,
       COUNTIF(mql_date IS NOT NULL) AS mqls,
       COUNTIF(sql_date IS NOT NULL) AS sqls,
       COUNTIF(became_customer_date IS NOT NULL) AS customers
FROM hubspot_contacts`,
    ['Each stage has its own date column, NULL until the contact reaches it.',
      'COUNTIF on IS NOT NULL gives the number that reached each stage.'],
    { explanation: 'Counting by stage *dates* rather than by the current `lifecycle_stage` label matters: the label only tells you where someone is now, so counting it undercounts every earlier stage that people have already passed through.' }),

  ex('4.33', 5, 'hard',
    'Stage conversion rates',
    'Extend the funnel: return `contacts`, `mqls`, `sqls`, `customers`, plus `lead_to_mql`, `mql_to_sql` and `sql_to_customer` as rates.',
    ['hubspot_contacts'], ['countif', 'rate-metrics', 'safe-divide', 'funnel'],
    `SELECT COUNT(*) AS contacts,
       COUNTIF(mql_date IS NOT NULL) AS mqls,
       COUNTIF(sql_date IS NOT NULL) AS sqls,
       COUNTIF(became_customer_date IS NOT NULL) AS customers,
       SAFE_DIVIDE(COUNTIF(mql_date IS NOT NULL), COUNT(*)) AS lead_to_mql,
       SAFE_DIVIDE(COUNTIF(sql_date IS NOT NULL), COUNTIF(mql_date IS NOT NULL)) AS mql_to_sql,
       SAFE_DIVIDE(COUNTIF(became_customer_date IS NOT NULL), COUNTIF(sql_date IS NOT NULL)) AS sql_to_customer
FROM hubspot_contacts`,
    ['Each rate is one stage count divided by the previous stage count.',
      'Reuse the same COUNTIF expressions in the numerator and denominator.'],
    { explanation: 'Step-to-step rates, not step-to-top rates. Both are legitimate; mixing them in one table is not, and it happens constantly.' }),

  ex('4.34', 5, 'hard',
    'Spend concentration',
    'What share of Google spend goes to the top campaigns? Return `campaign_id`, `spend`, and `pct_of_total` — each campaign\'s share of all Google spend. Order by spend descending, top 10.',
    ['google_ads_daily'], ['group-by', 'subquery', 'rate-metrics', 'percent-of-total'],
    `SELECT campaign_id,
       SUM(cost) AS spend,
       SAFE_DIVIDE(SUM(cost), (SELECT SUM(cost) FROM google_ads_daily)) AS pct_of_total
FROM google_ads_daily
GROUP BY campaign_id
ORDER BY spend DESC, campaign_id
LIMIT 10`,
    ['The denominator is a single number covering the whole table.',
      'A scalar subquery `(SELECT SUM(cost) FROM …)` can sit inside an aggregate expression.',
      'On day 10 you will do this more elegantly with a window function.'],
    { orderMatters: true }),

  ex('4.35', 5, 'hard',
    'Monthly spend, clicks and blended CPC',
    'From the `ad_spend_daily` view, return `month`, `spend`, `clicks` and `cpc` across all platforms, chronologically.',
    ['ad_spend_daily'], ['group-by', 'date-trunc', 'rate-metrics', 'safe-divide'],
    `SELECT DATE_TRUNC(date, MONTH) AS month,
       SUM(spend) AS spend,
       SUM(clicks) AS clicks,
       SAFE_DIVIDE(SUM(spend), SUM(clicks)) AS cpc
FROM ad_spend_daily
GROUP BY month
ORDER BY month`,
    ['`ad_spend_daily` already unions Google, Meta and LinkedIn into one shape.',
      'Truncate the date to month and group by it.'],
    { orderMatters: true }),

  ex('4.36', 5, 'hard',
    'Platform comparison',
    'From `ad_spend_daily`, return `platform`, `spend`, `clicks`, `cpc`, `platform_conversions` and `cost_per_conversion`. Order by spend descending.',
    ['ad_spend_daily'], ['group-by', 'rate-metrics', 'safe-divide', 'cac'],
    `SELECT platform,
       SUM(spend) AS spend,
       SUM(clicks) AS clicks,
       SAFE_DIVIDE(SUM(spend), SUM(clicks)) AS cpc,
       SUM(platform_conversions) AS platform_conversions,
       SAFE_DIVIDE(SUM(spend), SUM(platform_conversions)) AS cost_per_conversion
FROM ad_spend_daily
GROUP BY platform
ORDER BY spend DESC`,
    ['One GROUP BY over the unioned view.',
      'Note that a LinkedIn "conversion" is a lead and a Meta one is a purchase.'],
    { orderMatters: true,
      trap: 'Comparing cost_per_conversion across platforms as though the conversions were the same thing. They are not — LinkedIn counts lead-form fills, Meta counts purchases on a 7-day-click window, Google counts last-click conversions.' }),

  ex('4.37', 5, 'hard',
    'Which cities actually matter',
    'Return `city` and `revenue` for completed orders, cleaning the messy city values first, keeping only cities with more than 5,000 in revenue. Order by revenue descending.',
    ['orders'], ['group-by', 'having', 'string-functions'],
    `SELECT INITCAP(TRIM(city)) AS city,
       SUM(gross_revenue) AS revenue
FROM orders
WHERE status = 'completed'
GROUP BY INITCAP(TRIM(city))
HAVING SUM(gross_revenue) > 5000
ORDER BY revenue DESC, city`,
    ['Clean the column in both SELECT and GROUP BY, or the groups will not collapse.',
      '`TRIM` removes whitespace, `INITCAP` normalises capitalisation.',
      'HAVING filters the cleaned groups.'],
    { orderMatters: true,
      trap: 'Cleaning in SELECT but grouping on the raw column. The output looks tidy but the rows are still split.' }),

  ex('4.38', 5, 'hard',
    'Products that never sold',
    'Return `product_id` and `units` for products in `order_items`, ordered by units ascending, bottom 10 — the slowest movers.',
    ['order_items'], ['group-by', 'sum', 'order-by'],
    `SELECT product_id, SUM(quantity) AS units
FROM order_items
GROUP BY product_id
ORDER BY units ASC, product_id
LIMIT 10`,
    ['Aggregate quantity per product.',
      'Ascending order puts the worst first.'],
    { orderMatters: true,
      explanation: 'This finds the slowest *sellers*, not products that never sold at all — a product absent from order_items has no row here to be counted. Finding true zeroes needs a LEFT JOIN from products, which is day 6.' }),

  ex('4.39', 5, 'expert',
    'Weighted vs unweighted, per campaign',
    'For every Google campaign, return `campaign_id`, `weighted_ctr` and `mean_daily_ctr`, plus `gap` = weighted minus mean. Order by the absolute size of the gap descending, top 15.',
    ['google_ads_daily'], ['group-by', 'rate-metrics', 'safe-divide', 'avg'],
    `SELECT campaign_id,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS weighted_ctr,
       AVG(SAFE_DIVIDE(clicks, impressions))      AS mean_daily_ctr,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) - AVG(SAFE_DIVIDE(clicks, impressions)) AS gap
FROM google_ads_daily
GROUP BY campaign_id
ORDER BY ABS(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) - AVG(SAFE_DIVIDE(clicks, impressions))) DESC,
         campaign_id
LIMIT 15`,
    ['Compute both rates per campaign, then subtract.',
      'ORDER BY can contain an aggregate expression — including ABS() around one.'],
    { orderMatters: true,
      explanation: 'The gap is largest for campaigns whose daily volume is most uneven, because that is exactly when equal-weighting each day distorts the most. Steady campaigns barely differ; bursty ones differ enormously.' }),

  ex('4.40', 5, 'expert',
    'The Monday scorecard',
    'Build the weekly paid-media scorecard for the last full quarter (2024-10-01 to 2024-12-31): per `platform`, return `spend`, `clicks`, `cpc`, `platform_conversions`, `cpa`, and `active_days` (the number of distinct dates with any spend). Order by spend descending.',
    ['ad_spend_daily'], ['group-by', 'rate-metrics', 'safe-divide', 'count', 'distinct', 'where'],
    `SELECT platform,
       SUM(spend) AS spend,
       SUM(clicks) AS clicks,
       SAFE_DIVIDE(SUM(spend), SUM(clicks)) AS cpc,
       SUM(platform_conversions) AS platform_conversions,
       SAFE_DIVIDE(SUM(spend), SUM(platform_conversions)) AS cpa,
       COUNT(DISTINCT date) AS active_days
FROM ad_spend_daily
WHERE date BETWEEN '2024-10-01' AND '2024-12-31'
  AND spend > 0
GROUP BY platform
ORDER BY spend DESC`,
    ['Filter the date range in WHERE.',
      'COUNT(DISTINCT date) counts days, not rows.',
      'Excluding zero-spend rows makes "active days" mean what a stakeholder expects.'],
    { orderMatters: true,
      explanation: '`active_days` is the sanity check that stops you comparing a platform that ran all quarter with one that ran for three weeks. Always report the denominator alongside the rate.' }),
];
