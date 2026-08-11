import type { InterviewSet, InterviewQuestion, Difficulty } from './types';

/**
 * Ten company-styled SQL interview sets.
 *
 * Each set is calibrated to what that company's data round actually optimises for,
 * Google wants scale and edge cases, Amazon wants the metric definition, Airbnb wants
 * marketplace two-sidedness, Razorpay wants transaction integrity. Questions strictly
 * increase in difficulty, and every one carries an `interviewerNote`: what a strong
 * candidate says out loud *before* they start typing.
 */

const q = (
  id: string,
  difficulty: Difficulty,
  timeLimit: number,
  prompt: string,
  solution: string,
  hints: string[],
  interviewerNote: string,
  extra: Partial<InterviewQuestion> = {},
): InterviewQuestion => ({
  id, difficulty, timeLimit, prompt, solution: solution.trim(), hints, interviewerNote, ...extra,
});

export const INTERVIEWS: InterviewSet[] = [
  {
    slug: 'google',
    company: 'Google',
    role: 'Product Analyst, Ads',
    blurb: 'Four questions on the account you would be analysing on day one.',
    style:
      'Google\'s SQL round is less about syntax and more about whether you notice the edge case. ' +
      'Expect to be interrupted and asked "what happens if that column is NULL?"',
    difficulty: 'hard',
    questions: [
      q('g1', 'easy', 300,
        'Return the total spend and total clicks across the Google Ads account for 2024, as `spend` and `clicks`.',
        'SELECT SUM(cost) AS spend, SUM(clicks) AS clicks FROM google_ads_daily',
        ['One table, two aggregates.', 'No grouping needed for a grand total.'],
        'Say the grain out loud before you type: google_ads_daily is one row per date per ad group, so a bare SUM is an account total.'),

      q('g2', 'medium', 420,
        'Return `channel_type`, `spend` and `ctr` per channel type, ordered by spend descending.',
        `SELECT c.channel_type, SUM(d.cost) AS spend,
       SAFE_DIVIDE(SUM(d.clicks), SUM(d.impressions)) AS ctr
FROM google_ads_daily d JOIN google_ads_campaigns c USING (campaign_id)
GROUP BY c.channel_type ORDER BY spend DESC`,
        ['The channel type lives on the campaign dimension.',
          'CTR is a ratio of sums, not an average of rates.'],
        'The interviewer is checking whether you write AVG(clicks/impressions). Say "weighted" as you write SUM/SUM.',
        { orderMatters: true, followUp: 'Why not AVG(clicks / impressions)?' }),

      q('g3', 'hard', 600,
        'For each campaign, return `campaign_name`, `spend`, `conversions` and `cpa`, keeping only campaigns with at least 100 conversions. Order by cpa ascending.',
        `SELECT c.campaign_name, SUM(d.cost) AS spend, SUM(d.conversions) AS conversions,
       SAFE_DIVIDE(SUM(d.cost), SUM(d.conversions)) AS cpa
FROM google_ads_daily d JOIN google_ads_campaigns c USING (campaign_id)
GROUP BY c.campaign_name
HAVING SUM(d.conversions) >= 100
ORDER BY cpa, c.campaign_name`,
        ['The volume threshold is on an aggregate, so HAVING.',
          'conversions is fractional. Do not cast it.'],
        'Mention that conversions are fractional in Google Ads and that casting to INT loses ~8%. That single sentence separates candidates.',
        { orderMatters: true }),

      q('g4', 'hard', 720,
        'Return the top 2 campaigns by spend within each channel type: `channel_type`, `campaign_name`, `spend`, `rank_in_channel`. Order by channel_type then rank.',
        `WITH s AS (
  SELECT c.channel_type, c.campaign_name, SUM(d.cost) AS spend
  FROM google_ads_daily d JOIN google_ads_campaigns c USING (campaign_id)
  GROUP BY c.channel_type, c.campaign_name
)
SELECT channel_type, campaign_name, spend,
       RANK() OVER (PARTITION BY channel_type ORDER BY spend DESC) AS rank_in_channel
FROM s
QUALIFY RANK() OVER (PARTITION BY channel_type ORDER BY spend DESC) <= 2
ORDER BY channel_type, rank_in_channel, campaign_name`,
        ['Aggregate first, then rank the aggregates.',
          'QUALIFY filters on a window function; WHERE cannot.'],
        'Top-N-per-group is the most-asked window question in existence. Know both the QUALIFY form and the subquery form, and say which engines support which.',
        { orderMatters: true, followUp: 'What changes if two campaigns tie on spend?' }),

      q('g5', 'expert', 900,
        'Return `campaign_name`, `spend`, `conversions`, `cpa` and `cpa_vs_channel`, each campaign\'s CPA divided by its own channel type\'s CPA. Campaigns with at least 50 conversions only. Order by cpa_vs_channel descending, top 15.',
        `WITH camp AS (
  SELECT c.channel_type, c.campaign_name,
         SUM(d.cost) AS spend, SUM(d.conversions) AS conversions
  FROM google_ads_daily d JOIN google_ads_campaigns c USING (campaign_id)
  GROUP BY c.channel_type, c.campaign_name
  HAVING SUM(d.conversions) >= 50
)
SELECT campaign_name, spend, conversions,
       SAFE_DIVIDE(spend, conversions) AS cpa,
       SAFE_DIVIDE(SAFE_DIVIDE(spend, conversions),
                   SAFE_DIVIDE(SUM(spend) OVER (PARTITION BY channel_type),
                               SUM(conversions) OVER (PARTITION BY channel_type))) AS cpa_vs_channel
FROM camp
ORDER BY cpa_vs_channel DESC, campaign_name
LIMIT 15`,
        ['You need both a row-level CPA and its channel\'s CPA on the same row.',
          'Windowed SUMs over the partition give the channel totals without a second query.',
          'The channel CPA must be SUM(spend)/SUM(conversions) over the partition, not an average of CPAs.'],
        'The trap is computing the channel benchmark as AVG(cpa) OVER (...). That is averaging a rate again. Weight it.',
        { orderMatters: true }),
    ],
  },

  {
    slug: 'amazon',
    company: 'Amazon',
    role: 'Business Analyst, Retail',
    blurb: 'Metric-definition heavy. Expect to be asked to defend every denominator.',
    style:
      'Amazon interviews test whether you can turn a vague business question into a precise ' +
      'metric. They will deliberately under-specify and see if you ask.',
    difficulty: 'hard',
    questions: [
      q('a1', 'easy', 300,
        'Return `orders` and `revenue` for completed orders in 2024.',
        "SELECT COUNT(*) AS orders, SUM(gross_revenue) AS revenue FROM orders WHERE status = 'completed'",
        ['Filter to completed before aggregating.'],
        'Ask whether "revenue" includes refunds before you write anything. In this schema refunds are negative rows with a different status.'),

      q('a2', 'medium', 420,
        'Return `category`, `units` and `revenue` from order line items on completed orders. Order by revenue descending.',
        `SELECT p.category, SUM(i.quantity) AS units,
       SUM(i.quantity * i.unit_price - i.line_discount) AS revenue
FROM order_items i
JOIN products p USING (product_id)
JOIN orders o USING (order_id)
WHERE o.status = 'completed'
GROUP BY p.category ORDER BY revenue DESC`,
        ['Work at line-item grain.',
          'Never sum orders.gross_revenue after joining to line items.'],
        'Say "I am summing a line-item measure because the join changed the grain". That is the whole question.',
        { orderMatters: true }),

      q('a3', 'medium', 480,
        'Return `month`, `orders`, `revenue` and `aov` for completed orders. Chronological.',
        `SELECT DATE_TRUNC(order_date, MONTH) AS month,
       COUNT(*) AS orders, SUM(gross_revenue) AS revenue,
       SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)) AS aov
FROM orders WHERE status = 'completed'
GROUP BY month ORDER BY month`,
        ['DATE_TRUNC to month, then group by it.'],
        'AOV is total revenue over total orders. If you write AVG(gross_revenue) you will get the same answer here and the wrong answer the moment refunds enter the filter.',
        { orderMatters: true }),

      q('a4', 'hard', 600,
        'Return `customer_id`, `orders`, `revenue` for customers with 3 or more completed orders, ordered by revenue descending, top 20.',
        `SELECT customer_id, COUNT(*) AS orders, SUM(gross_revenue) AS revenue
FROM orders WHERE status = 'completed'
GROUP BY customer_id
HAVING COUNT(*) >= 3
ORDER BY revenue DESC, customer_id
LIMIT 20`,
        ['HAVING for the group-level threshold.'],
        'Watch the duplicate order_ids in this table. A candidate who mentions deduplication unprompted is showing they audit before they aggregate.',
        { orderMatters: true, followUp: 'This table has 26 exact duplicate rows. How would your answer change?' }),

      q('a5', 'hard', 720,
        'Return `month`, `revenue`, `prev_month` and `mom_growth` for completed orders. Chronological.',
        `WITH m AS (
  SELECT DATE_TRUNC(order_date, MONTH) AS month, SUM(gross_revenue) AS revenue
  FROM orders WHERE status = 'completed' GROUP BY month
)
SELECT month, revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_month,
       SAFE_DIVIDE(revenue - LAG(revenue) OVER (ORDER BY month),
                   LAG(revenue) OVER (ORDER BY month)) AS mom_growth
FROM m ORDER BY month`,
        ['Aggregate to month first so LAG steps one month, not one row.',
          'The first month has no previous value. That NULL is correct.'],
        'Aggregate before you window. Applying LAG to raw order rows is the most common wrong answer to this question.',
        { orderMatters: true }),

      q('a6', 'expert', 900,
        'Return `cohort_month`, `month_number`, `customers` and `retention_rate` for order cohorts, limit 40.',
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
FROM matrix ORDER BY cohort_month, month_number LIMIT 40`,
        ['Cohort → activity → matrix → rate, one CTE each.',
          'FIRST_VALUE within the cohort gives the month-0 denominator.'],
        'Name your CTEs after what they contain. On a whiteboard, a readable four-step answer beats a correct one-liner every time.',
        { orderMatters: true }),
    ],
  },

  {
    slug: 'meta',
    company: 'Meta',
    role: 'Data Scientist, Growth',
    blurb: 'Funnels, cohorts and product events. Speed matters here.',
    style:
      'Meta gives you less time per question and expects window functions without hesitation. ' +
      'They care about whether your funnel is session-scoped or user-scoped, and whether you said so.',
    difficulty: 'hard',
    questions: [
      q('m1', 'easy', 240,
        'Return `event_name` and `events` from `ga4_events`, ordered by events descending.',
        'SELECT event_name, COUNT(*) AS events FROM ga4_events GROUP BY event_name ORDER BY events DESC, event_name',
        ['One row per event in this table.'],
        'State the grain first. It takes four seconds and it frames everything after.',
        { orderMatters: true }),

      q('m2', 'medium', 420,
        'Return `sessions`, `carts` and `purchases`, distinct sessions reaching each step.',
        `WITH s AS (
  SELECT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING)) AS k,
         MAX(CASE WHEN event_name = 'session_start' THEN 1 ELSE 0 END) a,
         MAX(CASE WHEN event_name = 'add_to_cart' THEN 1 ELSE 0 END) b,
         MAX(CASE WHEN event_name = 'purchase' THEN 1 ELSE 0 END) c
  FROM ga4_events GROUP BY k
)
SELECT SUM(a) AS sessions, SUM(b) AS carts, SUM(c) AS purchases FROM s`,
        ['Flatten to one row per session with a flag per step.',
          'The session key is user_pseudo_id plus ga_session_id.'],
        'Say "this is an any-order funnel" before you write it. If they wanted strict order they will tell you, and you will have shown you know the difference.'),

      q('m3', 'medium', 480,
        'Return `device_category` and `cvr`, purchase rate per session by device. Order by cvr descending.',
        `WITH s AS (
  SELECT CONCAT(e.user_pseudo_id, '-', CAST(e.ga_session_id AS STRING)) AS k,
         MAX(e.device.category) AS device_category,
         MAX(CASE WHEN e.event_name = 'purchase' THEN 1 ELSE 0 END) AS purchased
  FROM ga4_events e GROUP BY k
)
SELECT device_category, SAFE_DIVIDE(SUM(purchased), COUNT(*)) AS cvr
FROM s GROUP BY device_category ORDER BY cvr DESC, device_category`,
        ['device is a STRUCT: reach in with a dot, no UNNEST.',
          'MAX carries the constant device value through the grouping.'],
        'Knowing that STRUCT needs a dot and ARRAY needs UNNEST is the single most useful GA4 fact in an interview.',
        { orderMatters: true }),

      q('m4', 'hard', 600,
        'Return `user_pseudo_id`, `sessions` and `days_active` for the 20 most engaged devices by sessions.',
        `SELECT user_pseudo_id,
       COUNT(DISTINCT ga_session_id) AS sessions,
       COUNT(DISTINCT event_date) AS days_active
FROM ga4_events
GROUP BY user_pseudo_id
ORDER BY sessions DESC, user_pseudo_id
LIMIT 20`,
        ['Two COUNT DISTINCTs over different columns.',
          'Within one user_pseudo_id, ga_session_id is already unique.'],
        'Note out loud that ga_session_id is only unique *within* a user. Here you have partitioned by user already, so a plain COUNT DISTINCT is safe.',
        { orderMatters: true }),

      q('m5', 'hard', 720,
        'Return `event_date`, `daily_users` and `rolling_7d_users` for the first 30 days of March. Chronological.',
        `WITH d AS (
  SELECT event_date, COUNT(DISTINCT user_pseudo_id) AS daily_users
  FROM ga4_events
  WHERE event_date BETWEEN '20240301' AND '20240331'
  GROUP BY event_date
)
SELECT event_date, daily_users,
       SUM(daily_users) OVER (ORDER BY event_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7d_users
FROM d ORDER BY event_date`,
        ['Aggregate per day first so the ROWS frame counts days.',
          'A 7-day frame is 6 PRECEDING plus the current row.'],
        'Flag that this rolling sum double-counts users active on several days. A true rolling-7-day-unique needs a self join. Interviewers love that catch.',
        { orderMatters: true }),

      q('m6', 'expert', 900,
        'Return `channel`, `sessions`, `purchases` and `cvr` by rebuilding channel grouping from event_params. Order by sessions descending.',
        `WITH s AS (
  SELECT CONCAT(e.user_pseudo_id, '-', CAST(e.ga_session_id AS STRING)) AS k,
         MAX((SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'medium')) AS medium,
         MAX(CASE WHEN e.event_name = 'purchase' THEN 1 ELSE 0 END) AS purchased
  FROM ga4_events e GROUP BY k
)
SELECT CASE
         WHEN medium = 'cpc' THEN 'Paid Search'
         WHEN medium = 'paid_social' THEN 'Paid Social'
         WHEN medium = 'organic' THEN 'Organic Search'
         WHEN medium = 'email' THEN 'Email'
         WHEN medium = 'referral' THEN 'Referral'
         WHEN medium = 'display' THEN 'Display'
         WHEN medium = 'affiliate' THEN 'Affiliate'
         WHEN medium = '(none)' THEN 'Direct'
         ELSE 'Other' END AS channel,
       COUNT(*) AS sessions,
       SUM(purchased) AS purchases,
       SAFE_DIVIDE(SUM(purchased), COUNT(*)) AS cvr
FROM s GROUP BY channel ORDER BY sessions DESC, channel`,
        ['Pull medium out of event_params with a scalar subquery over UNNEST.',
          'Collapse to session grain first, then apply the CASE ladder.',
          'An ELSE branch stops traffic disappearing.'],
        'Always include the ELSE. An interviewer will ask what happens to a medium you did not anticipate, and "it vanishes" is the wrong answer.',
        { orderMatters: true }),
    ],
  },

  {
    slug: 'hubspot',
    company: 'HubSpot',
    role: 'Marketing Analyst',
    blurb: 'Lifecycle funnels and CRM data quality. Very close to the day job.',
    style:
      'HubSpot asks about the CRM funnel and how you handle records that skip stages or sit ' +
      'open forever. NULL handling is the whole interview.',
    difficulty: 'medium',
    questions: [
      q('h1', 'easy', 300,
        'Return `lifecycle_stage` and `contacts` from `hubspot_contacts`, ordered by contacts descending.',
        'SELECT lifecycle_stage, COUNT(*) AS contacts FROM hubspot_contacts GROUP BY lifecycle_stage ORDER BY contacts DESC, lifecycle_stage',
        ['Simple group and count.'],
        'Note that lifecycle_stage is where the contact is *now*, it undercounts every earlier stage they passed through.',
        { orderMatters: true }),

      q('h2', 'medium', 420,
        'Return `contacts`, `mqls`, `sqls` and `customers` counted from the stage date columns, not the label.',
        `SELECT COUNT(*) AS contacts,
       COUNTIF(mql_date IS NOT NULL) AS mqls,
       COUNTIF(sql_date IS NOT NULL) AS sqls,
       COUNTIF(became_customer_date IS NOT NULL) AS customers
FROM hubspot_contacts`,
        ['Each stage has its own nullable date column.',
          'COUNTIF over IS NOT NULL counts those who reached the stage.'],
        'This is the question. Counting by label gives a funnel that does not decrease monotonically, and explaining why is the answer they want.'),

      q('h3', 'medium', 480,
        'Return `original_source`, `contacts`, `mqls` and `mql_rate`, keeping sources with 100+ contacts. Order by mql_rate descending.',
        `SELECT original_source, COUNT(*) AS contacts,
       COUNTIF(mql_date IS NOT NULL) AS mqls,
       SAFE_DIVIDE(COUNTIF(mql_date IS NOT NULL), COUNT(*)) AS mql_rate
FROM hubspot_contacts
GROUP BY original_source
HAVING COUNT(*) >= 100
ORDER BY mql_rate DESC, original_source`,
        ['Rate per source, with a volume floor in HAVING.'],
        'Always state your minimum-volume threshold and why you picked it before you look at the results.',
        { orderMatters: true }),

      q('h4', 'hard', 600,
        'Return `stage`, `deals`, `total_amount` and `win_rate` from `hubspot_deals`, where win rate counts only closed deals in the denominator. Order by deals descending.',
        `SELECT stage, COUNT(*) AS deals, SUM(amount) AS total_amount,
       SAFE_DIVIDE(COUNTIF(is_won = 1), COUNTIF(is_won IS NOT NULL)) AS win_rate
FROM hubspot_deals
GROUP BY stage ORDER BY deals DESC, stage`,
        ['`is_won` is NULL for open deals, neither won nor lost.',
          'The denominator must exclude the open ones.'],
        'If you write COUNT(*) as the win-rate denominator, every open deal counts as a loss and your win rate is wrong by the size of your pipeline.',
        { orderMatters: true, followUp: 'What is the win rate if you include open deals as losses, and when would that be the right choice?' }),

      q('h5', 'hard', 720,
        'Return `original_source`, `avg_days_to_mql` and `avg_days_to_customer` for contacts that reached those stages. Order by avg_days_to_customer.',
        `SELECT original_source,
       AVG(DATE_DIFF(mql_date, created_date, DAY)) AS avg_days_to_mql,
       AVG(DATE_DIFF(became_customer_date, created_date, DAY)) AS avg_days_to_customer
FROM hubspot_contacts
GROUP BY original_source
ORDER BY avg_days_to_customer, original_source`,
        ['DATE_DIFF takes the later date first.',
          'AVG skips NULLs, so contacts that never reached the stage drop out of that column automatically.'],
        'Point out that the two averages have different denominators, each excludes a different set of NULLs. That is fine, but it must be said.',
        { orderMatters: true }),
    ],
  },

  {
    slug: 'atlassian',
    company: 'Atlassian',
    role: 'Analytics Engineer',
    blurb: 'Product analytics, activation, and clean SQL craft.',
    style:
      'Atlassian cares about readable SQL. Expect to be asked to refactor your own answer ' +
      'into CTEs and to justify each step.',
    difficulty: 'hard',
    questions: [
      q('at1', 'easy', 300,
        'Return `event_name` and `events` from `product_events`, ordered by events descending.',
        'SELECT event_name, COUNT(*) AS events FROM product_events GROUP BY event_name ORDER BY events DESC, event_name',
        ['One row per product event.'],
        'Skim the event taxonomy out loud. Naming the aha-moment candidate early sets up every later question.',
        { orderMatters: true }),

      q('at2', 'medium', 420,
        'Return `activated_users` and `activation_rate`, activated users over all subscription customers.',
        `SELECT COUNT(DISTINCT p.user_id) AS activated_users,
       SAFE_DIVIDE(COUNT(DISTINCT p.user_id), (SELECT COUNT(DISTINCT customer_id) FROM subscriptions)) AS activation_rate
FROM product_events p
WHERE p.event_name = 'activated'`,
        ['The denominator is a scalar subquery over subscriptions.',
          'COUNT DISTINCT on the numerator so a user activating twice counts once.'],
        'Ask what the denominator should be: signups, subscriptions, or trials. There is no default and the interviewer knows it.'),

      q('at3', 'medium', 540,
        'Return `platform`, `users`, `events` and `events_per_user`. Order by users descending.',
        `SELECT platform,
       COUNT(DISTINCT user_id) AS users,
       COUNT(*) AS events,
       SAFE_DIVIDE(COUNT(*), COUNT(DISTINCT user_id)) AS events_per_user
FROM product_events
GROUP BY platform ORDER BY users DESC, platform`,
        ['Two different counts over the same group.'],
        'Events per user is a ratio of two aggregates, not an average of per-user counts. Same principle as CTR.',
        { orderMatters: true }),

      q('at4', 'hard', 660,
        'Return `tier`, `subs`, `activated` and `activation_rate` by plan tier. Order by activation_rate descending.',
        `WITH act AS (SELECT DISTINCT user_id FROM product_events WHERE event_name = 'activated')
SELECT p.tier,
       COUNT(*) AS subs,
       COUNTIF(a.user_id IS NOT NULL) AS activated,
       SAFE_DIVIDE(COUNTIF(a.user_id IS NOT NULL), COUNT(*)) AS activation_rate
FROM subscriptions s
JOIN plans p USING (plan_id)
LEFT JOIN act a ON a.user_id = s.customer_id
GROUP BY p.tier ORDER BY activation_rate DESC, p.tier`,
        ['LEFT JOIN to the activated set so unactivated subscriptions stay in the denominator.',
          'COUNTIF on whether the join matched.'],
        'An INNER JOIN here silently drops the entire denominator and gives you a 100% activation rate. Say why you chose LEFT.',
        { orderMatters: true }),

      q('at5', 'hard', 780,
        'Return `days_to_activate` and `users`: a distribution of how long activation took, for the first 30 days. Chronological.',
        `WITH act AS (
  SELECT user_id, MIN(DATE(event_time)) AS activated_on
  FROM product_events WHERE event_name = 'activated' GROUP BY user_id
)
SELECT DATE_DIFF(a.activated_on, s.started_at, DAY) AS days_to_activate,
       COUNT(*) AS users
FROM act a JOIN subscriptions s ON s.customer_id = a.user_id
WHERE DATE_DIFF(a.activated_on, s.started_at, DAY) BETWEEN 0 AND 30
GROUP BY days_to_activate ORDER BY days_to_activate`,
        ['MIN per user gives the first activation.',
          'DATE_DIFF from the subscription start.'],
        'The shape of this distribution decides your onboarding strategy. A spike at day 0 means self-serve works; a long tail means it does not.',
        { orderMatters: true }),

      q('at6', 'expert', 900,
        'Return `cohort_week`, `activated_within_14d` and `cohort_size` for subscription start weeks. Chronological, limit 40.',
        `WITH act AS (
  SELECT user_id, MIN(DATE(event_time)) AS activated_on
  FROM product_events WHERE event_name = 'activated' GROUP BY user_id
), base AS (
  SELECT s.customer_id, s.started_at, d.week_start,
         CASE WHEN a.activated_on IS NOT NULL
               AND DATE_DIFF(a.activated_on, s.started_at, DAY) <= 14 THEN 1 ELSE 0 END AS fast
  FROM subscriptions s
  JOIN date_dim d ON d.date = s.started_at
  LEFT JOIN act a ON a.user_id = s.customer_id
)
SELECT week_start AS cohort_week,
       SUM(fast) AS activated_within_14d,
       COUNT(*) AS cohort_size
FROM base GROUP BY week_start ORDER BY week_start LIMIT 40`,
        ['Join to date_dim for the week bucket rather than computing it.',
          'The 14-day test needs the NULL branch handled explicitly.'],
        'Refactor into named CTEs before you are asked. At Atlassian the readability is being marked.',
        { orderMatters: true }),
    ],
  },

  {
    slug: 'uber',
    company: 'Uber',
    role: 'Data Analyst, Growth Marketing',
    blurb: 'Time-series, rolling windows and marketplace efficiency.',
    style:
      'Uber leans hard on window functions and time series. Expect rolling metrics and ' +
      'period-over-period comparisons in almost every question.',
    difficulty: 'hard',
    questions: [
      q('u1', 'easy', 300,
        'Return `date` and `spend` across all platforms for October 2024. Chronological.',
        `SELECT date, SUM(spend) AS spend FROM ad_spend_daily
WHERE date BETWEEN '2024-10-01' AND '2024-10-31'
GROUP BY date ORDER BY date`,
        ['The view already unions the three platforms.'],
        'Check whether the date range should be inclusive of both endpoints. BETWEEN is, and people forget.',
        { orderMatters: true }),

      q('u2', 'medium', 480,
        'Return `date`, `spend` and `rolling_7d_spend` for October. Chronological.',
        `WITH d AS (
  SELECT date, SUM(spend) AS spend FROM ad_spend_daily GROUP BY date
)
SELECT date, spend,
       SUM(spend) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7d_spend
FROM d WHERE date BETWEEN '2024-10-01' AND '2024-10-31' ORDER BY date`,
        ['Aggregate to one row per day before the frame.',
          'Filter after the window or the first days lose their history: here the CTE covers the full year, so the window is complete.'],
        'Say why you filter after windowing: filtering first truncates the frame at the range boundary and the first six days come out wrong.',
        { orderMatters: true }),

      q('u3', 'medium', 540,
        'Return `platform`, `date`, `spend` and `pct_of_day` for the first week of October. Order by date then platform.',
        `SELECT platform, date, SUM(spend) AS spend,
       SAFE_DIVIDE(SUM(spend), SUM(SUM(spend)) OVER (PARTITION BY date)) AS pct_of_day
FROM ad_spend_daily
WHERE date BETWEEN '2024-10-01' AND '2024-10-07'
GROUP BY platform, date
ORDER BY date, platform`,
        ['A window over the grouped sums gives the daily total.',
          'SUM(SUM(x)) OVER (...) is legal. The window runs after GROUP BY.'],
        'The double SUM surprises people. Explain the order of operations as you write it.',
        { orderMatters: true }),

      q('u4', 'hard', 660,
        'Return `week_start`, `spend`, `prev_week_spend` and `wow_pct` from `ad_spend_daily`. Chronological.',
        `WITH w AS (
  SELECT d.week_start, SUM(a.spend) AS spend
  FROM ad_spend_daily a JOIN date_dim d ON d.date = a.date
  GROUP BY d.week_start
)
SELECT week_start, spend,
       LAG(spend) OVER (ORDER BY week_start) AS prev_week_spend,
       SAFE_DIVIDE(spend - LAG(spend) OVER (ORDER BY week_start),
                   LAG(spend) OVER (ORDER BY week_start)) AS wow_pct
FROM w ORDER BY week_start`,
        ['Roll up to week via date_dim, then LAG.'],
        'Partial first and last weeks will look like huge swings. Flag it before the interviewer does.',
        { orderMatters: true }),

      q('u5', 'hard', 780,
        'Return `channel`, `date`, `spend_7d`, `revenue_7d`, `roas_7d` for November. Order by channel then date.',
        `WITH s AS (SELECT channel, date, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel, date),
r AS (SELECT channel, order_date AS date, SUM(gross_revenue) AS revenue
      FROM orders WHERE status = 'completed' GROUP BY channel, order_date),
j AS (SELECT s.channel, s.date, s.spend, COALESCE(r.revenue, 0) AS revenue
      FROM s LEFT JOIN r ON r.channel = s.channel AND r.date = s.date)
SELECT channel, date,
       SUM(spend) OVER (PARTITION BY channel ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS spend_7d,
       SUM(revenue) OVER (PARTITION BY channel ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS revenue_7d,
       SAFE_DIVIDE(
         SUM(revenue) OVER (PARTITION BY channel ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),
         SUM(spend) OVER (PARTITION BY channel ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)) AS roas_7d
FROM j
WHERE date BETWEEN '2024-11-01' AND '2024-11-30'
ORDER BY channel, date`,
        ['One row per channel-date before windowing.',
          'PARTITION BY channel so the frame never crosses channels.',
          'Rolling ROAS is rolling revenue over rolling spend.'],
        'Never average daily ROAS to get weekly ROAS. Ratio of rolling sums, every time.',
        { orderMatters: true }),
    ],
  },

  {
    slug: 'airbnb',
    company: 'Airbnb',
    role: 'Analytics, Marketing Science',
    blurb: 'Two-sided thinking, cohorts and geography.',
    style:
      'Airbnb asks you to think about both sides of a marketplace and about geography as a ' +
      'first-class dimension. Expect "and now split it by market".',
    difficulty: 'hard',
    questions: [
      q('ab1', 'easy', 300,
        'Return `country` and `customers` from `customers`, ordered by customers descending.',
        'SELECT country, COUNT(*) AS customers FROM customers GROUP BY country ORDER BY customers DESC, country',
        ['Single table, group and count.'],
        'Ask whether "market" means country or city here. In this schema city is dirty and country is clean.',
        { orderMatters: true }),

      q('ab2', 'medium', 480,
        'Return `country`, `customers`, `revenue` and `revenue_per_customer` for completed orders. Order by revenue descending.',
        `SELECT c.country,
       COUNT(DISTINCT c.customer_id) AS customers,
       SUM(o.gross_revenue) AS revenue,
       SAFE_DIVIDE(SUM(o.gross_revenue), COUNT(DISTINCT c.customer_id)) AS revenue_per_customer
FROM customers c JOIN orders o USING (customer_id)
WHERE o.status = 'completed'
GROUP BY c.country ORDER BY revenue DESC, c.country`,
        ['COUNT DISTINCT the customer, because the join fans them out per order.'],
        'The join duplicates customers. If you write COUNT(*) for customers you are counting orders. Say the word "fan-out".',
        { orderMatters: true }),

      q('ab3', 'medium', 540,
        'Return `city`, `orders` and `revenue` for completed orders, cleaning the city values, cities with 40+ orders. Order by revenue descending.',
        `SELECT INITCAP(TRIM(city)) AS city, COUNT(*) AS orders, SUM(gross_revenue) AS revenue
FROM orders WHERE status = 'completed'
GROUP BY INITCAP(TRIM(city))
HAVING COUNT(*) >= 40
ORDER BY revenue DESC, city`,
        ['Clean in both SELECT and GROUP BY, or the groups do not merge.'],
        'Notice the dirty data before you are told. " London", "london" and "London " are one market.',
        { orderMatters: true }),

      q('ab4', 'hard', 660,
        'Return `country`, `new_customers`, `repeat_customers` and `repeat_rate`. Order by repeat_rate descending, countries with 100+ customers.',
        `WITH per_customer AS (
  SELECT c.customer_id, c.country, COUNT(o.order_id) AS orders
  FROM customers c
  LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'completed'
  GROUP BY c.customer_id, c.country
)
SELECT country,
       COUNTIF(orders = 1) AS new_customers,
       COUNTIF(orders > 1) AS repeat_customers,
       SAFE_DIVIDE(COUNTIF(orders > 1), COUNTIF(orders >= 1)) AS repeat_rate
FROM per_customer
GROUP BY country
HAVING COUNT(*) >= 100
ORDER BY repeat_rate DESC, country`,
        ['Count orders per customer first, then classify the customers.',
          'The repeat-rate denominator should exclude customers who never ordered.'],
        'State your denominator: repeat rate among buyers, not among all customers. They are very different numbers.',
        { orderMatters: true }),

      q('ab5', 'hard', 780,
        'Return `cohort_month`, `country`, `customers` for the three largest countries, chronological, limit 40.',
        `WITH f AS (
  SELECT o.customer_id, c.country, DATE_TRUNC(MIN(o.order_date), MONTH) AS cohort_month
  FROM orders o JOIN customers c USING (customer_id)
  WHERE o.status = 'completed'
  GROUP BY o.customer_id, c.country
), top3 AS (
  SELECT country FROM customers GROUP BY country ORDER BY COUNT(*) DESC LIMIT 3
)
SELECT cohort_month, country, COUNT(*) AS customers
FROM f WHERE country IN (SELECT country FROM top3)
GROUP BY cohort_month, country
ORDER BY cohort_month, country
LIMIT 40`,
        ['Two CTEs: the cohorts, and the country shortlist.',
          'An IN subquery against the shortlist keeps the main query readable.'],
        'Deriving the top-3 list in SQL rather than hardcoding it is the difference between a query that runs once and one that ships.',
        { orderMatters: true }),
    ],
  },

  {
    slug: 'razorpay',
    company: 'Razorpay',
    role: 'Business Analyst, Payments',
    blurb: 'Transaction integrity, failure codes and revenue recognition.',
    style:
      'Payments interviews are about correctness under partial failure. Every question has a ' +
      'status column and the interviewer wants to know exactly which statuses you kept.',
    difficulty: 'hard',
    questions: [
      q('r1', 'easy', 300,
        'Return `status` and `charges` from `stripe_charges`, ordered by charges descending.',
        'SELECT status, COUNT(*) AS charges FROM stripe_charges GROUP BY status ORDER BY charges DESC, status',
        ['Group by status.'],
        'Read the statuses before you filter anything. succeeded, failed and refunded are three different worlds.',
        { orderMatters: true }),

      q('r2', 'medium', 420,
        'Return `gross_charged`, `refunded` and `net_collected` from Stripe charges.',
        `SELECT SUM(CASE WHEN status IN ('succeeded','refunded') THEN amount ELSE 0 END) AS gross_charged,
       SUM(refunded_amount) AS refunded,
       SUM(CASE WHEN status IN ('succeeded','refunded') THEN amount ELSE 0 END) - SUM(refunded_amount) AS net_collected
FROM stripe_charges`,
        ['Failed charges never collected money, exclude them from gross.',
          'refunded_amount is its own column.'],
        'Say which statuses are in the numerator. "Net collected" is meaningless without it.'),

      q('r3', 'medium', 540,
        'Return `failure_code`, `failed_charges`, `at_risk_amount` and `share_of_failures`. Order by at_risk_amount descending.',
        `SELECT failure_code,
       COUNT(*) AS failed_charges,
       SUM(amount) AS at_risk_amount,
       SAFE_DIVIDE(COUNT(*), SUM(COUNT(*)) OVER ()) AS share_of_failures
FROM stripe_charges WHERE status = 'failed'
GROUP BY failure_code ORDER BY at_risk_amount DESC, failure_code`,
        ['A windowed SUM over the group counts gives the share.'],
        'Rank by amount at risk, not by count. Ten failed £9 charges matter less than one failed £1,800 one.',
        { orderMatters: true }),

      q('r4', 'hard', 660,
        'Return `card_brand`, `charges`, `failures` and `failure_rate`, brands with 100+ charges. Order by failure_rate descending.',
        `SELECT card_brand,
       COUNT(*) AS charges,
       COUNTIF(status = 'failed') AS failures,
       SAFE_DIVIDE(COUNTIF(status = 'failed'), COUNT(*)) AS failure_rate
FROM stripe_charges
GROUP BY card_brand
HAVING COUNT(*) >= 100
ORDER BY failure_rate DESC, card_brand`,
        ['Failure rate over all charge attempts for that brand.'],
        'The denominator is attempts, not successes. Getting that backwards inverts the metric.',
        { orderMatters: true }),

      q('r5', 'hard', 780,
        'Return `month`, `collected`, `failed` and `recovery_opportunity`. The failed amount as a share of what was collected. Chronological.',
        `SELECT DATE_TRUNC(DATE(created_at), MONTH) AS month,
       SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) AS collected,
       SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) AS failed,
       SAFE_DIVIDE(SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END),
                   SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END)) AS recovery_opportunity
FROM stripe_charges
GROUP BY month ORDER BY month`,
        ['created_at is a timestamp, wrap it in DATE() before truncating to month.',
          'Conditional aggregation gives both amounts in one pass.'],
        'Expressing the opportunity as a share of collected revenue is what turns a dunning project into a funded one.',
        { orderMatters: true }),
    ],
  },

  {
    slug: 'swiggy',
    company: 'Swiggy',
    role: 'Analyst, Growth',
    blurb: 'High-frequency behaviour, repeat rates and discount economics.',
    style:
      'Swiggy asks about repeat behaviour and whether growth is bought with discounts. ' +
      'Expect questions where the honest answer is uncomfortable.',
    difficulty: 'medium',
    questions: [
      q('s1', 'easy', 300,
        'Return `channel` and `orders` for completed orders, ordered by orders descending.',
        "SELECT channel, COUNT(*) AS orders FROM orders WHERE status = 'completed' GROUP BY channel ORDER BY orders DESC, channel",
        ['Filter, group, count.'],
        'Confirm which statuses count as an order. Cancelled and pending are usually excluded; say so.',
        { orderMatters: true }),

      q('s2', 'medium', 420,
        'Return `coupon_code`, `orders`, `revenue`, `avg_discount` for orders that used a coupon. Order by orders descending.',
        `SELECT coupon_code, COUNT(*) AS orders, SUM(gross_revenue) AS revenue,
       AVG(discount_amount) AS avg_discount
FROM orders
WHERE status = 'completed' AND coupon_code IS NOT NULL
GROUP BY coupon_code ORDER BY orders DESC, coupon_code`,
        ['IS NOT NULL to keep only coupon orders.'],
        'Check whether discount_amount is per order or per line before you average it.',
        { orderMatters: true }),

      q('s3', 'medium', 540,
        'Return `orders_per_customer` and `customers`. The distribution of order counts. Order by orders_per_customer.',
        `WITH pc AS (
  SELECT customer_id, COUNT(*) AS n FROM orders WHERE status = 'completed' GROUP BY customer_id
)
SELECT n AS orders_per_customer, COUNT(*) AS customers
FROM pc GROUP BY n ORDER BY orders_per_customer`,
        ['Aggregate twice: per customer, then over customers.'],
        'A distribution beats an average here. "Average 1.4 orders" hides that most people order once.',
        { orderMatters: true }),

      q('s4', 'hard', 660,
        'Return `used_coupon`, `orders`, `aov`, `margin_pct` for completed orders. Order by used_coupon.',
        `SELECT CASE WHEN coupon_code IS NULL THEN 'no coupon' ELSE 'coupon' END AS used_coupon,
       COUNT(*) AS orders,
       SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)) AS aov,
       SAFE_DIVIDE(SUM(gross_revenue) - SUM(cogs), SUM(gross_revenue)) AS margin_pct
FROM orders WHERE status = 'completed'
GROUP BY used_coupon ORDER BY used_coupon`,
        ['CASE on NULL to split the two groups.'],
        'This is a selection-effect trap. Coupon users may have bought anyway. The comparison is correlational and you should say so.',
        { orderMatters: true, followUp: 'How would you design a test to find out whether the discount was incremental?' }),

      q('s5', 'hard', 720,
        'Return `customer_id`, `orders`, `avg_days_between_orders` for customers with 3+ completed orders. Order by avg_days_between_orders, top 20.',
        `WITH gaps AS (
  SELECT customer_id, order_date,
         DATE_DIFF(order_date, LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id), DAY) AS gap
  FROM orders WHERE status = 'completed'
)
SELECT customer_id, COUNT(*) AS orders, AVG(gap) AS avg_days_between_orders
FROM gaps
GROUP BY customer_id
HAVING COUNT(gap) >= 2
ORDER BY avg_days_between_orders, customer_id
LIMIT 20`,
        ['LAG partitioned by customer gives the previous order date.',
          'The first order per customer has a NULL gap; AVG skips it, and HAVING COUNT(gap) counts only the real gaps.'],
        'Median gap is more useful than mean for lifecycle timing. Mention it even if they asked for the average.',
        { orderMatters: true }),
    ],
  },

  {
    slug: 'zomato',
    company: 'Zomato',
    role: 'Senior Analyst, Marketing',
    blurb: 'Attribution, incrementality and the hardest question in the set.',
    style:
      'Zomato\'s final round is a judgement interview wearing a SQL costume. The last question ' +
      'has no clean answer and they are watching how you handle that.',
    difficulty: 'expert',
    questions: [
      q('z1', 'easy', 300,
        'Return `channel` and `touches` from `attribution_touchpoints`, ordered by touches descending.',
        'SELECT channel, COUNT(*) AS touches FROM attribution_touchpoints GROUP BY channel ORDER BY touches DESC, channel',
        ['One row per touch.'],
        'Note that touches are not conversions. This table has both converted and unconverted journeys in it.',
        { orderMatters: true }),

      q('z2', 'medium', 480,
        'Return `channel`, `first_touch_value` and `last_touch_value` for converted journeys. Order by first_touch_value descending.',
        `SELECT channel,
       SUM(CASE WHEN touch_position = 1 THEN conversion_value ELSE 0 END) AS first_touch_value,
       SUM(CASE WHEN touch_position = journey_length THEN conversion_value ELSE 0 END) AS last_touch_value
FROM attribution_touchpoints WHERE converted = 1
GROUP BY channel ORDER BY first_touch_value DESC, channel`,
        ['Position 1 is first; position = journey_length is last.'],
        'Both models redistribute the same total. Say that before they ask why the columns sum to the same number.',
        { orderMatters: true }),

      q('z3', 'hard', 660,
        'Return `channel`, `linear` and `position_based` credit for converted journeys. Order by linear descending.',
        `SELECT channel,
       SUM(SAFE_DIVIDE(conversion_value, journey_length)) AS linear,
       SUM(CASE
             WHEN journey_length = 1 THEN conversion_value
             WHEN touch_position = 1 OR touch_position = journey_length THEN conversion_value * 0.4
             ELSE SAFE_DIVIDE(conversion_value * 0.2, journey_length - 2) END) AS position_based
FROM attribution_touchpoints WHERE converted = 1
GROUP BY channel ORDER BY linear DESC, channel`,
        ['Position-based is 40/20/40, the middle 20% shared among the middle touches.',
          'A single-touch journey must be special-cased or it loses value entirely.'],
        'The journey_length = 1 branch is the whole question. Without it you divide by zero and silently lose the single-touch conversions, which are the majority.',
        { orderMatters: true }),

      q('z4', 'hard', 720,
        'Return `path_length`, `journeys`, `converted` and `conversion_rate`. Order by path_length.',
        `WITH j AS (
  SELECT user_pseudo_id, MAX(journey_length) AS path_length, MAX(converted) AS converted
  FROM attribution_touchpoints GROUP BY user_pseudo_id
)
SELECT path_length, COUNT(*) AS journeys, SUM(converted) AS converted,
       SAFE_DIVIDE(SUM(converted), COUNT(*)) AS conversion_rate
FROM j GROUP BY path_length ORDER BY path_length`,
        ['Collapse to one row per journey before counting.'],
        'Longer journeys convert more, but that is reverse causation: converting is what makes a journey long enough to observe. Say it.',
        { orderMatters: true }),

      q('z5', 'expert', 900,
        'Return `channel`, `spend`, `linear_credit`, `linear_roas` and `first_touch_roas` for paid channels. Order by linear_roas ascending.',
        `WITH credit AS (
  SELECT channel,
         SUM(SAFE_DIVIDE(conversion_value, journey_length)) AS linear_credit,
         SUM(CASE WHEN touch_position = 1 THEN conversion_value ELSE 0 END) AS first_credit
  FROM attribution_touchpoints WHERE converted = 1 GROUP BY channel
), spend AS (
  SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel
)
SELECT s.channel, s.spend,
       COALESCE(c.linear_credit, 0) AS linear_credit,
       SAFE_DIVIDE(c.linear_credit, s.spend) AS linear_roas,
       SAFE_DIVIDE(c.first_credit, s.spend) AS first_touch_roas
FROM spend s LEFT JOIN credit c USING (channel)
ORDER BY linear_roas, s.channel`,
        ['Two CTEs at channel grain, then a LEFT JOIN from spend.',
          'Only channels with spend can have a ROAS.'],
        'They will ask which channel to cut. The correct answer names the channel *and* says that no attribution model can establish incrementality. Only a holdout can. Candidates who give a number without that caveat do not get the offer.',
        { orderMatters: true,
          followUp: 'The CFO wants to cut 20% of budget. Which channel, and what would you need to be confident?' }),
    ],
  },
];

export function interviewBySlug(slug: string): InterviewSet | undefined {
  return INTERVIEWS.find((i) => i.slug === slug);
}
