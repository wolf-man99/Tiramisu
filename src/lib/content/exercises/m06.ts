import { ex } from './helpers';

/**
 * Module 6: CASE, dates, strings, math and NULL handling (day 8).
 *
 * 40 exercises. This is the module that turns a learner from "can write a query" into
 * "can shape data". Most of the real work in marketing SQL is here: parsing campaign
 * names, bucketing customers, reconciling GA4's string dates, and deciding what a
 * missing value means.
 */
export const M06 = [
  // ── CASE ──
  ex('6.1', 8, 'easy',
    'Label the brand campaigns',
    'Return `campaign_name` and `brand_type`: `Brand` when is_brand is 1, otherwise `Non-brand`. Order by campaign_name.',
    ['google_ads_campaigns'], ['case-when'],
    `SELECT campaign_name,
       CASE WHEN is_brand = 1 THEN 'Brand' ELSE 'Non-brand' END AS brand_type
FROM google_ads_campaigns
ORDER BY campaign_name`,
    ['`CASE WHEN condition THEN result ELSE other END`.',
      'It is an expression, so it lives in the SELECT list and takes an alias.'],
    { orderMatters: true }),

  ex('6.2', 8, 'easy',
    'Multi-branch CASE',
    'Bucket orders into `size_band`: `small` under 75, `medium` under 200, `large` otherwise. Return `order_id`, `gross_revenue` and `size_band` for the first 25 completed orders by order_id.',
    ['orders'], ['case-when'],
    `SELECT order_id, gross_revenue,
       CASE WHEN gross_revenue < 75 THEN 'small'
            WHEN gross_revenue < 200 THEN 'medium'
            ELSE 'large' END AS size_band
FROM orders
WHERE status = 'completed'
ORDER BY order_id
LIMIT 25`,
    ['Stack WHEN clauses; the first match wins.',
      'Because evaluation stops at the first match, later branches do not need a lower bound.'],
    { orderMatters: true }),

  ex('6.3', 8, 'easy',
    'Simple CASE on a single column',
    'Return `priority` and `priority_rank` from `support_tickets`, urgent 1, high 2, normal 3, low 4, as distinct pairs, ordered by rank.',
    ['support_tickets'], ['case-when', 'distinct'],
    `SELECT DISTINCT priority,
       CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END AS priority_rank
FROM support_tickets
ORDER BY priority_rank`,
    ['The simple form `CASE col WHEN value THEN …` compares one column against values.',
      'It is shorter than the searched form when every branch tests the same column.'],
    { orderMatters: true }),

  ex('6.4', 8, 'medium',
    'CASE inside an aggregate',
    'Return `channel` and `high_value_orders`, the count of completed orders over 250, plus `all_orders`. Order by high_value_orders descending.',
    ['orders'], ['case-when', 'conditional-aggregation', 'group-by'],
    `SELECT channel,
       COUNT(CASE WHEN gross_revenue > 250 THEN 1 END) AS high_value_orders,
       COUNT(*) AS all_orders
FROM orders
WHERE status = 'completed'
GROUP BY channel
ORDER BY high_value_orders DESC, channel`,
    ['CASE with no ELSE returns NULL for non-matching rows.',
      'COUNT skips NULLs, so it counts only the matches.'],
    { orderMatters: true }),

  ex('6.5', 8, 'medium',
    'Pivot orders by status',
    'One row per `channel` with `completed`, `refunded` and `cancelled` counts. Order by channel.',
    ['orders'], ['pivot', 'conditional-aggregation'],
    `SELECT channel,
       COUNTIF(status = 'completed') AS completed,
       COUNTIF(status = 'refunded')  AS refunded,
       COUNTIF(status = 'cancelled') AS cancelled
FROM orders
GROUP BY channel
ORDER BY channel`,
    ['One COUNTIF per output column.',
      'This is a pivot: statuses become columns instead of rows.'],
    { orderMatters: true }),

  ex('6.6', 8, 'medium',
    'Pivot revenue by quarter',
    'Return `channel` and `q1`…`q4` revenue for completed orders. Order by channel.',
    ['orders', 'date_dim'], ['pivot', 'conditional-aggregation', 'inner-join'],
    `SELECT o.channel,
       SUM(CASE WHEN d.quarter = 1 THEN o.gross_revenue ELSE 0 END) AS q1,
       SUM(CASE WHEN d.quarter = 2 THEN o.gross_revenue ELSE 0 END) AS q2,
       SUM(CASE WHEN d.quarter = 3 THEN o.gross_revenue ELSE 0 END) AS q3,
       SUM(CASE WHEN d.quarter = 4 THEN o.gross_revenue ELSE 0 END) AS q4
FROM orders o
JOIN date_dim d ON d.date = o.order_date
WHERE o.status = 'completed'
GROUP BY o.channel
ORDER BY o.channel`,
    ['Join to date_dim for the quarter, then one SUM(CASE …) per quarter.',
      'ELSE 0 rather than NULL so the columns add up cleanly.'],
    { orderMatters: true }),

  // ── dates ──
  ex('6.7', 8, 'easy',
    'Truncate to month',
    'Return `month` and `orders` per month for completed orders, chronologically.',
    ['orders'], ['date-trunc', 'group-by'],
    `SELECT DATE_TRUNC(order_date, MONTH) AS month, COUNT(*) AS orders
FROM orders
WHERE status = 'completed'
GROUP BY month
ORDER BY month`,
    ['DATE_TRUNC snaps a date back to the start of the period.',
      'Group by the truncated value.'],
    { orderMatters: true }),

  ex('6.8', 8, 'easy',
    'Extract parts of a date',
    'Return `year`, `month_number`, `day_of_week` and `orders` for completed orders in June 2024, grouped by all three parts. Order by day_of_week.',
    ['orders'], ['date-functions', 'group-by'],
    `SELECT EXTRACT(YEAR FROM order_date) AS year,
       EXTRACT(MONTH FROM order_date) AS month_number,
       EXTRACT(DAYOFWEEK FROM order_date) AS day_of_week,
       COUNT(*) AS orders
FROM orders
WHERE status = 'completed'
  AND order_date BETWEEN '2024-06-01' AND '2024-06-30'
GROUP BY year, month_number, day_of_week
ORDER BY day_of_week`,
    ['`EXTRACT(part FROM date)` pulls one component out.',
      'In BigQuery, DAYOFWEEK returns 1 for Sunday through 7 for Saturday.'],
    { orderMatters: true }),

  ex('6.9', 8, 'medium',
    'Days between two dates',
    'Return `subscription_id`, `started_at`, `canceled_at` and `days_subscribed` for cancelled subscriptions. Shortest life first, top 20.',
    ['subscriptions'], ['date-diff'],
    `SELECT subscription_id, started_at, canceled_at,
       DATE_DIFF(canceled_at, started_at, DAY) AS days_subscribed
FROM subscriptions
WHERE canceled_at IS NOT NULL
ORDER BY days_subscribed, subscription_id
LIMIT 20`,
    ['`DATE_DIFF(later, earlier, DAY)`. The later date comes first.',
      'Filter out the still-active subscriptions or the result is NULL.'],
    { orderMatters: true,
      trap: 'DATE_DIFF takes the *end* date first. Swapping them gives negative numbers.' }),

  ex('6.10', 8, 'medium',
    'Add an interval',
    'Return `order_id`, `order_date` and `refund_deadline`, 30 days after the order, for the first 20 completed orders by order_id.',
    ['orders'], ['date-functions'],
    `SELECT order_id, order_date, DATE_ADD(order_date, INTERVAL 30 DAY) AS refund_deadline
FROM orders
WHERE status = 'completed'
ORDER BY order_id
LIMIT 20`,
    ['`DATE_ADD(date, INTERVAL n DAY)`. Note the INTERVAL keyword.',
      'DATE_SUB is the mirror image.'],
    { orderMatters: true }),

  ex('6.11', 8, 'medium',
    'Format a date for display',
    'Return `month_label` (like `Jun 2024`) and `revenue` for completed orders by month. Order chronologically by the underlying month.',
    ['orders'], ['date-functions', 'string-functions'],
    `SELECT FORMAT_DATE('%b %Y', DATE_TRUNC(order_date, MONTH)) AS month_label,
       SUM(gross_revenue) AS revenue
FROM orders
WHERE status = 'completed'
GROUP BY month_label, DATE_TRUNC(order_date, MONTH)
ORDER BY DATE_TRUNC(order_date, MONTH)`,
    ['`FORMAT_DATE(format, date)` renders a date as text. `%b` is the short month, `%Y` the year.',
      'Sorting by the label would give April, August, December…, sort by the real date instead.'],
    { orderMatters: true,
      trap: 'Formatting a date to text and then sorting by the text.' }),

  ex('6.12', 8, 'hard',
    "GA4's string dates",
    '`ga4_events.event_date` is a STRING like `20240614`. Return `day` as a real date and `events` for the first 10 days of 2024, chronologically.',
    ['ga4_events'], ['date-functions', 'ga4-schema'],
    `SELECT PARSE_DATE('%Y%m%d', event_date) AS day, COUNT(*) AS events
FROM ga4_events
WHERE event_date <= '20240110'
GROUP BY day
ORDER BY day`,
    ['`PARSE_DATE(format, string)` converts text into a real DATE.',
      'The format string mirrors the layout: `%Y%m%d` for `20240614`.',
      'You can still filter on the raw string because YYYYMMDD sorts correctly.'],
    { orderMatters: true,
      explanation: 'The GA4 export really does store `event_date` as a string. Filtering on the string is cheaper than parsing every row first, and in real BigQuery it is what lets partition pruning work.' }),

  ex('6.13', 8, 'hard',
    'Microsecond timestamps',
    '`event_timestamp` is in microseconds. Return `hour` (0–23) and `events` for purchase events, ordered by hour.',
    ['ga4_events'], ['date-functions', 'ga4-schema'],
    `SELECT EXTRACT(HOUR FROM TIMESTAMP_MICROS(event_timestamp)) AS hour,
       COUNT(*) AS events
FROM ga4_events
WHERE event_name = 'purchase'
GROUP BY hour
ORDER BY hour`,
    ['`TIMESTAMP_MICROS(x)` converts microseconds since epoch into a timestamp.',
      'Then EXTRACT the hour from it.',
      'Using TIMESTAMP_SECONDS or TIMESTAMP_MILLIS gives dates in the wrong millennium.'],
    { orderMatters: true }),

  ex('6.14', 8, 'medium',
    'Week-over-week buckets',
    'Return `week` (Monday-starting) and `revenue` for completed orders in Q4, chronologically.',
    ['orders', 'date_dim'], ['date-trunc', 'inner-join'],
    `SELECT d.week_start AS week, SUM(o.gross_revenue) AS revenue
FROM orders o
JOIN date_dim d ON d.date = o.order_date
WHERE o.status = 'completed'
  AND o.order_date BETWEEN '2024-10-01' AND '2024-12-31'
GROUP BY d.week_start
ORDER BY week`,
    ['date_dim already carries a Monday-based week_start.',
      'Using the dimension means everyone in the company agrees on where a week starts.'],
    { orderMatters: true }),

  ex('6.15', 8, 'medium',
    'Age of a customer',
    'Return `customer_id`, `signup_date` and `days_since_signup` measured to 2024-12-31, for the 20 oldest customers.',
    ['customers'], ['date-diff'],
    `SELECT customer_id, signup_date,
       DATE_DIFF(DATE '2024-12-31', signup_date, DAY) AS days_since_signup
FROM customers
ORDER BY days_since_signup DESC, customer_id
LIMIT 20`,
    ['Use a literal date as the later argument.',
      '`DATE \'2024-12-31\'` is BigQuery\'s typed date literal.'],
    { orderMatters: true }),

  ex('6.16', 8, 'hard',
    'Time to first response',
    'Return `ticket_id`, `priority` and `response_minutes` for tickets that were answered. Slowest first, top 20.',
    ['support_tickets'], ['date-diff', 'null-handling'],
    `SELECT ticket_id, priority,
       TIMESTAMP_DIFF(first_response_at, created_at, MINUTE) AS response_minutes
FROM support_tickets
WHERE first_response_at IS NOT NULL
ORDER BY response_minutes DESC, ticket_id
LIMIT 20`,
    ['`TIMESTAMP_DIFF` is the timestamp equivalent of DATE_DIFF, and takes MINUTE.',
      'Unanswered tickets must be filtered out or they produce NULL.'],
    { orderMatters: true,
      explanation: 'Note what this metric silently excludes: the 7% of tickets nobody ever answered. Reporting "average response time" from answered tickets only is the most flattering possible framing, and it is what most dashboards do.' }),

  // ── strings ──
  ex('6.17', 8, 'medium',
    'Split a campaign name',
    'Campaign names look like `GB_Search_NonBrand_UK_Exact`. Return `campaign_name`, `market`, `channel` and `brandness`, the first three underscore-separated parts. Order by campaign_name.',
    ['google_ads_campaigns'], ['split-parse', 'string-functions'],
    `SELECT campaign_name,
       SPLIT(campaign_name, '_')[OFFSET(0)] AS market,
       SPLIT(campaign_name, '_')[OFFSET(1)] AS channel,
       SPLIT(campaign_name, '_')[OFFSET(2)] AS brandness
FROM google_ads_campaigns
ORDER BY campaign_name`,
    ['`SPLIT(text, delimiter)` returns an array.',
      '`[OFFSET(n)]` reads the nth element, counting from 0.',
      '`[ORDINAL(n)]` counts from 1 if you prefer.'],
    { orderMatters: true,
      explanation: 'Naming conventions are a schema hiding in a string. Parsing them is how you get dimensions the ad platform never gave you, and why the convention is worth enforcing upstream.' }),

  ex('6.18', 8, 'medium',
    'Extract with a regex',
    'Return `campaign_name` and `geo`, the fourth segment of the name, using REGEXP_EXTRACT instead of SPLIT. Order by campaign_name.',
    ['google_ads_campaigns'], ['regexp', 'string-functions'],
    `SELECT campaign_name,
       REGEXP_EXTRACT(campaign_name, r'^[^_]+_[^_]+_[^_]+_([^_]+)') AS geo
FROM google_ads_campaigns
ORDER BY campaign_name`,
    ['`REGEXP_EXTRACT` returns the first capture group.',
      'Prefix the pattern with `r` so backslashes are not treated as escapes.',
      '`[^_]+` matches a run of non-underscore characters.'],
    { orderMatters: true }),

  ex('6.19', 8, 'medium',
    'Match a pattern',
    'Return `keyword_text` for distinct keywords that mention a brand: `northbeam`, `ridgeline` or `summit`, using REGEXP_CONTAINS. Alphabetical.',
    ['google_ads_keywords'], ['regexp'],
    `SELECT DISTINCT keyword_text
FROM google_ads_keywords
WHERE REGEXP_CONTAINS(keyword_text, r'northbeam|ridgeline|summit')
ORDER BY keyword_text`,
    ['`REGEXP_CONTAINS(text, pattern)` returns true/false.',
      'The `|` alternation matches any of the options.'],
    { orderMatters: true }),

  ex('6.20', 8, 'medium',
    'Clean up messy text',
    'Return `city_clean` and `orders` from completed orders, trimming whitespace and normalising capitalisation. Order by orders descending, top 15.',
    ['orders'], ['string-functions', 'group-by'],
    `SELECT INITCAP(TRIM(city)) AS city_clean, COUNT(*) AS orders
FROM orders
WHERE status = 'completed'
GROUP BY city_clean
ORDER BY orders DESC, city_clean
LIMIT 15`,
    ['TRIM removes leading and trailing whitespace; INITCAP title-cases.',
      'Group by the cleaned expression, not the raw column.'],
    { orderMatters: true }),

  ex('6.21', 8, 'medium',
    'Extract an email domain type',
    'Return `domain_type`: `personal` for gmail/outlook/yahoo/icloud/proton, otherwise `business`, and `customers`. Order by customers descending.',
    ['customers'], ['case-when', 'string-functions', 'in'],
    `SELECT CASE WHEN email_domain IN ('gmail.com','outlook.com','yahoo.com','icloud.com','proton.me')
            THEN 'personal' ELSE 'business' END AS domain_type,
       COUNT(*) AS customers
FROM customers
GROUP BY domain_type
ORDER BY customers DESC`,
    ['CASE with an IN test in the condition.',
      'Group by the CASE expression.'],
    { orderMatters: true,
      explanation: 'Personal vs business email domain is the cheapest B2B/B2C signal there is, and it usually beats whatever the signup form claimed.' }),

  ex('6.22', 8, 'medium',
    'Build a UTM-style string',
    'Return `campaign_id` and `utm` for Google campaigns, formatted as `utm_source=google&utm_medium=cpc&utm_campaign=<lowercased name>`. Order by campaign_id.',
    ['google_ads_campaigns'], ['string-functions'],
    `SELECT campaign_id,
       CONCAT('utm_source=google&utm_medium=cpc&utm_campaign=', LOWER(campaign_name)) AS utm
FROM google_ads_campaigns
ORDER BY campaign_id`,
    ['CONCAT joins the fixed prefix to the lowercased name.',
      'LOWER() normalises the campaign name. UTM values are case-sensitive downstream.'],
    { orderMatters: true }),

  ex('6.23', 8, 'hard',
    'Substring and position',
    'Return `page_path` and `section`, the text between the first and second slash, for landing pages. Order by page_path.',
    ['landing_pages'], ['string-functions', 'regexp'],
    `SELECT page_path,
       COALESCE(REGEXP_EXTRACT(page_path, r'^/([^/]+)'), '(root)') AS section
FROM landing_pages
ORDER BY page_path`,
    ['A regex is cleaner than SUBSTR + INSTR here.',
      'The root path `/` has no section, so COALESCE gives it a label.'],
    { orderMatters: true }),

  ex('6.24', 8, 'medium',
    'Pad and align',
    'Return `campaign_id` and `padded_id`, the id left-padded with zeros to 8 characters. Order by campaign_id.',
    ['google_ads_campaigns'], ['string-functions'],
    `SELECT campaign_id, LPAD(CAST(campaign_id AS STRING), 8, '0') AS padded_id
FROM google_ads_campaigns
ORDER BY campaign_id`,
    ['LPAD needs a string, so cast the number first.',
      '`LPAD(text, width, fill)`.'],
    { orderMatters: true }),

  ex('6.25', 8, 'hard',
    'Concatenate a journey',
    'Return `customer_id` and `journey`, the channels of each converted journey joined with ` > ` in touch order. Order by customer_id, limit 20.',
    ['attribution_touchpoints'], ['string-functions', 'group-by', 'attribution'],
    `SELECT customer_id, STRING_AGG(channel, ' > ' ORDER BY touch_position) AS journey
FROM attribution_touchpoints
WHERE customer_id IS NOT NULL AND converted = 1
GROUP BY customer_id
ORDER BY customer_id
LIMIT 20`,
    ['`STRING_AGG(col, separator)` concatenates a column across a group.',
      'Add `ORDER BY` inside the aggregate so the path reads in the right sequence.'],
    { orderMatters: true,
      explanation: 'Without the ORDER BY inside STRING_AGG the path is in arbitrary order, which makes a customer-journey report look plausible and be meaningless.' }),

  // ── math ──
  ex('6.26', 8, 'easy',
    'Round for presentation',
    'Return `channel`, `revenue` rounded to whole dollars and `aov` rounded to 2 decimals, for completed orders. Order by revenue descending.',
    ['orders'], ['math-functions', 'group-by'],
    `SELECT channel,
       ROUND(SUM(gross_revenue)) AS revenue,
       ROUND(SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)), 2) AS aov
FROM orders
WHERE status = 'completed'
GROUP BY channel
ORDER BY revenue DESC`,
    ['`ROUND(x)` rounds to whole numbers; `ROUND(x, 2)` to two decimals.',
      'Round at the end, after all the arithmetic.'],
    { orderMatters: true,
      trap: 'Rounding inputs and then aggregating accumulates the rounding error across every row.' }),

  ex('6.27', 8, 'medium',
    'Ceiling, floor and truncate',
    'Return `list_price`, `ceil_price`, `floor_price` and `trunc_price` for products, ordered by list_price.',
    ['products'], ['math-functions'],
    `SELECT list_price,
       CEIL(list_price / 10) AS ceil_price,
       FLOOR(list_price / 10) AS floor_price,
       TRUNC(list_price / 10) AS trunc_price
FROM products
ORDER BY list_price, product_id`,
    ['CEIL rounds up, FLOOR rounds down, TRUNC cuts towards zero.',
      'For positive numbers FLOOR and TRUNC agree; for negatives they do not.'],
    { orderMatters: true }),

  ex('6.28', 8, 'medium',
    'Absolute values for refunds',
    'Return `refund_count` and `refund_value`, the absolute total of negative revenue, from refunded orders.',
    ['orders'], ['math-functions'],
    `SELECT COUNT(*) AS refund_count, ABS(SUM(gross_revenue)) AS refund_value
FROM orders
WHERE status = 'refunded'`,
    ['Refunds are stored negative; ABS makes the total readable.',
      'Apply ABS to the sum, not to each row.']),

  ex('6.29', 8, 'medium',
    'Greatest and least',
    'Return `product_name`, `list_price`, and `floor_price`, the greater of unit_cost × 1.5 and 20. Order by floor_price descending.',
    ['products'], ['math-functions'],
    `SELECT product_name, list_price, GREATEST(unit_cost * 1.5, 20) AS floor_price
FROM products
ORDER BY floor_price DESC, product_name`,
    ['`GREATEST(a, b)` returns the larger; `LEAST` the smaller.',
      'Both take any number of arguments.'],
    { orderMatters: true }),

  ex('6.30', 8, 'medium',
    'Percentage change',
    'Return `platform`, `q3_spend`, `q4_spend` and `pct_change` from `ad_spend_daily`. Order by pct_change descending.',
    ['ad_spend_daily'], ['conditional-aggregation', 'safe-divide', 'math-functions'],
    `SELECT platform,
       SUM(CASE WHEN date BETWEEN '2024-07-01' AND '2024-09-30' THEN spend ELSE 0 END) AS q3_spend,
       SUM(CASE WHEN date BETWEEN '2024-10-01' AND '2024-12-31' THEN spend ELSE 0 END) AS q4_spend,
       SAFE_DIVIDE(
         SUM(CASE WHEN date BETWEEN '2024-10-01' AND '2024-12-31' THEN spend ELSE 0 END)
         - SUM(CASE WHEN date BETWEEN '2024-07-01' AND '2024-09-30' THEN spend ELSE 0 END),
         SUM(CASE WHEN date BETWEEN '2024-07-01' AND '2024-09-30' THEN spend ELSE 0 END)
       ) AS pct_change
FROM ad_spend_daily
GROUP BY platform
ORDER BY pct_change DESC`,
    ['Two conditional sums, then (new − old) / old.',
      'SAFE_DIVIDE protects against a platform that spent nothing in Q3.'],
    { orderMatters: true }),

  // ── NULL handling ──
  ex('6.31', 8, 'easy',
    'COALESCE a default',
    'Return `keyword_text` and `score`: the quality score, or 0 where it is missing. Order by keyword_id, limit 25.',
    ['google_ads_keywords'], ['coalesce', 'null-handling'],
    `SELECT keyword_text, COALESCE(quality_score, 0) AS score
FROM google_ads_keywords
ORDER BY keyword_id
LIMIT 25`,
    ['`COALESCE(a, b)` returns a unless it is NULL, in which case b.',
      'It takes any number of arguments and returns the first non-NULL.'],
    { orderMatters: true,
      trap: 'Defaulting an unknown score to 0 makes the keyword look terrible rather than unmeasured. Whether that is right depends on what you do next.' }),

  ex('6.32', 8, 'medium',
    'Zero is not unknown',
    'Return `avg_ignoring_nulls` = AVG(quality_score) and `avg_treating_null_as_zero` = AVG(COALESCE(quality_score, 0)) from `google_ads_keywords`.',
    ['google_ads_keywords'], ['null-handling', 'coalesce', 'avg'],
    `SELECT AVG(quality_score) AS avg_ignoring_nulls,
       AVG(COALESCE(quality_score, 0)) AS avg_treating_null_as_zero
FROM google_ads_keywords`,
    ['AVG skips NULLs entirely, the denominator shrinks.',
      'COALESCE to 0 keeps the row but drags the mean down.'],
    {
      explanation:
        'Neither number is wrong; they answer different questions. "Average score of scored keywords" and "average score if unscored counts as zero" are both defensible, and the gap between them is the size of your unscored inventory. State which one you meant.',
    }),

  ex('6.33', 8, 'medium',
    'NULLIF to avoid a division',
    'Return `campaign_id`, `clicks`, `impressions` and `ctr` computed with `clicks / NULLIF(impressions, 0)` for the first 20 rows of google_ads_daily by date then ad_group_id.',
    ['google_ads_daily'], ['null-handling', 'safe-divide'],
    `SELECT campaign_id, clicks, impressions,
       clicks * 1.0 / NULLIF(impressions, 0) AS ctr
FROM google_ads_daily
ORDER BY date, ad_group_id
LIMIT 20`,
    ['`NULLIF(a, b)` returns NULL when a equals b.',
      'Turning the 0 denominator into NULL makes the whole division NULL instead of an error.',
      'SAFE_DIVIDE does the same thing more directly. This is the portable version.'],
    { orderMatters: true }),

  ex('6.34', 8, 'medium',
    'IFNULL vs COALESCE',
    'Return `order_id`, `coupon_code` and `coupon_label`: the coupon, or `none`, for the first 20 orders by order_id.',
    ['orders'], ['coalesce', 'null-handling'],
    `SELECT order_id, coupon_code, IFNULL(coupon_code, 'none') AS coupon_label
FROM orders
ORDER BY order_id
LIMIT 20`,
    ['`IFNULL(a, b)` is COALESCE with exactly two arguments.',
      'Use COALESCE when you have a chain of fallbacks.'],
    { orderMatters: true }),

  ex('6.35', 8, 'hard',
    'Chained fallbacks',
    'Return `contact_id` and `attributed_campaign`: the original_campaign if present, otherwise the original_source, otherwise the text `unknown`. Order by contact_id, limit 25.',
    ['hubspot_contacts'], ['coalesce', 'null-handling'],
    `SELECT contact_id,
       COALESCE(original_campaign, original_source, 'unknown') AS attributed_campaign
FROM hubspot_contacts
ORDER BY contact_id
LIMIT 25`,
    ['COALESCE walks its arguments left to right and returns the first non-NULL.',
      'A literal as the last argument guarantees a value.'],
    { orderMatters: true }),

  ex('6.36', 8, 'hard',
    'Count the NULLs per column',
    'Audit `google_ads_keyword_daily`: return `rows`, `null_impression_share` and `pct_null`. The share of rows with a NULL search_impression_share.',
    ['google_ads_keyword_daily'], ['null-handling', 'countif', 'rate-metrics'],
    `SELECT COUNT(*) AS rows_total,
       COUNTIF(search_impression_share IS NULL) AS null_impression_share,
       SAFE_DIVIDE(COUNTIF(search_impression_share IS NULL), COUNT(*)) AS pct_null
FROM google_ads_keyword_daily`,
    ['COUNTIF over an IS NULL test counts the missing values.',
      'Divide by COUNT(*) for the share.'],
    { explanation: 'A null-rate audit is the second query to run on any new table, right after the grain check. A column that is 40% NULL cannot carry a report, no matter how good the rest of the query is.' }),

  ex('6.37', 8, 'hard',
    'Full campaign-name parser',
    'Decompose every Google campaign name into `market`, `channel`, `brandness`, `geo` and `match_type`, plus the original. Order by campaign_name.',
    ['google_ads_campaigns'], ['split-parse', 'string-functions'],
    `SELECT campaign_name,
       SPLIT(campaign_name, '_')[OFFSET(0)] AS market,
       SPLIT(campaign_name, '_')[OFFSET(1)] AS channel,
       SPLIT(campaign_name, '_')[OFFSET(2)] AS brandness,
       SPLIT(campaign_name, '_')[OFFSET(3)] AS geo,
       SPLIT(campaign_name, '_')[SAFE_OFFSET(4)] AS match_type
FROM google_ads_campaigns
ORDER BY campaign_name`,
    ['Five SPLIT calls, one per segment.',
      'Not every name has five segments, `SAFE_OFFSET` returns NULL instead of erroring on the short ones.'],
    { orderMatters: true,
      explanation: 'SAFE_OFFSET is the difference between a parser that works and one that dies the day somebody names a campaign slightly differently. Assume the convention will be broken, because it will.' }),

  ex('6.38', 8, 'hard',
    'Report by a parsed dimension',
    'Group Google spend by the parsed `channel` segment of the campaign name. Return `channel`, `spend` and `campaigns`. Order by spend descending.',
    ['google_ads_campaigns', 'google_ads_daily'], ['split-parse', 'group-by', 'inner-join'],
    `SELECT SPLIT(c.campaign_name, '_')[OFFSET(1)] AS channel,
       SUM(d.cost) AS spend,
       COUNT(DISTINCT c.campaign_id) AS campaigns
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY channel
ORDER BY spend DESC, channel`,
    ['Parse in the SELECT and repeat the expression in GROUP BY.',
      'COUNT(DISTINCT campaign_id) because each campaign has many daily rows.'],
    { orderMatters: true }),

  ex('6.39', 8, 'expert',
    'Bucketing customers by recency',
    'Classify customers by their last completed order relative to 2024-12-31: `active` within 30 days, `lapsing` within 90, `lapsed` within 180, `churned` beyond. Return `recency_band` and `customers`, ordered by customers descending.',
    ['customer_ltv'], ['case-when', 'date-diff', 'segmentation', 'null-handling'],
    `SELECT CASE
         WHEN last_order_date IS NULL THEN 'never ordered'
         WHEN DATE_DIFF(DATE '2024-12-31', last_order_date, DAY) <= 30 THEN 'active'
         WHEN DATE_DIFF(DATE '2024-12-31', last_order_date, DAY) <= 90 THEN 'lapsing'
         WHEN DATE_DIFF(DATE '2024-12-31', last_order_date, DAY) <= 180 THEN 'lapsed'
         ELSE 'churned' END AS recency_band,
       COUNT(*) AS customers
FROM customer_ltv
GROUP BY recency_band
ORDER BY customers DESC, recency_band`,
    ['Handle the NULL case first. A customer who never ordered has no last order date.',
      'Each subsequent WHEN only needs an upper bound.',
      'Use the customer_ltv view rather than recomputing the last order date.'],
    { orderMatters: true,
      explanation: 'This is the R in RFM. Getting the NULL branch first matters: without it, "never ordered" customers fall through to `churned` and inflate a number that should be reported separately.' }),

  ex('6.40', 8, 'expert',
    'The cleaned, parsed, bucketed report',
    'Everything at once. Per parsed campaign `market` and `brandness`, return `spend`, `clicks`, `ctr`, `conversions` and `cpa`, only for markets with more than 5,000 spend. Order by spend descending.',
    ['google_ads_campaigns', 'google_ads_daily'],
    ['split-parse', 'group-by', 'having', 'rate-metrics', 'safe-divide'],
    `SELECT SPLIT(c.campaign_name, '_')[OFFSET(0)] AS market,
       SPLIT(c.campaign_name, '_')[OFFSET(2)] AS brandness,
       SUM(d.cost) AS spend,
       SUM(d.clicks) AS clicks,
       SAFE_DIVIDE(SUM(d.clicks), SUM(d.impressions)) AS ctr,
       SUM(d.conversions) AS conversions,
       SAFE_DIVIDE(SUM(d.cost), SUM(d.conversions)) AS cpa
FROM google_ads_daily d
JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY market, brandness
HAVING SUM(d.cost) > 5000
ORDER BY spend DESC, market, brandness`,
    ['Two parsed dimensions in the GROUP BY.',
      'Every rate is a ratio of sums.',
      'HAVING filters on the aggregate.'],
    { orderMatters: true,
      explanation: 'Brand vs non-brand CPA, split by market, is the single most useful slice of a search account, and none of those dimensions exist as columns. You created them out of a naming convention.' }),
];
