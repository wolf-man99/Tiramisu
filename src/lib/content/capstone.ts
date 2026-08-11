import type { CapstoneQuestion, Difficulty } from './types';

/**
 * The capstone: 100 business questions at Northbeam.
 *
 * The learner is the Growth Analyst. Every question is one a real stakeholder asks,
 * and every one carries a `soWhat` naming the decision it feeds, because a number
 * without a decision attached is trivia.
 */

const q = (
  id: string,
  section: string,
  difficulty: Difficulty,
  prompt: string,
  solution: string,
  hints: string[],
  soWhat: string,
  orderMatters = false,
): CapstoneQuestion => ({
  id, section, difficulty, prompt, solution: solution.trim(), hints, soWhat, orderMatters,
});

const S1 = 'Orientation & data quality';
const S2 = 'Acquisition & paid media';
const S3 = 'Website & funnel';
const S4 = 'Revenue & products';
const S5 = 'Customers & LTV';
const S6 = 'Subscriptions & MRR';
const S7 = 'Attribution';
const S8 = 'Support, ops & the board deck';

export const CAPSTONE: CapstoneQuestion[] = [
  // ─────────────────────────────── 1. Orientation & data quality (10) ──
  q('C01', S1, 'easy',
    'How many completed orders did Northbeam take in 2024? Return `orders`.',
    "SELECT COUNT(*) AS orders FROM orders WHERE status = 'completed'",
    ['Filter to completed first.', 'COUNT(*) over the filtered set.'],
    'The denominator for almost every other number in this capstone.'),

  q('C02', S1, 'easy',
    'What date range does the orders table cover? Return `first_date` and `last_date`.',
    'SELECT MIN(order_date) AS first_date, MAX(order_date) AS last_date FROM orders',
    ['MIN and MAX on the date column.', 'ISO dates compare correctly as text.'],
    'Establishes the reporting window before anyone quotes a year-on-year figure.'),

  q('C03', S1, 'easy',
    'How many rows and how many distinct order_ids are in `orders`? Return `rows_total` and `distinct_orders`.',
    'SELECT COUNT(*) AS rows_total, COUNT(DISTINCT order_id) AS distinct_orders FROM orders',
    ['Two counts over the same table.', 'The gap is the duplicate problem.'],
    'Every revenue figure is overstated until this is fixed.'),

  q('C04', S1, 'medium',
    'What is total revenue with and without deduplicating orders? Return `naive` and `deduped`.',
    `SELECT
  (SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed') AS naive,
  (SELECT SUM(gross_revenue) FROM (SELECT DISTINCT order_id, gross_revenue FROM orders WHERE status = 'completed')) AS deduped`,
    ['Two scalar subqueries.', 'DISTINCT on the columns that define the order.'],
    'Sizes the error before you decide whether to fix it upstream or in every query.'),

  q('C05', S1, 'medium',
    'Which columns in `google_ads_keywords` have NULLs? Return `total`, `null_quality_score` and `pct_null`.',
    `SELECT COUNT(*) AS total,
       COUNTIF(quality_score IS NULL) AS null_quality_score,
       SAFE_DIVIDE(COUNTIF(quality_score IS NULL), COUNT(*)) AS pct_null
FROM google_ads_keywords`,
    ['COUNTIF over an IS NULL test.', 'Divide by COUNT(*) for the rate.'],
    'A column that is 40% NULL cannot carry a report, however good the query is.'),

  q('C06', S1, 'medium',
    'How much internal QA traffic is polluting the session data? Return `qa_sessions` and `pct_of_sessions`.',
    `SELECT COUNTIF(source = 'internal-qa') AS qa_sessions,
       SAFE_DIVIDE(COUNTIF(source = 'internal-qa'), COUNT(*)) AS pct_of_sessions
FROM ga4_sessions`,
    ['COUNTIF on the source value.', 'Share of all sessions.'],
    'Decides whether the QA filter is a footnote or a material correction.'),

  q('C07', S1, 'medium',
    'How many orders reference a campaign that does not exist in any ad platform? Return `orphan_orders`.',
    `SELECT COUNT(*) AS orphan_orders
FROM orders o
WHERE o.campaign_id IS NOT NULL
  AND o.campaign_id NOT IN (SELECT campaign_id FROM google_ads_campaigns)
  AND o.campaign_id NOT IN (SELECT campaign_id FROM meta_ads_campaigns)
  AND o.campaign_id NOT IN (SELECT campaign_id FROM linkedin_ads_campaigns)`,
    ['Three NOT IN subqueries.', 'Exclude orders with no campaign at all first.'],
    'These orders vanish from any INNER JOIN report. That is revenue nobody sees.'),

  q('C08', S1, 'medium',
    'How dirty is the city column? Return `distinct_raw` and `distinct_cleaned` from completed orders.',
    `SELECT COUNT(DISTINCT city) AS distinct_raw,
       COUNT(DISTINCT INITCAP(TRIM(city))) AS distinct_cleaned
FROM orders WHERE status = 'completed'`,
    ['Count distinct raw, then distinct cleaned.', 'TRIM removes whitespace, INITCAP normalises case.'],
    'Quantifies how much a city-level report is fragmenting its own markets.'),

  q('C09', S1, 'medium',
    'What share of GA4 events have a known user_id? Return `events`, `identified` and `identification_rate`.',
    `SELECT COUNT(*) AS events, COUNT(user_id) AS identified,
       SAFE_DIVIDE(COUNT(user_id), COUNT(*)) AS identification_rate
FROM ga4_events`,
    ['COUNT(col) skips NULLs; COUNT(*) does not.', 'The ratio is the identification rate.'],
    'Caps how much cross-device analysis is even possible.'),

  q('C10', S1, 'hard',
    'Audit every fact table\'s row count in one query. Return `orders`, `ga4_events`, `sessions`, `touchpoints`, `charges` and `ad_spend_rows`.',
    `SELECT
  (SELECT COUNT(*) FROM orders) AS orders,
  (SELECT COUNT(*) FROM ga4_events) AS ga4_events,
  (SELECT COUNT(*) FROM ga4_sessions) AS sessions,
  (SELECT COUNT(*) FROM attribution_touchpoints) AS touchpoints,
  (SELECT COUNT(*) FROM stripe_charges) AS charges,
  (SELECT COUNT(*) FROM ad_spend_daily) AS ad_spend_rows`,
    ['Six scalar subqueries in one SELECT.', 'Each is independent.'],
    'The one-line health check to run before every analysis session.'),

  // ─────────────────────────────── 2. Acquisition & paid media (15) ──
  q('C11', S2, 'easy',
    'What did Northbeam spend on paid media in 2024, by platform? Return `platform` and `spend`, biggest first.',
    'SELECT platform, SUM(spend) AS spend FROM ad_spend_daily GROUP BY platform ORDER BY spend DESC',
    ['The view already unions the three platforms.', 'Group and sum.'],
    'The starting point of every budget conversation.', true),

  q('C12', S2, 'easy',
    'Which campaign spent the most? Return `campaign_name` and `spend`, top 10.',
    `SELECT campaign_name, SUM(spend) AS spend FROM ad_spend_daily
GROUP BY campaign_name ORDER BY spend DESC, campaign_name LIMIT 10`,
    ['Group by campaign_name across platforms.', 'Sort descending and limit.'],
    'Concentration risk: if one campaign is 30% of spend, it is 30% of your risk.', true),

  q('C13', S2, 'medium',
    'What is blended CTR, CPC and CPM by platform? Return `platform`, `ctr`, `cpc`, `cpm`, ordered by platform.',
    `SELECT platform,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
       SAFE_DIVIDE(SUM(spend), SUM(clicks)) AS cpc,
       SAFE_DIVIDE(SUM(spend), SUM(impressions)) * 1000 AS cpm
FROM ad_spend_daily GROUP BY platform ORDER BY platform`,
    ['Every rate is a ratio of sums.', 'CPM is per thousand impressions.'],
    'The efficiency baseline each platform is judged against.', true),

  q('C14', S2, 'medium',
    'Which Google campaign has the highest ROAS on platform-reported numbers? Return `campaign_name`, `spend`, `conversion_value`, `roas`, with 5,000+ spend, best first.',
    `SELECT c.campaign_name, SUM(d.cost) AS spend, SUM(d.conversion_value) AS conversion_value,
       SAFE_DIVIDE(SUM(d.conversion_value), SUM(d.cost)) AS roas
FROM google_ads_daily d JOIN google_ads_campaigns c USING (campaign_id)
GROUP BY c.campaign_name
HAVING SUM(d.cost) >= 5000
ORDER BY roas DESC, c.campaign_name`,
    ['Join for the campaign name, group, then HAVING on spend.', 'ROAS is revenue over spend.'],
    'The headline "best campaign" number: and the one most likely to be brand search.', true),

  q('C15', S2, 'medium',
    'Which keyword generated the highest revenue? Return `keyword_text`, `match_type`, `clicks`, `cost`, `conversion_value`, top 15, 30+ clicks.',
    `SELECT k.keyword_text, k.match_type, SUM(kd.clicks) AS clicks,
       SUM(kd.cost) AS cost, SUM(kd.conversion_value) AS conversion_value
FROM google_ads_keyword_daily kd JOIN google_ads_keywords k USING (keyword_id)
GROUP BY k.keyword_text, k.match_type
HAVING SUM(kd.clicks) >= 30
ORDER BY conversion_value DESC, k.keyword_text
LIMIT 15`,
    ['Group by text and match type. What a stakeholder means by "keyword".', 'Volume floor in HAVING.'],
    'Where to push bids up.', true),

  q('C16', S2, 'medium',
    'Which channel has the lowest CAC? Return `channel`, `spend`, `customers`, `cac`, cheapest first.',
    `WITH s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel),
a AS (SELECT first_touch_channel AS channel, COUNT(*) AS customers FROM customers GROUP BY first_touch_channel)
SELECT s.channel, s.spend, a.customers, SAFE_DIVIDE(s.spend, a.customers) AS cac
FROM s JOIN a USING (channel) ORDER BY cac, s.channel`,
    ['Spend and acquisitions at channel grain, then join.', 'CAC is spend per acquired customer.'],
    'Where the next marginal dollar should go: subject to headroom.', true),

  q('C17', S2, 'medium',
    'How much did we waste on campaign-days with spend and zero conversions? Return `wasted_spend` and `wasted_days`.',
    `SELECT SUM(cost) AS wasted_spend, COUNT(*) AS wasted_days
FROM google_ads_daily
WHERE cost > 0 AND conversions = 0 AND date <= '2024-12-29'`,
    ['Spend above zero, conversions exactly zero.', 'Exclude the conversion-lag window.'],
    'The size of the immediate savings opportunity.'),

  q('C18', S2, 'medium',
    'Brand vs non-brand: return `brand_type`, `spend`, `conversions`, `cpa` and `roas` for Google.',
    `SELECT CASE WHEN c.is_brand = 1 THEN 'Brand' ELSE 'Non-brand' END AS brand_type,
       SUM(d.cost) AS spend, SUM(d.conversions) AS conversions,
       SAFE_DIVIDE(SUM(d.cost), SUM(d.conversions)) AS cpa,
       SAFE_DIVIDE(SUM(d.conversion_value), SUM(d.cost)) AS roas
FROM google_ads_daily d JOIN google_ads_campaigns c USING (campaign_id)
GROUP BY brand_type ORDER BY brand_type`,
    ['CASE on is_brand.', 'Four aggregates over the split.'],
    'Brand ROAS always looks spectacular; the question is how much is incremental.', true),

  q('C19', S2, 'medium',
    'Which market spends most efficiently? Return `country`, `spend`, `conversions`, `cpa` for Google, cheapest CPA first.',
    `SELECT c.country, SUM(d.cost) AS spend, SUM(d.conversions) AS conversions,
       SAFE_DIVIDE(SUM(d.cost), SUM(d.conversions)) AS cpa
FROM google_ads_daily d JOIN google_ads_campaigns c USING (campaign_id)
GROUP BY c.country
HAVING SUM(d.conversions) > 0
ORDER BY cpa, c.country`,
    ['Country lives on the campaign.', 'Exclude zero-conversion markets so CPA is finite.'],
    'Which geographies deserve more budget.', true),

  q('C20', S2, 'hard',
    'Which Meta creative format performs best? Return `creative_format`, `spend`, `ctr`, `roas`, ordered by roas descending.',
    `SELECT creative_format, SUM(spend) AS spend,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr,
       SAFE_DIVIDE(SUM(purchase_value), SUM(spend)) AS roas
FROM meta_ads_daily GROUP BY creative_format ORDER BY roas DESC, creative_format`,
    ['Group by format.', 'Both rates are ratios of sums.'],
    'Where to point the creative team next quarter.', true),

  q('C21', S2, 'hard',
    'Is creative fatigue real? Return `days_live_band`, `impressions` and `ctr` by creative age.',
    `WITH f AS (SELECT creative_id, MIN(date) AS first_date FROM meta_ads_daily GROUP BY creative_id),
a AS (SELECT d.*, DATE_DIFF(d.date, f.first_date, DAY) AS days_live
      FROM meta_ads_daily d JOIN f USING (creative_id))
SELECT CASE WHEN days_live < 14 THEN '0-13' WHEN days_live < 30 THEN '14-29'
            WHEN days_live < 60 THEN '30-59' ELSE '60+' END AS days_live_band,
       SUM(impressions) AS impressions,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr
FROM a GROUP BY days_live_band ORDER BY days_live_band`,
    ['Find each creative\'s first date, then age every row from it.', 'Band the ages and compare CTR.'],
    'Sets the creative refresh cadence.', true),

  q('C22', S2, 'hard',
    'How does LinkedIn lead cost compare across seniority? Return `seniority`, `spend`, `leads`, `cost_per_lead`, cheapest first.',
    `SELECT c.seniority, SUM(l.spend) AS spend, SUM(l.leads) AS leads,
       SAFE_DIVIDE(SUM(l.spend), SUM(l.leads)) AS cost_per_lead
FROM linkedin_ads_daily l JOIN linkedin_ads_campaigns c USING (campaign_id)
GROUP BY c.seniority HAVING SUM(l.leads) > 0
ORDER BY cost_per_lead, c.seniority`,
    ['Seniority is a targeting attribute on the campaign.', 'Exclude campaigns with no leads.'],
    'Whether targeting up-market pays for itself on the B2B side.', true),

  q('C23', S2, 'hard',
    'What is the monthly paid spend trend and its month-over-month change? Return `month`, `spend`, `mom_pct`, chronological.',
    `WITH m AS (SELECT DATE_TRUNC(date, MONTH) AS month, SUM(spend) AS spend FROM ad_spend_daily GROUP BY month)
SELECT month, spend,
       SAFE_DIVIDE(spend - LAG(spend) OVER (ORDER BY month), LAG(spend) OVER (ORDER BY month)) AS mom_pct
FROM m ORDER BY month`,
    ['Aggregate to month, then LAG.', 'SAFE_DIVIDE covers the first month.'],
    'Whether spend is being managed or drifting.', true),

  q('C24', S2, 'hard',
    'Which campaigns spend heavily for very few conversions? Return `campaign_name`, `spend`, `conversions` and `cpa` for Google campaigns with 10,000+ spend and fewer than 50 conversions, biggest spend first.',
    `SELECT c.campaign_name, SUM(d.cost) AS spend, SUM(d.conversions) AS conversions,
       SAFE_DIVIDE(SUM(d.cost), SUM(d.conversions)) AS cpa
FROM google_ads_daily d JOIN google_ads_campaigns c USING (campaign_id)
GROUP BY c.campaign_name
HAVING SUM(d.cost) >= 10000 AND SUM(d.conversions) < 50
ORDER BY spend DESC, c.campaign_name`,
    ['Two conditions in HAVING. Both are on aggregates.',
      'A four-figure CPA is the signal, not the raw conversion count.'],
    'Both offenders are B2B SaaS search campaigns, where a $600 CPA against a $2k ARR deal may be fine. The shortlist is a question, not a verdict.', true),

  q('C25', S2, 'expert',
    'Rank each campaign against its own channel type. Return `channel_type`, `campaign_name`, `cpa`, `channel_cpa` and `cpa_index` for campaigns with 50+ conversions, worst index first, top 15.',
    `WITH camp AS (
  SELECT c.channel_type, c.campaign_name, SUM(d.cost) AS spend, SUM(d.conversions) AS conv
  FROM google_ads_daily d JOIN google_ads_campaigns c USING (campaign_id)
  GROUP BY c.channel_type, c.campaign_name HAVING SUM(d.conversions) >= 50
)
SELECT channel_type, campaign_name,
       SAFE_DIVIDE(spend, conv) AS cpa,
       SAFE_DIVIDE(SUM(spend) OVER (PARTITION BY channel_type),
                   SUM(conv) OVER (PARTITION BY channel_type)) AS channel_cpa,
       SAFE_DIVIDE(SAFE_DIVIDE(spend, conv),
                   SAFE_DIVIDE(SUM(spend) OVER (PARTITION BY channel_type),
                               SUM(conv) OVER (PARTITION BY channel_type))) AS cpa_index
FROM camp ORDER BY cpa_index DESC, campaign_name LIMIT 15`,
    ['Windowed SUMs give the channel benchmark on every row.',
      'The benchmark must be SUM/SUM over the partition, not AVG of CPAs.'],
    'Separates "expensive channel" from "expensive campaign in a cheap channel".', true),

  // ─────────────────────────────── 3. Website & funnel (12) ──
  q('C26', S3, 'easy',
    'How many sessions did the site get, excluding QA traffic? Return `sessions`.',
    "SELECT COUNT(*) AS sessions FROM ga4_sessions WHERE source != 'internal-qa'",
    ['Filter the QA source.', 'Count the rows.'],
    'The denominator for every site metric.'),

  q('C27', S3, 'easy',
    'What is the overall site conversion rate? Return `sessions`, `conversions`, `cvr`.',
    `SELECT COUNT(*) AS sessions, SUM(converted) AS conversions,
       SAFE_DIVIDE(SUM(converted), COUNT(*)) AS cvr
FROM ga4_sessions WHERE source != 'internal-qa'`,
    ['converted is a 0/1 flag.', 'Rate is conversions over sessions.'],
    'The headline number the CRO programme is judged on.'),

  q('C28', S3, 'medium',
    'Which channel sends the most converting traffic? Return `channel_group`, `sessions`, `conversions`, `cvr`, most sessions first.',
    `SELECT channel_group, COUNT(*) AS sessions, SUM(converted) AS conversions,
       SAFE_DIVIDE(SUM(converted), COUNT(*)) AS cvr
FROM ga4_sessions WHERE source != 'internal-qa'
GROUP BY channel_group ORDER BY sessions DESC, channel_group`,
    ['Group by channel after filtering QA.', 'Report volume and rate together.'],
    'Volume and quality are different arguments. This shows both.', true),

  q('C29', S3, 'medium',
    'Which landing page converts best? Return `landing_page`, `sessions`, `cvr`, `revenue_per_session` for pages with 150+ sessions, best CVR first.',
    `SELECT landing_page, COUNT(*) AS sessions,
       SAFE_DIVIDE(SUM(converted), COUNT(*)) AS cvr,
       SAFE_DIVIDE(SUM(revenue), COUNT(*)) AS revenue_per_session
FROM ga4_sessions WHERE source != 'internal-qa'
GROUP BY landing_page HAVING COUNT(*) >= 150
ORDER BY cvr DESC, landing_page`,
    ['Volume floor in HAVING.', 'Revenue per session combines rate and value.'],
    'Where to send more paid traffic, and which page to clone.', true),

  q('C30', S3, 'medium',
    'Build the five-step funnel. Return `sessions`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`.',
    `WITH s AS (
  SELECT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING)) AS k,
         MAX(CASE WHEN event_name = 'session_start'  THEN 1 ELSE 0 END) a,
         MAX(CASE WHEN event_name = 'view_item'      THEN 1 ELSE 0 END) b,
         MAX(CASE WHEN event_name = 'add_to_cart'    THEN 1 ELSE 0 END) c,
         MAX(CASE WHEN event_name = 'begin_checkout' THEN 1 ELSE 0 END) d,
         MAX(CASE WHEN event_name = 'purchase'       THEN 1 ELSE 0 END) e
  FROM ga4_events GROUP BY k
)
SELECT SUM(a) AS sessions, SUM(b) AS view_item, SUM(c) AS add_to_cart,
       SUM(d) AS begin_checkout, SUM(e) AS purchase FROM s`,
    ['Flatten to one row per session with a flag per step.', 'MAX over a 0/1 flag.'],
    'Locates the biggest leak in the purchase path.'),

  q('C31', S3, 'medium',
    'Where is the biggest funnel drop-off? Return the five counts plus `view_rate`, `cart_rate`, `checkout_rate`, `purchase_rate`.',
    `WITH s AS (
  SELECT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING)) AS k,
         MAX(CASE WHEN event_name = 'session_start'  THEN 1 ELSE 0 END) a,
         MAX(CASE WHEN event_name = 'view_item'      THEN 1 ELSE 0 END) b,
         MAX(CASE WHEN event_name = 'add_to_cart'    THEN 1 ELSE 0 END) c,
         MAX(CASE WHEN event_name = 'begin_checkout' THEN 1 ELSE 0 END) d,
         MAX(CASE WHEN event_name = 'purchase'       THEN 1 ELSE 0 END) e
  FROM ga4_events GROUP BY k
), t AS (SELECT SUM(a) a, SUM(b) b, SUM(c) c, SUM(d) d, SUM(e) e FROM s)
SELECT a AS sessions, b AS view_item, c AS add_to_cart, d AS begin_checkout, e AS purchase,
       SAFE_DIVIDE(b, a) AS view_rate, SAFE_DIVIDE(c, b) AS cart_rate,
       SAFE_DIVIDE(d, c) AS checkout_rate, SAFE_DIVIDE(e, d) AS purchase_rate
FROM t`,
    ['Wrap the totals so each is nameable.', 'Each rate is step over previous step.'],
    'Step-to-step rates localise the problem to one page.'),

  q('C32', S3, 'medium',
    'Does the funnel differ by device? Return `device_category`, `sessions`, `carts`, `purchases`, `cvr`, most sessions first.',
    `WITH s AS (
  SELECT CONCAT(e.user_pseudo_id, '-', CAST(e.ga_session_id AS STRING)) AS k,
         MAX(e.device.category) AS device_category,
         MAX(CASE WHEN e.event_name = 'add_to_cart' THEN 1 ELSE 0 END) AS carted,
         MAX(CASE WHEN e.event_name = 'purchase' THEN 1 ELSE 0 END) AS purchased
  FROM ga4_events e GROUP BY k
)
SELECT device_category, COUNT(*) AS sessions, SUM(carted) AS carts, SUM(purchased) AS purchases,
       SAFE_DIVIDE(SUM(purchased), COUNT(*)) AS cvr
FROM s GROUP BY device_category ORDER BY sessions DESC, device_category`,
    ['device is a STRUCT: dot access, no UNNEST.', 'MAX carries it through the grouping.'],
    'Mobile CVR is usually half desktop; sizing the gap justifies the mobile roadmap.', true),

  q('C33', S3, 'medium',
    'Which pages get the most views? Return `page` and `views`, top 15.',
    `SELECT (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'page_location') AS page,
       COUNT(*) AS views
FROM ga4_events e WHERE e.event_name = 'page_view'
GROUP BY page ORDER BY views DESC, page LIMIT 15`,
    ['Scalar subquery over UNNEST.', 'page_location is a string parameter.'],
    'Where the audience actually is, as opposed to where the team thinks it is.', true),

  q('C34', S3, 'hard',
    'What is the A/B variant split on landing pages, and does it matter? Return `ab_variant`, `sessions`, `cvr`, ordered by ab_variant.',
    `SELECT COALESCE(lp.ab_variant, 'not tested') AS ab_variant,
       COUNT(*) AS sessions,
       SAFE_DIVIDE(SUM(s.converted), COUNT(*)) AS cvr
FROM ga4_sessions s JOIN landing_pages lp ON lp.page_path = s.landing_page
WHERE s.source != 'internal-qa'
GROUP BY ab_variant ORDER BY ab_variant`,
    ['Join sessions to landing page metadata on the path.', 'COALESCE the NULL variant into a label.'],
    'Whether the test infrastructure is producing readable results at all.', true),

  q('C35', S3, 'hard',
    'How engaged are sessions by channel? Return `channel_group`, `sessions`, `avg_pages`, `avg_engagement_sec`, `engagement_rate`, most sessions first.',
    `SELECT channel_group, COUNT(*) AS sessions,
       AVG(page_views) AS avg_pages,
       AVG(engagement_time_sec) AS avg_engagement_sec,
       SAFE_DIVIDE(SUM(engaged), COUNT(*)) AS engagement_rate
FROM ga4_sessions WHERE source != 'internal-qa'
GROUP BY channel_group ORDER BY sessions DESC, channel_group`,
    ['Three different averages over the same group.', 'engaged is a 0/1 flag.'],
    'Distinguishes channels that send traffic from channels that send visitors.', true),

  q('C36', S3, 'hard',
    'What hour of day do people buy? Return `hour` and `purchases`, chronological.',
    `SELECT EXTRACT(HOUR FROM TIMESTAMP_MICROS(event_timestamp)) AS hour, COUNT(*) AS purchases
FROM ga4_events WHERE event_name = 'purchase'
GROUP BY hour ORDER BY hour`,
    ['event_timestamp is microseconds. Use TIMESTAMP_MICROS.', 'Then EXTRACT the hour.'],
    'Ad scheduling and send-time optimisation both depend on this curve.', true),

  q('C37', S3, 'expert',
    'Rebuild the traffic acquisition report from raw events. Return `channel`, `sessions`, `conversions`, `revenue`, most sessions first.',
    `WITH s AS (
  SELECT CONCAT(e.user_pseudo_id, '-', CAST(e.ga_session_id AS STRING)) AS k,
         MAX((SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'medium')) AS medium,
         MAX(CASE WHEN e.event_name = 'purchase' THEN 1 ELSE 0 END) AS converted,
         SUM(CASE WHEN e.event_name = 'purchase' THEN e.ecommerce.purchase_revenue ELSE 0 END) AS revenue
  FROM ga4_events e GROUP BY k
)
SELECT CASE WHEN medium = 'cpc' THEN 'Paid Search'
            WHEN medium = 'paid_social' THEN 'Paid Social'
            WHEN medium = 'organic' THEN 'Organic Search'
            WHEN medium = 'email' THEN 'Email'
            WHEN medium = 'referral' THEN 'Referral'
            WHEN medium = 'display' THEN 'Display'
            WHEN medium = 'affiliate' THEN 'Affiliate'
            WHEN medium = '(none)' THEN 'Direct'
            ELSE 'Other' END AS channel,
       COUNT(*) AS sessions, SUM(converted) AS conversions, SUM(revenue) AS revenue
FROM s GROUP BY channel ORDER BY sessions DESC, channel`,
    ['Collapse to session grain carrying medium, conversion and revenue.',
      'Apply the channel CASE ladder afterwards, with an ELSE.'],
    'Owning this query means never waiting for the GA4 UI to agree with you again.', true),

  // ─────────────────────────────── 4. Revenue & products (13) ──
  q('C38', S4, 'easy',
    'What was total net revenue in 2024? Return `revenue`.',
    "SELECT SUM(gross_revenue) AS revenue FROM orders WHERE status = 'completed'",
    ['Completed orders only.', 'Sum the revenue column.'],
    'The number on the first slide.'),

  q('C39', S4, 'easy',
    'What is average order value? Return `orders`, `revenue`, `aov`.',
    `SELECT COUNT(*) AS orders, SUM(gross_revenue) AS revenue,
       SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)) AS aov
FROM orders WHERE status = 'completed'`,
    ['AOV is revenue over order count.', 'Not AVG of the column, though they agree here.'],
    'AOV × orders is the whole revenue model; moving either moves the business.'),

  q('C40', S4, 'medium',
    'Mean or median. What does a typical order look like? Return `mean_aov` and `median_aov`.',
    `SELECT AVG(gross_revenue) AS mean_aov, PERCENTILE_CONT(gross_revenue, 0.5) AS median_aov
FROM orders WHERE status = 'completed'`,
    ['PERCENTILE_CONT at 0.5 is the median.', 'The gap is the skew.'],
    'Stops the merchandising team designing for a customer who does not exist.'),

  q('C41', S4, 'medium',
    'How does revenue trend by month? Return `month`, `orders`, `revenue`, chronological.',
    `SELECT DATE_TRUNC(order_date, MONTH) AS month, COUNT(*) AS orders, SUM(gross_revenue) AS revenue
FROM orders WHERE status = 'completed' GROUP BY month ORDER BY month`,
    ['DATE_TRUNC to month.', 'Group by the truncated value.'],
    'Seasonality is the context for every "we are down this month" panic.', true),

  q('C42', S4, 'medium',
    'What is the refund rate? Return `completed`, `refunded`, `refund_rate` and `refund_value`.',
    `SELECT COUNTIF(status = 'completed') AS completed,
       COUNTIF(status = 'refunded') AS refunded,
       SAFE_DIVIDE(COUNTIF(status = 'refunded'), COUNTIF(status IN ('completed','refunded'))) AS refund_rate,
       ABS(SUM(CASE WHEN status = 'refunded' THEN gross_revenue ELSE 0 END)) AS refund_value
FROM orders`,
    ['COUNTIF for each status.', 'The denominator is completed plus refunded, not all orders.'],
    'Refund rate above 8% usually means a sizing or expectation problem, not a fraud one.'),

  q('C43', S4, 'medium',
    'Which product category earns the most? Return `category`, `units`, `revenue`, `profit`, best revenue first.',
    `SELECT p.category, SUM(i.quantity) AS units,
       SUM(i.quantity * i.unit_price - i.line_discount) AS revenue,
       SUM(i.quantity * (i.unit_price - p.unit_cost) - i.line_discount) AS profit
FROM order_items i JOIN products p USING (product_id) JOIN orders o USING (order_id)
WHERE o.status = 'completed'
GROUP BY p.category ORDER BY revenue DESC, p.category`,
    ['Work at line-item grain.', 'Never sum orders.gross_revenue after this join.'],
    'Revenue and profit rank categories differently. That is the merchandising decision.', true),

  q('C44', S4, 'medium',
    'What are the top 15 products by revenue? Return `product_name`, `units`, `revenue`.',
    `SELECT p.product_name, SUM(i.quantity) AS units,
       SUM(i.quantity * i.unit_price - i.line_discount) AS revenue
FROM order_items i JOIN products p USING (product_id) JOIN orders o USING (order_id)
WHERE o.status = 'completed'
GROUP BY p.product_name ORDER BY revenue DESC, p.product_name LIMIT 15`,
    ['Group by product name at line-item grain.'],
    'The hero products that paid media should be built around.', true),

  q('C45', S4, 'medium',
    'What does discounting cost us? Return `used_coupon`, `orders`, `aov`, `margin_pct`.',
    `SELECT CASE WHEN coupon_code IS NULL THEN 'no coupon' ELSE 'coupon' END AS used_coupon,
       COUNT(*) AS orders,
       SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)) AS aov,
       SAFE_DIVIDE(SUM(gross_revenue) - SUM(cogs), SUM(gross_revenue)) AS margin_pct
FROM orders WHERE status = 'completed'
GROUP BY used_coupon ORDER BY used_coupon`,
    ['CASE on NULL to split the groups.', 'Compare AOV and margin, not just counts.'],
    'Whether the promo calendar is buying growth or buying revenue you already had.', true),

  q('C46', S4, 'hard',
    'Which coupon codes are used most and what do they cost? Return `coupon_code`, `orders`, `revenue`, `avg_discount`, most used first.',
    `SELECT coupon_code, COUNT(*) AS orders, SUM(gross_revenue) AS revenue,
       AVG(discount_amount) AS avg_discount
FROM orders WHERE status = 'completed' AND coupon_code IS NOT NULL
GROUP BY coupon_code ORDER BY orders DESC, coupon_code`,
    ['IS NOT NULL keeps coupon orders only.'],
    'Which codes to retire and which to promote.', true),

  q('C47', S4, 'hard',
    'What is gross profit and margin overall? Return `revenue`, `cogs`, `gross_profit`, `margin_pct`.',
    `SELECT SUM(gross_revenue) AS revenue, SUM(cogs) AS cogs,
       SUM(gross_revenue) - SUM(cogs) AS gross_profit,
       SAFE_DIVIDE(SUM(gross_revenue) - SUM(cogs), SUM(gross_revenue)) AS margin_pct
FROM orders WHERE status = 'completed'`,
    ['Sum both sides, then subtract.', 'Margin is profit over revenue.'],
    'Sets the CAC ceiling: you cannot pay more to acquire than the margin you earn.'),

  q('C48', S4, 'hard',
    'Which day of week earns most? Return `day_name`, `orders`, `revenue`, best first.',
    `SELECT d.day_name, COUNT(*) AS orders, SUM(o.gross_revenue) AS revenue
FROM orders o JOIN date_dim d ON d.date = o.order_date
WHERE o.status = 'completed'
GROUP BY d.day_name ORDER BY revenue DESC, d.day_name`,
    ['date_dim carries the day name.'],
    'Ad scheduling, email send days and staffing all key off this.', true),

  q('C49', S4, 'hard',
    'How much revenue came on holidays? Return `holiday_name`, `orders`, `revenue`, biggest first.',
    `SELECT d.holiday_name, COUNT(*) AS orders, SUM(o.gross_revenue) AS revenue
FROM orders o JOIN date_dim d ON d.date = o.order_date
WHERE o.status = 'completed' AND d.is_holiday = 1
GROUP BY d.holiday_name ORDER BY revenue DESC, d.holiday_name`,
    ['Filter to holidays, group by the name.'],
    'Justifies the Q4 budget concentration: or does not.', true),

  q('C50', S4, 'expert',
    'Build the revenue bridge. Return `gross_revenue`, `refunds`, `net_revenue`, `discounts`, `cogs`, `gross_profit`.',
    `SELECT
  SUM(CASE WHEN status = 'completed' THEN gross_revenue ELSE 0 END) AS gross_revenue,
  ABS(SUM(CASE WHEN status = 'refunded' THEN gross_revenue ELSE 0 END)) AS refunds,
  SUM(CASE WHEN status IN ('completed','refunded') THEN gross_revenue ELSE 0 END) AS net_revenue,
  SUM(CASE WHEN status = 'completed' THEN discount_amount ELSE 0 END) AS discounts,
  SUM(CASE WHEN status = 'completed' THEN cogs ELSE 0 END) AS cogs,
  SUM(CASE WHEN status = 'completed' THEN gross_revenue - cogs ELSE 0 END) AS gross_profit
FROM orders`,
    ['One pass, conditional aggregation per bridge line.',
      'Refunds are stored negative, so net revenue includes them naturally.'],
    'The reconciliation that stops three teams quoting three revenue numbers.'),

  // ─────────────────────────────── 5. Customers & LTV (12) ──
  q('C51', S5, 'easy',
    'How many customers does Northbeam have, split B2C and B2B? Return `segment` and `customers`.',
    'SELECT segment, COUNT(*) AS customers FROM customers GROUP BY segment ORDER BY segment',
    ['Group by segment.'],
    'The two businesses have different economics and should never be averaged together.', true),

  q('C52', S5, 'easy',
    'What is the repeat purchase rate? Return `buyers`, `repeat_buyers`, `repeat_rate`.',
    `WITH pc AS (SELECT customer_id, COUNT(*) AS n FROM orders WHERE status = 'completed' GROUP BY customer_id)
SELECT COUNT(*) AS buyers, COUNTIF(n > 1) AS repeat_buyers,
       SAFE_DIVIDE(COUNTIF(n > 1), COUNT(*)) AS repeat_rate
FROM pc`,
    ['Count orders per customer first.', 'The denominator is buyers, not all customers.'],
    'The single best predictor of whether paid acquisition can ever be profitable.'),

  q('C53', S5, 'medium',
    'What is average LTV by acquisition channel? Return `first_touch_channel`, `customers`, `avg_ltv`, best first.',
    `SELECT first_touch_channel, COUNT(*) AS customers, AVG(lifetime_revenue) AS avg_ltv
FROM customer_ltv GROUP BY first_touch_channel ORDER BY avg_ltv DESC, first_touch_channel`,
    ['The view already has lifetime revenue per customer.'],
    'Which channels bring customers worth paying more for.', true),

  q('C54', S5, 'medium',
    'Who are the 20 highest-value customers? Return `customer_id`, `segment`, `orders_count`, `lifetime_revenue`.',
    `SELECT customer_id, segment, orders_count, lifetime_revenue
FROM customer_ltv ORDER BY lifetime_revenue DESC, customer_id LIMIT 20`,
    ['Sort the view descending.'],
    'The VIP list the lifecycle team should be treating differently.', true),

  q('C55', S5, 'medium',
    'How concentrated is revenue? Return `decile`, `customers`, `revenue`, `share_of_revenue`, ordered by decile.',
    `WITH r AS (SELECT customer_id, lifetime_revenue,
                      NTILE(10) OVER (ORDER BY lifetime_revenue DESC) AS decile
            FROM customer_ltv)
SELECT decile, COUNT(*) AS customers, SUM(lifetime_revenue) AS revenue,
       SAFE_DIVIDE(SUM(lifetime_revenue), SUM(SUM(lifetime_revenue)) OVER ()) AS share_of_revenue
FROM r GROUP BY decile ORDER BY decile`,
    ['NTILE(10) over lifetime revenue descending.', 'A windowed SUM over the group sums gives the share.'],
    'If the top decile is over half of revenue, retention beats acquisition.', true),

  q('C56', S5, 'medium',
    'Which countries have the highest revenue per customer? Return `country`, `customers`, `revenue`, `revenue_per_customer` for countries with 100+ customers, best first.',
    `SELECT c.country, COUNT(DISTINCT c.customer_id) AS customers,
       SUM(o.gross_revenue) AS revenue,
       SAFE_DIVIDE(SUM(o.gross_revenue), COUNT(DISTINCT c.customer_id)) AS revenue_per_customer
FROM customers c JOIN orders o USING (customer_id)
WHERE o.status = 'completed'
GROUP BY c.country HAVING COUNT(DISTINCT c.customer_id) >= 100
ORDER BY revenue_per_customer DESC, c.country`,
    ['COUNT DISTINCT the customer: the join fans them out.', 'Volume floor in HAVING.'],
    'Where to open the next market.', true),

  q('C57', S5, 'hard',
    'Segment customers by recency. Return `recency_band` and `customers`, biggest first.',
    `SELECT CASE
         WHEN last_order_date IS NULL THEN 'never ordered'
         WHEN DATE_DIFF(DATE '2024-12-31', last_order_date, DAY) <= 30 THEN 'active'
         WHEN DATE_DIFF(DATE '2024-12-31', last_order_date, DAY) <= 90 THEN 'lapsing'
         WHEN DATE_DIFF(DATE '2024-12-31', last_order_date, DAY) <= 180 THEN 'lapsed'
         ELSE 'churned' END AS recency_band,
       COUNT(*) AS customers
FROM customer_ltv GROUP BY recency_band ORDER BY customers DESC, recency_band`,
    ['Handle the NULL branch first.', 'Each later branch needs only an upper bound.'],
    'Sizes each lifecycle campaign audience before it is built.', true),

  q('C58', S5, 'hard',
    'Build RFM segments. Return `segment` and `customers`, biggest first.',
    `WITH s AS (
  SELECT customer_id,
         NTILE(4) OVER (ORDER BY last_order_date) AS r,
         NTILE(4) OVER (ORDER BY orders_count) AS f
  FROM customer_ltv WHERE last_order_date IS NOT NULL
)
SELECT CASE WHEN r = 4 AND f = 4 THEN 'Champions'
            WHEN r = 3 AND f >= 3 THEN 'Loyal'
            WHEN r <= 2 AND f >= 3 THEN 'At risk'
            WHEN r = 4 AND f = 1 THEN 'New'
            ELSE 'Other' END AS segment,
       COUNT(*) AS customers
FROM s GROUP BY segment ORDER BY customers DESC, segment`,
    ['NTILE(4) on recency and frequency.', 'Order the CASE branches most specific first.'],
    '"At risk" is the cheapest churn there is to reverse.', true),

  q('C59', S5, 'hard',
    'How long between a customer\'s orders? Return `customer_id`, `orders`, `avg_gap_days` for customers with 3+ orders, shortest gap first, top 20.',
    `WITH g AS (
  SELECT customer_id, order_date,
         DATE_DIFF(order_date, LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, order_id), DAY) AS gap
  FROM orders WHERE status = 'completed'
)
SELECT customer_id, COUNT(*) AS orders, AVG(gap) AS avg_gap_days
FROM g GROUP BY customer_id HAVING COUNT(gap) >= 2
ORDER BY avg_gap_days, customer_id LIMIT 20`,
    ['LAG partitioned by customer.', 'HAVING COUNT(gap) counts only the real gaps, not the NULL first one.'],
    'Sets the trigger delay for the win-back email.', true),

  q('C60', S5, 'hard',
    'What is 90-day cohort LTV? Return `cohort_month`, `customers`, `ltv_90d` for cohorts up to September, chronological.',
    `WITH f AS (SELECT customer_id, MIN(order_date) AS first_date
            FROM orders WHERE status = 'completed' GROUP BY customer_id),
w AS (SELECT f.customer_id, DATE_TRUNC(f.first_date, MONTH) AS cohort_month,
             SUM(CASE WHEN DATE_DIFF(o.order_date, f.first_date, DAY) <= 90 THEN o.gross_revenue ELSE 0 END) AS r90
      FROM f JOIN orders o ON o.customer_id = f.customer_id AND o.status = 'completed'
      GROUP BY f.customer_id, cohort_month)
SELECT cohort_month, COUNT(*) AS customers, AVG(r90) AS ltv_90d
FROM w WHERE cohort_month <= '2024-09-01' GROUP BY cohort_month ORDER BY cohort_month`,
    ['Anchor the window to each customer\'s own first order.', 'Exclude cohorts too young for 90 days.'],
    'The only LTV comparison that is fair across acquisition months.', true),

  q('C61', S5, 'expert',
    'What is LTV:CAC by channel? Return `channel`, `cac`, `avg_ltv`, `ltv_cac_ratio`, best first.',
    `WITH s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel),
v AS (SELECT first_touch_channel AS channel, COUNT(*) AS customers, AVG(lifetime_revenue) AS avg_ltv
      FROM customer_ltv GROUP BY first_touch_channel)
SELECT s.channel, SAFE_DIVIDE(s.spend, v.customers) AS cac, v.avg_ltv,
       SAFE_DIVIDE(v.avg_ltv, SAFE_DIVIDE(s.spend, v.customers)) AS ltv_cac_ratio
FROM s JOIN v USING (channel) ORDER BY ltv_cac_ratio DESC, s.channel`,
    ['Two CTEs at channel grain.', 'Ratio is LTV over CAC, 3:1 is the conventional floor.'],
    'The number that decides next quarter\'s channel mix.', true),

  q('C62', S5, 'expert',
    'What is the payback period by channel? Return `channel`, `cac`, `monthly_revenue_per_customer`, `payback_months`, fastest first.',
    `WITH s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel),
v AS (SELECT first_touch_channel AS channel, COUNT(*) AS customers, AVG(lifetime_revenue) / 12 AS monthly_rev
      FROM customer_ltv GROUP BY first_touch_channel)
SELECT s.channel, SAFE_DIVIDE(s.spend, v.customers) AS cac,
       v.monthly_rev AS monthly_revenue_per_customer,
       SAFE_DIVIDE(SAFE_DIVIDE(s.spend, v.customers), v.monthly_rev) AS payback_months
FROM s JOIN v USING (channel) ORDER BY payback_months, s.channel`,
    ['Payback is CAC over monthly revenue per customer.', 'Spread annual LTV over 12 months.'],
    'Decides whether growth can self-fund or needs financing.', true),

  // ─────────────────────────────── 6. Subscriptions & MRR (12) ──
  q('C63', S6, 'easy',
    'What is current active MRR? Return `active_subs` and `mrr`.',
    "SELECT COUNT(*) AS active_subs, SUM(mrr) AS mrr FROM subscriptions WHERE status = 'active'",
    ['Filter to active.', 'Count and sum.'],
    'The SaaS side\'s headline number.'),

  q('C64', S6, 'easy',
    'How does MRR split by plan tier? Return `tier`, `subs`, `mrr`, biggest first.',
    `SELECT p.tier, COUNT(*) AS subs, SUM(s.mrr) AS mrr
FROM subscriptions s JOIN plans p USING (plan_id) WHERE s.status = 'active'
GROUP BY p.tier ORDER BY mrr DESC, p.tier`,
    ['Tier is on plans, MRR on subscriptions.'],
    'Shows whether the business is many small accounts or a few large ones.', true),

  q('C65', S6, 'medium',
    'What is the MRR bridge by month? Return `month`, `new_mrr`, `churned_mrr`, `net_new_mrr`, chronological.',
    `WITH m AS (SELECT DISTINCT month_start AS month FROM date_dim),
n AS (SELECT DATE_TRUNC(started_at, MONTH) AS month, SUM(mrr) AS new_mrr FROM subscriptions GROUP BY month),
c AS (SELECT DATE_TRUNC(canceled_at, MONTH) AS month, SUM(mrr) AS churned_mrr
      FROM subscriptions WHERE canceled_at IS NOT NULL GROUP BY month)
SELECT m.month, COALESCE(n.new_mrr, 0) AS new_mrr, COALESCE(c.churned_mrr, 0) AS churned_mrr,
       COALESCE(n.new_mrr, 0) - COALESCE(c.churned_mrr, 0) AS net_new_mrr
FROM m LEFT JOIN n USING (month) LEFT JOIN c USING (month) ORDER BY m.month`,
    ['Starts and cancellations are different events on different dates.', 'A month spine keeps quiet months visible.'],
    'Flat MRR can hide large offsetting movements. This shows them.', true),

  q('C66', S6, 'medium',
    'What is monthly logo churn? Return `tier`, `subs`, `churned`, `churn_rate`, worst first.',
    `SELECT p.tier, COUNT(*) AS subs, COUNTIF(s.canceled_at IS NOT NULL) AS churned,
       SAFE_DIVIDE(COUNTIF(s.canceled_at IS NOT NULL), COUNT(*)) AS churn_rate
FROM subscriptions s JOIN plans p USING (plan_id)
GROUP BY p.tier ORDER BY churn_rate DESC, p.tier`,
    ['COUNTIF over IS NOT NULL.', 'Rate over the tier population.'],
    'Starter churn is usually fine; Enterprise churn is a fire.', true),

  q('C67', S6, 'medium',
    'Why do customers cancel? Return `cancel_reason`, `subs`, `lost_mrr`, biggest loss first.',
    `SELECT cancel_reason, COUNT(*) AS subs, SUM(mrr) AS lost_mrr
FROM subscriptions WHERE canceled_at IS NOT NULL
GROUP BY cancel_reason ORDER BY lost_mrr DESC, cancel_reason`,
    ['Filter to cancellations so NULL reasons drop out.', 'Rank by MRR, not count.'],
    'Rank by revenue lost, and the roadmap priorities change.', true),

  q('C68', S6, 'medium',
    'How much MRR is at risk from failed payments? Return `failure_code`, `failed_charges`, `at_risk_amount`, biggest first.',
    `SELECT failure_code, COUNT(*) AS failed_charges, SUM(amount) AS at_risk_amount
FROM stripe_charges WHERE status = 'failed'
GROUP BY failure_code ORDER BY at_risk_amount DESC, failure_code`,
    ['Failed charges carry a failure code.'],
    'Involuntary churn is the cheapest churn to fix: dunning recovers 30-50%.', true),

  q('C69', S6, 'hard',
    'What is active MRR month by month? Return `month` and `active_mrr`, chronological.',
    `WITH m AS (SELECT DISTINCT month_start AS month FROM date_dim)
SELECT m.month, COALESCE(SUM(s.mrr), 0) AS active_mrr
FROM m LEFT JOIN subscriptions s
       ON s.started_at < m.month AND (s.canceled_at IS NULL OR s.canceled_at >= m.month)
GROUP BY m.month ORDER BY m.month`,
    ['A subscription is live if it started before the month and had not cancelled by it.',
      'Both halves of that test go in the join condition.'],
    'The growth curve the board actually looks at.', true),

  q('C70', S6, 'hard',
    'Do trials help? Return `had_trial`, `subs`, `still_active_rate`.',
    `SELECT CASE WHEN trial_end_at IS NULL THEN 'no trial' ELSE 'trial' END AS had_trial,
       COUNT(*) AS subs,
       SAFE_DIVIDE(COUNTIF(status = 'active'), COUNT(*)) AS still_active_rate
FROM subscriptions GROUP BY had_trial ORDER BY had_trial`,
    ['CASE on whether a trial end date exists.'],
    'Whether the free trial earns its support cost.', true),

  q('C71', S6, 'hard',
    'What is the activation rate for B2B customers? Return `signed_up`, `activated`, `activation_rate`, `avg_days_to_activate`.',
    `WITH a AS (SELECT user_id, MIN(DATE(event_time)) AS activated_on
            FROM product_events WHERE event_name = 'activated' GROUP BY user_id)
SELECT COUNT(DISTINCT c.customer_id) AS signed_up,
       COUNT(DISTINCT a.user_id) AS activated,
       SAFE_DIVIDE(COUNT(DISTINCT a.user_id), COUNT(DISTINCT c.customer_id)) AS activation_rate,
       AVG(DATE_DIFF(a.activated_on, c.signup_date, DAY)) AS avg_days_to_activate
FROM customers c LEFT JOIN a ON a.user_id = c.customer_id
WHERE c.is_b2b = 1`,
    ['LEFT JOIN so unactivated customers stay in the denominator.',
      'AVG over DATE_DIFF skips the NULLs automatically.'],
    'Activation is upstream of retention, expansion and referral, and the fastest to move.'),

  q('C72', S6, 'hard',
    'Does activation predict retention? Return `activated`, `subs`, `avg_days_subscribed`.',
    `WITH a AS (SELECT DISTINCT user_id FROM product_events WHERE event_name = 'activated')
SELECT CASE WHEN a.user_id IS NULL THEN 'never activated' ELSE 'activated' END AS activated,
       COUNT(*) AS subs,
       AVG(DATE_DIFF(COALESCE(s.canceled_at, DATE '2024-12-31'), s.started_at, DAY)) AS avg_days_subscribed
FROM subscriptions s LEFT JOIN a ON a.user_id = s.customer_id
GROUP BY activated ORDER BY activated`,
    ['COALESCE the cancellation date to year end for live subscriptions.'],
    'If the gap is large, onboarding is the highest-ROI project available.', true),

  q('C73', S6, 'expert',
    'What is net revenue retention for the mid-year cohort? Return `starting_mrr`, `churned_mrr`, `nrr`.',
    `WITH c AS (SELECT subscription_id, mrr, canceled_at FROM subscriptions
            WHERE started_at < '2024-07-01' AND (canceled_at IS NULL OR canceled_at >= '2024-07-01'))
SELECT SUM(mrr) AS starting_mrr,
       SUM(CASE WHEN canceled_at IS NOT NULL AND canceled_at <= '2024-12-31' THEN mrr ELSE 0 END) AS churned_mrr,
       SAFE_DIVIDE(SUM(mrr) - SUM(CASE WHEN canceled_at IS NOT NULL AND canceled_at <= '2024-12-31' THEN mrr ELSE 0 END),
                   SUM(mrr)) AS nrr
FROM c`,
    ['Fix the cohort at a point in time, then measure what survives.',
      'Without expansion revenue in the data, NRR cannot exceed 1.'],
    'NRR is the single number SaaS investors ask for first.'),

  q('C74', S6, 'expert',
    'Which plan tier has the best unit economics? Return `tier`, `subs`, `avg_mrr`, `avg_months_subscribed`, `avg_lifetime_value`, best LTV first.',
    `SELECT p.tier, COUNT(*) AS subs, AVG(s.mrr) AS avg_mrr,
       AVG(DATE_DIFF(COALESCE(s.canceled_at, DATE '2024-12-31'), s.started_at, DAY)) / 30 AS avg_months_subscribed,
       AVG(s.mrr) * (AVG(DATE_DIFF(COALESCE(s.canceled_at, DATE '2024-12-31'), s.started_at, DAY)) / 30) AS avg_lifetime_value
FROM subscriptions s JOIN plans p USING (plan_id)
GROUP BY p.tier ORDER BY avg_lifetime_value DESC, p.tier`,
    ['Lifetime is MRR times months subscribed.',
      'COALESCE the end date so live subscriptions count their time so far.'],
    'Where the sales team should be spending its hours.', true),

  // ─────────────────────────────── 7. Attribution (10) ──
  q('C75', S7, 'easy',
    'How many marketing touches are recorded, and how many journeys converted? Return `touches`, `journeys`, `converted_journeys`.',
    `SELECT COUNT(*) AS touches,
       COUNT(DISTINCT user_pseudo_id) AS journeys,
       COUNT(DISTINCT CASE WHEN converted = 1 THEN user_pseudo_id END) AS converted_journeys
FROM attribution_touchpoints`,
    ['One row per touch.', 'COUNT DISTINCT with a CASE counts only converting journeys.'],
    'Establishes the base rates before any model is applied.'),

  q('C76', S7, 'medium',
    'How long is a typical journey? Return `journey_length`, `journeys`, `conversion_rate`, ordered by length.',
    `WITH j AS (SELECT user_pseudo_id, MAX(journey_length) AS journey_length, MAX(converted) AS converted
            FROM attribution_touchpoints GROUP BY user_pseudo_id)
SELECT journey_length, COUNT(*) AS journeys,
       SAFE_DIVIDE(SUM(converted), COUNT(*)) AS conversion_rate
FROM j GROUP BY journey_length ORDER BY journey_length`,
    ['Collapse to one row per journey first.'],
    'If most journeys are single-touch, multi-touch attribution is largely theatre.', true),

  q('C77', S7, 'medium',
    'First touch vs last touch: return `channel`, `first_touch_value`, `last_touch_value`, biggest first-touch first.',
    `SELECT channel,
       SUM(CASE WHEN touch_position = 1 THEN conversion_value ELSE 0 END) AS first_touch_value,
       SUM(CASE WHEN touch_position = journey_length THEN conversion_value ELSE 0 END) AS last_touch_value
FROM attribution_touchpoints WHERE converted = 1
GROUP BY channel ORDER BY first_touch_value DESC, channel`,
    ['Position 1 is first; position = journey_length is last.'],
    'The gap between the columns is the argument you are about to have.', true),

  q('C78', S7, 'medium',
    'What does linear attribution say? Return `channel` and `linear_credit`, biggest first.',
    `SELECT channel, SUM(SAFE_DIVIDE(conversion_value, journey_length)) AS linear_credit
FROM attribution_touchpoints WHERE converted = 1
GROUP BY channel ORDER BY linear_credit DESC, channel`,
    ['Split each conversion evenly across its touches.'],
    'The compromise model most teams settle on.', true),

  q('C79', S7, 'hard',
    'What does position-based (40/20/40) attribution say? Return `channel` and `position_credit`, biggest first.',
    `SELECT channel,
       SUM(CASE WHEN journey_length = 1 THEN conversion_value
                WHEN touch_position = 1 OR touch_position = journey_length THEN conversion_value * 0.4
                ELSE SAFE_DIVIDE(conversion_value * 0.2, journey_length - 2) END) AS position_credit
FROM attribution_touchpoints WHERE converted = 1
GROUP BY channel ORDER BY position_credit DESC, channel`,
    ['Single-touch journeys must be special-cased or you divide by zero.',
      'The middle 20% is shared among the middle touches.'],
    'Favours discovery and closing over the middle: which may be what you believe.', true),

  q('C80', S7, 'hard',
    'What does time-decay attribution say? Return `channel` and `time_decay_credit`, biggest first.',
    `WITH w AS (
  SELECT channel, conversion_value * SAFE_DIVIDE(touch_position,
           SUM(touch_position) OVER (PARTITION BY user_pseudo_id)) AS credit
  FROM attribution_touchpoints WHERE converted = 1
)
SELECT channel, SUM(credit) AS time_decay_credit
FROM w GROUP BY channel ORDER BY time_decay_credit DESC, channel`,
    ['Weight each touch by its position within the journey.',
      'A window function cannot be nested in an aggregate, compute credit in a CTE first.'],
    'Favours the channels closest to the conversion.', true),

  q('C81', S7, 'hard',
    'What does last non-direct attribution say? Return `channel` and `credit`, biggest first.',
    `SELECT channel, SUM(conversion_value) AS credit
FROM (
  SELECT channel, conversion_value,
         ROW_NUMBER() OVER (PARTITION BY user_pseudo_id ORDER BY touch_position DESC) AS rn
  FROM attribution_touchpoints WHERE converted = 1 AND channel != 'Direct'
) WHERE rn = 1
GROUP BY channel ORDER BY credit DESC, channel`,
    ['Filter Direct out *before* picking the last touch.',
      'ROW_NUMBER descending by position, then keep row 1.'],
    'The default in most analytics tools: and the reason Direct looks small in them.', true),

  q('C82', S7, 'hard',
    'What are the most common converting paths? Return `path` and `conversions`, top 15.',
    `WITH j AS (SELECT user_pseudo_id, STRING_AGG(channel, ' > ' ORDER BY touch_position) AS path
            FROM attribution_touchpoints WHERE converted = 1 GROUP BY user_pseudo_id)
SELECT path, COUNT(*) AS conversions FROM j GROUP BY path ORDER BY conversions DESC, path LIMIT 15`,
    ['STRING_AGG with ORDER BY inside it.', 'Without the ordering the paths are meaningless.'],
    'Reveals which channel combinations actually co-occur.', true),

  q('C83', S7, 'expert',
    'How much do the models disagree per channel? Return `channel`, `min_credit`, `max_credit`, `spread_pct`, widest first.',
    `WITH b AS (
  SELECT channel,
         SUM(CASE WHEN touch_position = 1 THEN conversion_value ELSE 0 END) AS ft,
         SUM(CASE WHEN touch_position = journey_length THEN conversion_value ELSE 0 END) AS lt,
         SUM(SAFE_DIVIDE(conversion_value, journey_length)) AS lin
  FROM attribution_touchpoints WHERE converted = 1 GROUP BY channel
)
SELECT channel, LEAST(ft, lt, lin) AS min_credit, GREATEST(ft, lt, lin) AS max_credit,
       SAFE_DIVIDE(GREATEST(ft, lt, lin) - LEAST(ft, lt, lin), LEAST(ft, lt, lin)) AS spread_pct
FROM b ORDER BY spread_pct DESC, channel`,
    ['GREATEST and LEAST take several arguments.'],
    'The channels with the widest spread are the ones your model choice decides.', true),

  q('C84', S7, 'expert',
    'Which paid channel should be cut? Return `channel`, `spend`, `linear_credit`, `linear_roas`, weakest first.',
    `WITH c AS (SELECT channel, SUM(SAFE_DIVIDE(conversion_value, journey_length)) AS linear_credit
            FROM attribution_touchpoints WHERE converted = 1 GROUP BY channel),
s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel)
SELECT s.channel, s.spend, COALESCE(c.linear_credit, 0) AS linear_credit,
       SAFE_DIVIDE(c.linear_credit, s.spend) AS linear_roas
FROM s LEFT JOIN c USING (channel) ORDER BY linear_roas, s.channel`,
    ['Only channels you pay for can be cut.', 'Ascending ROAS puts the weakest first.'],
    'The recommendation: which must ship with the caveat that this is correlational.', true),

  // ─────────────── 8. Support, ops & the board deck (16) ──
  q('C85', S8, 'easy',
    'How many support tickets were raised? Return `tickets` and `resolved`.',
    'SELECT COUNT(*) AS tickets, COUNTIF(resolved_at IS NOT NULL) AS resolved FROM support_tickets',
    ['COUNTIF over IS NOT NULL.'],
    'Support load per customer is a leading indicator of churn.'),

  q('C86', S8, 'easy',
    'What drives support volume? Return `category`, `tickets`, `avg_csat`, most tickets first.',
    `SELECT category, COUNT(*) AS tickets, AVG(csat) AS avg_csat
FROM support_tickets GROUP BY category ORDER BY tickets DESC, category`,
    ['AVG skips unsurveyed tickets automatically.'],
    'The top category is usually a product bug wearing a support costume.', true),

  q('C87', S8, 'medium',
    'How fast is first response by priority? Return `priority`, `tickets`, `avg_response_minutes`, ordered by priority.',
    `SELECT priority, COUNT(*) AS tickets,
       AVG(TIMESTAMP_DIFF(first_response_at, created_at, MINUTE)) AS avg_response_minutes
FROM support_tickets WHERE first_response_at IS NOT NULL
GROUP BY priority ORDER BY priority`,
    ['TIMESTAMP_DIFF takes the later timestamp first.', 'Unanswered tickets must be excluded.'],
    'SLA compliance: and note this metric excludes tickets never answered at all.', true),

  q('C88', S8, 'medium',
    'How many tickets were never answered? Return `unanswered` and `pct_unanswered`.',
    `SELECT COUNTIF(first_response_at IS NULL) AS unanswered,
       SAFE_DIVIDE(COUNTIF(first_response_at IS NULL), COUNT(*)) AS pct_unanswered
FROM support_tickets`,
    ['The NULL first_response_at is the whole answer.'],
    'The number the average-response-time metric quietly hides.'),

  q('C89', S8, 'medium',
    'Do heavy support users churn more? Return `ticket_band`, `customers`, `churn_rate`.',
    `WITH t AS (SELECT customer_id, COUNT(*) AS tickets FROM support_tickets GROUP BY customer_id)
SELECT CASE WHEN COALESCE(t.tickets, 0) = 0 THEN '0'
            WHEN t.tickets <= 2 THEN '1-2' ELSE '3+' END AS ticket_band,
       COUNT(*) AS customers,
       SAFE_DIVIDE(COUNTIF(s.canceled_at IS NOT NULL), COUNT(*)) AS churn_rate
FROM subscriptions s LEFT JOIN t ON t.customer_id = s.customer_id
GROUP BY ticket_band ORDER BY ticket_band`,
    ['LEFT JOIN so zero-ticket customers survive.', 'COALESCE before banding.'],
    'If heavy ticket users churn more, support is a retention lever, not a cost centre.', true),

  q('C90', S8, 'medium',
    'How is the email programme performing? Return `segment`, `sends`, `open_rate`, `click_rate`, `revenue`, most revenue first.',
    `SELECT segment, SUM(sent) AS sends,
       SAFE_DIVIDE(SUM(unique_opens), SUM(delivered)) AS open_rate,
       SAFE_DIVIDE(SUM(unique_clicks), SUM(unique_opens)) AS click_rate,
       SUM(attributed_revenue) AS revenue
FROM email_campaigns GROUP BY segment ORDER BY revenue DESC, segment`,
    ['Open rate uses delivered as the denominator, not sent.', 'Click rate uses opens.'],
    'Which lifecycle segments deserve more sends.', true),

  q('C91', S8, 'medium',
    'Which email campaigns earned the most? Return `campaign_name`, `sent_date`, `attributed_revenue`, top 15.',
    `SELECT campaign_name, sent_date, attributed_revenue
FROM email_campaigns ORDER BY attributed_revenue DESC, campaign_name LIMIT 15`,
    ['Straight sort on the revenue column.'],
    'The templates worth cloning.', true),

  q('C92', S8, 'medium',
    'What is the CRM funnel? Return `contacts`, `mqls`, `sqls`, `customers` and the three stage rates.',
    `SELECT COUNT(*) AS contacts,
       COUNTIF(mql_date IS NOT NULL) AS mqls,
       COUNTIF(sql_date IS NOT NULL) AS sqls,
       COUNTIF(became_customer_date IS NOT NULL) AS customers,
       SAFE_DIVIDE(COUNTIF(mql_date IS NOT NULL), COUNT(*)) AS lead_to_mql,
       SAFE_DIVIDE(COUNTIF(sql_date IS NOT NULL), COUNTIF(mql_date IS NOT NULL)) AS mql_to_sql,
       SAFE_DIVIDE(COUNTIF(became_customer_date IS NOT NULL), COUNTIF(sql_date IS NOT NULL)) AS sql_to_customer
FROM hubspot_contacts`,
    ['Count by stage *dates*, not by the current lifecycle label.',
      'Each rate divides a stage by the one before it.'],
    'Where the B2B funnel actually leaks.'),

  q('C93', S8, 'hard',
    'Which lead sources produce customers? Return `original_source`, `contacts`, `customers`, `conversion_rate` for sources with 100+ contacts, best first.',
    `SELECT original_source, COUNT(*) AS contacts,
       COUNTIF(became_customer_date IS NOT NULL) AS customers,
       SAFE_DIVIDE(COUNTIF(became_customer_date IS NOT NULL), COUNT(*)) AS conversion_rate
FROM hubspot_contacts GROUP BY original_source
HAVING COUNT(*) >= 100 ORDER BY conversion_rate DESC, original_source`,
    ['COUNTIF on the customer date.', 'Volume floor in HAVING.'],
    'Where demand gen should focus, measured on customers rather than leads.', true),

  q('C94', S8, 'hard',
    'What is the sales win rate by lead source? Return `lead_source`, `closed`, `won`, `win_rate`, `total_arr`, best win rate first.',
    `SELECT lead_source, COUNTIF(is_won IS NOT NULL) AS closed,
       COUNTIF(is_won = 1) AS won,
       SAFE_DIVIDE(COUNTIF(is_won = 1), COUNTIF(is_won IS NOT NULL)) AS win_rate,
       SUM(CASE WHEN is_won = 1 THEN arr ELSE 0 END) AS total_arr
FROM salesforce_opportunities GROUP BY lead_source
HAVING COUNTIF(is_won IS NOT NULL) >= 10
ORDER BY win_rate DESC, lead_source`,
    ['`is_won` is NULL for open opportunities, exclude them from the denominator.'],
    'Counting open deals as losses understates every source\'s win rate.', true),

  q('C95', S8, 'hard',
    'How long is the sales cycle by account tier? Return `tier`, `won_deals`, `avg_cycle_days`, `avg_arr`, longest cycle first.',
    `SELECT a.tier, COUNT(*) AS won_deals,
       AVG(DATE_DIFF(o.close_date, o.created_date, DAY)) AS avg_cycle_days,
       AVG(o.arr) AS avg_arr
FROM salesforce_opportunities o JOIN salesforce_accounts a USING (account_id)
WHERE o.is_won = 1
GROUP BY a.tier ORDER BY avg_cycle_days DESC, a.tier`,
    ['DATE_DIFF from created to close.', 'Won deals only.'],
    'Sets pipeline coverage targets. A 200-day cycle needs three quarters of pipeline.', true),

  q('C96', S8, 'hard',
    'How much marketing-sourced ARR is there? Return `sourced`, `opportunities`, `arr`.',
    `SELECT CASE WHEN campaign_id IS NULL THEN 'sales-sourced' ELSE 'marketing-sourced' END AS sourced,
       COUNT(*) AS opportunities,
       SUM(CASE WHEN is_won = 1 THEN arr ELSE 0 END) AS arr
FROM salesforce_opportunities
GROUP BY sourced ORDER BY sourced`,
    ['CASE on whether a campaign is attached.'],
    'The number marketing is held to at the board: and the one most affected by tracking gaps.', true),

  q('C97', S8, 'expert',
    'Is there a Simpson\'s paradox in channel AOV? Return `device`, `channel`, `orders`, `aov` for the two paid channels, ordered by device then channel.',
    `SELECT device, channel, COUNT(*) AS orders,
       SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)) AS aov
FROM orders
WHERE status = 'completed' AND channel IN ('Paid Search', 'Paid Social')
GROUP BY device, channel ORDER BY device, channel`,
    ['Group by both dimensions.', 'Compare the within-device ranking to the overall one.'],
    'If the ranking flips inside every device, the aggregate comparison is mix, not performance.', true),

  q('C98', S8, 'expert',
    'Sanity-check total revenue three ways. Return `from_orders`, `from_line_items`, `from_ga4`.',
    `SELECT
  (SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed') AS from_orders,
  (SELECT SUM(i.quantity * i.unit_price - i.line_discount)
   FROM order_items i JOIN orders o USING (order_id) WHERE o.status = 'completed') AS from_line_items,
  (SELECT SUM(ecommerce.purchase_revenue) FROM ga4_events WHERE event_name = 'purchase') AS from_ga4`,
    ['Three independent paths at three different grains.',
      'Expect disagreement. The job is to explain its size, not remove it.'],
    'Publishing one of these without knowing the other two is how analysts get ambushed.'),

  q('C99', S8, 'expert',
    'Build the executive summary. Return `spend`, `revenue`, `gross_profit`, `customers`, `blended_cac`, `roas`, `active_mrr`, `site_cvr`.',
    `SELECT
  (SELECT SUM(spend) FROM ad_spend_daily) AS spend,
  (SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed') AS revenue,
  (SELECT SUM(gross_revenue) - SUM(cogs) FROM orders WHERE status = 'completed') AS gross_profit,
  (SELECT COUNT(*) FROM customers) AS customers,
  SAFE_DIVIDE((SELECT SUM(spend) FROM ad_spend_daily), (SELECT COUNT(*) FROM customers)) AS blended_cac,
  SAFE_DIVIDE((SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed'),
              (SELECT SUM(spend) FROM ad_spend_daily)) AS roas,
  (SELECT SUM(mrr) FROM subscriptions WHERE status = 'active') AS active_mrr,
  (SELECT SAFE_DIVIDE(SUM(converted), COUNT(*)) FROM ga4_sessions WHERE source != 'internal-qa') AS site_cvr`,
    ['Eight scalar subqueries.', 'Keep every revenue filter identical so the numbers reconcile.'],
    'The Monday morning email. Every figure must survive being divided by another.'),

  q('C100', S8, 'expert',
    'The final question. Return `channel`, `spend`, `customers`, `cac`, `avg_ltv`, `ltv_cac`, `payback_months` and `verdict`: a CASE label of `scale`, `hold` or `review` based on whether LTV:CAC is above 3, above 1, or below. Order by ltv_cac descending.',
    `WITH s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel),
v AS (SELECT first_touch_channel AS channel, COUNT(*) AS customers, AVG(lifetime_revenue) AS avg_ltv
      FROM customer_ltv GROUP BY first_touch_channel),
j AS (SELECT s.channel, s.spend, v.customers, v.avg_ltv,
             SAFE_DIVIDE(s.spend, v.customers) AS cac
      FROM s JOIN v USING (channel))
SELECT channel, spend, customers, cac, avg_ltv,
       SAFE_DIVIDE(avg_ltv, cac) AS ltv_cac,
       SAFE_DIVIDE(cac, avg_ltv / 12) AS payback_months,
       CASE WHEN SAFE_DIVIDE(avg_ltv, cac) >= 3 THEN 'scale'
            WHEN SAFE_DIVIDE(avg_ltv, cac) >= 1 THEN 'hold'
            ELSE 'review' END AS verdict
FROM j ORDER BY ltv_cac DESC, channel`,
    ['Three CTEs: spend, value, and the join that computes CAC once.',
      'Computing CAC in its own CTE keeps the final SELECT readable.',
      'The verdict is a CASE ladder over the ratio.'],
    'This is the deliverable. Every earlier question was practice for being able to defend these eight columns in a room.',
    true),
];

export function capstoneSections(): string[] {
  return [...new Set(CAPSTONE.map((c) => c.section))];
}

export function capstoneBySection(section: string): CapstoneQuestion[] {
  return CAPSTONE.filter((c) => c.section === section);
}
