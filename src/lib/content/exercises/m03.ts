import { ex } from './helpers';

/**
 * Module 3 — Filtering: WHERE.
 *
 * 30 exercises. The spine of this module is three-valued logic: roughly a third of
 * these exist purely to make NULL behave badly in front of the learner, because that
 * is the only way the lesson survives contact with real data.
 */
export const M03 = [
  ex('3.1', 3, 'easy',
    'Only the live campaigns',
    'Return `campaign_name` and `daily_budget` for campaigns whose `status` is `ENABLED`.',
    ['google_ads_campaigns'], ['where'],
    "SELECT campaign_name, daily_budget FROM google_ads_campaigns WHERE status = 'ENABLED'",
    ['WHERE goes after FROM.', 'String comparisons need single quotes and are case-sensitive.']),

  ex('3.2', 3, 'easy',
    'Big spending days',
    'Return `date`, `campaign_id` and `cost` from `google_ads_daily` where cost is above 200.',
    ['google_ads_daily'], ['where'],
    'SELECT date, campaign_id, cost FROM google_ads_daily WHERE cost > 200',
    ['Numeric comparison needs no quotes.',
      'The operator is `>`, and it goes in the WHERE clause after FROM.']),

  ex('3.3', 3, 'easy',
    'Two conditions with AND',
    'Return `campaign_name` for SEARCH campaigns that are also non-brand (`is_brand = 0`).',
    ['google_ads_campaigns'], ['where', 'boolean-logic'],
    "SELECT campaign_name FROM google_ads_campaigns WHERE channel_type = 'SEARCH' AND is_brand = 0",
    ['AND requires both sides to be true.',
      'Each side is a full comparison: `column = value`.']),

  ex('3.4', 3, 'easy',
    'Either/or with OR',
    'Return `campaign_name` and `channel_type` for campaigns that are either PMAX or SHOPPING.',
    ['google_ads_campaigns'], ['where', 'boolean-logic'],
    "SELECT campaign_name, channel_type FROM google_ads_campaigns WHERE channel_type = 'PMAX' OR channel_type = 'SHOPPING'",
    ['OR needs only one side to be true.',
      'Each side needs its own complete comparison — `channel_type = \'PMAX\' OR \'SHOPPING\'` does not work.']),

  ex('3.5', 3, 'easy',
    'The same thing with IN',
    'Rewrite the previous filter using `IN`: return `campaign_name` and `channel_type` for PMAX or SHOPPING campaigns.',
    ['google_ads_campaigns'], ['where', 'in'],
    "SELECT campaign_name, channel_type FROM google_ads_campaigns WHERE channel_type IN ('PMAX', 'SHOPPING')",
    ['`col IN (a, b, c)` is shorthand for a chain of ORs.',
      'The values go in parentheses, comma-separated, each in single quotes.'],
    { explanation: 'IN is not faster than OR — it is the same plan. It is shorter and, crucially, harder to get the parentheses wrong on.' }),

  ex('3.6', 3, 'easy',
    'Exclude with NOT IN',
    'Return `channel` and `order_id` for the first 25 orders (by order_id) whose channel is neither Direct nor Organic Search — the paid and earned channels only.',
    ['orders'], ['where', 'in', 'boolean-logic'],
    `SELECT order_id, channel
FROM orders
WHERE channel NOT IN ('Direct', 'Organic Search')
ORDER BY order_id
LIMIT 25`,
    ['NOT IN is the negation of IN.',
      'Sort and limit after filtering.'],
    { orderMatters: true }),

  ex('3.7', 3, 'easy',
    'A date range with BETWEEN',
    'Return `date` and `cost` from `google_ads_daily` for March 2024 only, ordered by date then ad_group_id, limited to 30 rows.',
    ['google_ads_daily'], ['where', 'between'],
    `SELECT date, cost
FROM google_ads_daily
WHERE date BETWEEN '2024-03-01' AND '2024-03-31'
ORDER BY date, ad_group_id
LIMIT 30`,
    ['BETWEEN is inclusive on both ends.',
      'Dates are stored as YYYY-MM-DD strings, so string comparison works.'],
    { orderMatters: true,
      explanation: 'BETWEEN including both endpoints is the detail people forget. `BETWEEN \'2024-03-01\' AND \'2024-04-01\'` quietly includes one day of April — which is how a "March" report ends up with 32 days in it.' }),

  ex('3.8', 3, 'easy',
    'Pattern matching with LIKE',
    'Return `campaign_name` for every Google campaign targeting the UK — their names all start with `GB_`.',
    ['google_ads_campaigns'], ['where', 'like'],
    "SELECT campaign_name FROM google_ads_campaigns WHERE campaign_name LIKE 'GB\\_%' ESCAPE '\\'",
    ['`%` matches any run of characters; `_` matches exactly one.',
      'Because `_` is a wildcard, a literal underscore has to be escaped.',
      "Use `LIKE 'GB\\_%' ESCAPE '\\'` — or accept that `LIKE 'GB_%'` also matches GBx…"],
    { trap: 'An underscore in a LIKE pattern is a single-character wildcard, not a literal underscore.' }),

  ex('3.9', 3, 'easy',
    'Contains, anywhere',
    'Return `keyword_text` for every distinct keyword containing the word `shoes`, sorted alphabetically.',
    ['google_ads_keywords'], ['where', 'like', 'distinct'],
    "SELECT DISTINCT keyword_text FROM google_ads_keywords WHERE keyword_text LIKE '%shoes%' ORDER BY keyword_text",
    ['Wrap the term in % on both sides to match it anywhere in the string.',
      'Add DISTINCT so a keyword used in several ad groups appears once.'],
    { orderMatters: true }),

  ex('3.10', 3, 'medium',
    'Case-insensitive matching',
    'Return every distinct `city` from `orders` that is London in any capitalisation or with stray whitespace. Sort by city.',
    ['orders'], ['where', 'like', 'string-functions'],
    "SELECT DISTINCT city FROM orders WHERE LOWER(TRIM(city)) = 'london' ORDER BY city",
    ['The stored values are messy: leading spaces, trailing spaces, lowercase.',
      '`TRIM()` removes surrounding whitespace; `LOWER()` normalises case.',
      'Apply both to the column before comparing.'],
    { orderMatters: true,
      explanation: 'Four distinct stored values — " London", "London", "London ", "london" — are one city. Any GROUP BY city report splits them into four rows, each looking like a smaller market than it is. Normalising at query time is a patch; the real fix is upstream, but you will rarely own that.',
      trap: 'GROUP BY on a dirty text column, and trusting the row count that comes back.' }),

  ex('3.11', 3, 'medium',
    'Operator precedence',
    'Return `campaign_name`, `channel_type` and `country` for campaigns that are SEARCH **and** target either the US or the UK. Order by campaign_name.',
    ['google_ads_campaigns'], ['where', 'boolean-logic'],
    `SELECT campaign_name, channel_type, country
FROM google_ads_campaigns
WHERE channel_type = 'SEARCH' AND (country = 'US' OR country = 'GB')
ORDER BY campaign_name`,
    ['AND binds tighter than OR — so without brackets the query means something else.',
      'Bracket the OR to force it to evaluate first.'],
    { orderMatters: true,
      trap: "`WHERE a AND b OR c` means `(a AND b) OR c`, which here returns every UK campaign of any channel type.",
      explanation: 'This is the highest-frequency logic bug in marketing SQL. When AND and OR appear together, always bracket — even when you are sure, because the next person to read it is not.' }),

  ex('3.12', 3, 'medium',
    'NOT, applied correctly',
    'Return `campaign_name` and `status` for every campaign that is not paused. Order by campaign_name.',
    ['google_ads_campaigns'], ['where', 'boolean-logic'],
    "SELECT campaign_name, status FROM google_ads_campaigns WHERE NOT status = 'PAUSED' ORDER BY campaign_name",
    ['`NOT <condition>` inverts it.',
      '`status != \'PAUSED\'` is equivalent here and more common.'],
    { orderMatters: true }),

  ex('3.13', 3, 'medium',
    'Finding the NULLs',
    'Some keywords have no Quality Score because they have too little traffic. Return `keyword_text` and `match_type` for keywords where `quality_score` is missing, ordered by keyword_id.',
    ['google_ads_keywords'], ['where', 'null-handling'],
    'SELECT keyword_text, match_type FROM google_ads_keywords WHERE quality_score IS NULL ORDER BY keyword_id',
    ['NULL is not a value — it is the absence of one.',
      '`= NULL` is never true. The operator you need is `IS NULL`.'],
    { orderMatters: true,
      trap: '`WHERE quality_score = NULL` returns zero rows, silently.' }),

  ex('3.14', 3, 'medium',
    'The rows a NOT filter silently drops',
    'Count the keywords whose quality_score is not 10, using `quality_score != 10`. Return the count as `not_ten`. Then compare it to the total row count — also return `total`.',
    ['google_ads_keywords'], ['where', 'null-handling', 'count'],
    `SELECT (SELECT COUNT(*) FROM google_ads_keywords WHERE quality_score != 10) AS not_ten,
       (SELECT COUNT(*) FROM google_ads_keywords) AS total`,
    ['Use two scalar subqueries so both numbers land in one row.',
      'The gap between them is not made of tens.'],
    {
      explanation: 'The two numbers differ by more than the count of 10s. `quality_score != 10` evaluates to UNKNOWN — not TRUE — for every NULL row, and WHERE keeps only TRUE. So all 34 unscored keywords vanish from a filter that a human reads as "everything except the tens".',
      trap: 'Any `!=` or `NOT IN` filter silently excludes NULL rows. If you want them, you must say `OR col IS NULL`.',
    }),

  ex('3.15', 3, 'medium',
    'Include the NULLs deliberately',
    'Fix the previous filter. Count keywords whose quality_score is not 10 **or** is missing entirely. Return the single count as `keywords`.',
    ['google_ads_keywords'], ['where', 'null-handling', 'boolean-logic'],
    'SELECT COUNT(*) AS keywords FROM google_ads_keywords WHERE quality_score != 10 OR quality_score IS NULL',
    ['Add an explicit OR branch for the NULLs.',
      'Alternatively `COALESCE(quality_score, -1) != 10` — but the explicit form documents itself.'],
    { explanation: 'This is the fix, and its verbosity is the point: SQL makes you state what you want to happen to unknowns, because the database genuinely cannot guess.' }),

  ex('3.16', 3, 'medium',
    'Rows that have a value',
    'Return `order_id`, `coupon_code` and `gross_revenue` for the 20 lowest-numbered orders that actually used a coupon.',
    ['orders'], ['where', 'null-handling'],
    `SELECT order_id, coupon_code, gross_revenue
FROM orders
WHERE coupon_code IS NOT NULL
ORDER BY order_id
LIMIT 20`,
    ['`IS NOT NULL` keeps only rows where the column has a value.',
      'Sort by order_id and LIMIT after the filter.'],
    { orderMatters: true }),

  ex('3.17', 3, 'medium',
    'Wasted spend: cost with no conversions',
    'Find the money we burned. Return `date`, `campaign_id`, `cost` for rows in `google_ads_daily` with cost above 50 and zero conversions. Highest cost first, top 20.',
    ['google_ads_daily'], ['where', 'boolean-logic', 'order-by'],
    `SELECT date, campaign_id, cost
FROM google_ads_daily
WHERE cost > 50 AND conversions = 0
ORDER BY cost DESC, date, campaign_id
LIMIT 20`,
    ['Two conditions joined by AND.',
      'conversions is a fractional number in this table, but exact zero is still exact zero.'],
    { orderMatters: true }),

  ex('3.18', 3, 'medium',
    'Exclude the conversion lag window',
    'Repeat the wasted-spend query but exclude the last two days of the year — conversions have not finished attributing yet. Return `date`, `campaign_id`, `cost` for cost above 50, zero conversions, and date on or before 2024-12-29. Highest cost first, top 20.',
    ['google_ads_daily'], ['where', 'between', 'boolean-logic'],
    `SELECT date, campaign_id, cost
FROM google_ads_daily
WHERE cost > 50
  AND conversions = 0
  AND date <= '2024-12-29'
ORDER BY cost DESC, date, campaign_id
LIMIT 20`,
    ['Add a third AND condition on date.',
      'String comparison works because dates are ISO-formatted.'],
    { orderMatters: true,
      explanation: 'Every paid-media report needs a lag window. Conversions land days after the click, so the most recent days always look terrible. Analysts who forget this cut budget on campaigns that were fine.' }),

  ex('3.19', 3, 'medium',
    'Multi-condition segment',
    'Return `customer_id`, `country`, `segment` and `first_touch_channel` for B2B customers in the US or the UK who came from Paid Search, ordered by customer_id.',
    ['customers'], ['where', 'boolean-logic', 'in'],
    `SELECT customer_id, country, segment, first_touch_channel
FROM customers
WHERE segment = 'B2B'
  AND country IN ('US', 'GB')
  AND first_touch_channel = 'Paid Search'
ORDER BY customer_id`,
    ['Three conditions, all required, so all joined by AND.',
      'Use IN for the country list.'],
    { orderMatters: true }),

  ex('3.20', 3, 'medium',
    'Numeric range without BETWEEN',
    'Return `product_name` and `list_price` for products priced from 50 to 150 inclusive, using two comparisons rather than BETWEEN. Order by list_price.',
    ['products'], ['where', 'boolean-logic'],
    `SELECT product_name, list_price
FROM products
WHERE list_price >= 50 AND list_price <= 150
ORDER BY list_price, product_name`,
    ['Two comparisons joined by AND.',
      '>= and <= make the range inclusive, matching what BETWEEN does.'],
    { orderMatters: true }),

  ex('3.21', 3, 'medium',
    'Filter on a computed value',
    'Return `date`, `impressions`, `clicks` and `ctr` for rows in `google_ads_daily` whose CTR is above 15%. Only rows with at least 500 impressions. Top 20 by CTR.',
    ['google_ads_daily'], ['where', 'safe-divide', 'order-by'],
    `SELECT date, impressions, clicks, SAFE_DIVIDE(clicks, impressions) AS ctr
FROM google_ads_daily
WHERE impressions >= 500
  AND SAFE_DIVIDE(clicks, impressions) > 0.15
ORDER BY ctr DESC, date, ad_group_id
LIMIT 20`,
    ['You cannot use the SELECT alias `ctr` in WHERE — WHERE runs first.',
      'Repeat the expression in the WHERE clause.',
      'ORDER BY, on the other hand, *can* use the alias.'],
    { orderMatters: true,
      trap: '`WHERE ctr > 0.15` fails with "no such column: ctr", because SELECT has not run yet.' }),

  ex('3.22', 3, 'hard',
    'The 3,380 orders you just lost',
    'Count orders whose `campaign_id` is not 1001, two ways in one row: `naive` using `campaign_id != 1001`, and `correct` which also keeps orders with no campaign at all.',
    ['orders'], ['where', 'null-handling', 'count'],
    `SELECT (SELECT COUNT(*) FROM orders WHERE campaign_id != 1001) AS naive,
       (SELECT COUNT(*) FROM orders WHERE campaign_id != 1001 OR campaign_id IS NULL) AS correct`,
    ['Two scalar subqueries, one row.',
      'The difference is exactly the number of orders with a NULL campaign_id.'],
    {
      explanation: 'The gap is 3,380 orders — every organic and direct purchase, which by definition has no campaign. A filter that reads as "all campaigns except 1001" actually means "all campaigns except 1001, and also drop everything unattributed". Report the naive number to a CMO and you have understated non-paid revenue by a fifth.',
      trap: 'NULL propagates through every comparison. Only IS NULL / IS NOT NULL can see it.',
    }),

  ex('3.23', 3, 'hard',
    'Exclude internal traffic',
    'Someone forgot to filter the QA bots. Return `channel_group`, `source` and `session_key` for the 20 lowest session_keys, excluding sessions whose source is `internal-qa`.',
    ['ga4_sessions'], ['where', 'boolean-logic'],
    `SELECT session_key, channel_group, source
FROM ga4_sessions
WHERE source != 'internal-qa'
ORDER BY session_key
LIMIT 20`,
    ['A single != on source is enough, since source is never NULL in this table.',
      'Sort by session_key and take the first 20.'],
    { orderMatters: true,
      explanation: '130 sessions in this warehouse are internal QA traffic. It is a small number that lands disproportionately on high-intent pages, because that is what QA tests. Filter hygiene comes before analysis, always.' }),

  ex('3.24', 3, 'hard',
    'Weekend orders only',
    'Return `order_id`, `order_date` and `gross_revenue` for completed orders placed at the weekend, using `date_dim`. Top 15 by revenue.',
    ['orders', 'date_dim'], ['where', 'inner-join', 'boolean-logic'],
    `SELECT o.order_id, o.order_date, o.gross_revenue
FROM orders o
JOIN date_dim d ON d.date = o.order_date
WHERE o.status = 'completed'
  AND d.is_weekend = 1
ORDER BY o.gross_revenue DESC, o.order_id
LIMIT 15`,
    ['`date_dim` already knows which dates are weekends — join to it rather than computing.',
      'Join on the date columns, then filter on is_weekend.',
      'You will meet JOIN properly on day 6; here it just looks up an attribute.'],
    { orderMatters: true,
      explanation: 'A date dimension exists so that "weekend", "holiday", "fiscal quarter" become filters rather than fragile date arithmetic. It also means everyone in the company gets the same definition of a week.' }),

  ex('3.25', 3, 'hard',
    'Refunds in a window',
    'Return `order_id`, `order_date` and `gross_revenue` for refunded orders in Q4 2024 (October to December). Most negative first, top 15.',
    ['orders'], ['where', 'between', 'boolean-logic'],
    `SELECT order_id, order_date, gross_revenue
FROM orders
WHERE status = 'refunded'
  AND order_date BETWEEN '2024-10-01' AND '2024-12-31'
ORDER BY gross_revenue ASC, order_id
LIMIT 15`,
    ['Refunds are stored with a negative gross_revenue.',
      '"Most negative first" is ASC.'],
    { orderMatters: true }),

  ex('3.26', 3, 'hard',
    'High-value non-brand clicks',
    'Return `keyword_text`, `match_type` and `quality_score` for keywords with a Quality Score of 8 or better, on BROAD or PHRASE match. Order by quality_score descending then keyword_text.',
    ['google_ads_keywords'], ['where', 'in', 'boolean-logic', 'null-handling'],
    `SELECT keyword_text, match_type, quality_score
FROM google_ads_keywords
WHERE quality_score >= 8
  AND match_type IN ('BROAD', 'PHRASE')
ORDER BY quality_score DESC, keyword_text, keyword_id`,
    ['Combine a numeric comparison with an IN list.',
      'NULL quality scores fail `>= 8` and drop out — which is correct here, since an unscored keyword is not a high-scoring one.'],
    { orderMatters: true }),

  ex('3.27', 3, 'hard',
    'Failed payments worth chasing',
    'Involuntary churn is the cheapest churn to fix. Return `charge_id`, `customer_id`, `amount` and `failure_code` for failed charges over $100. Highest amount first, top 20.',
    ['stripe_charges'], ['where', 'null-handling', 'order-by'],
    `SELECT charge_id, customer_id, amount, failure_code
FROM stripe_charges
WHERE status = 'failed'
  AND amount > 100
ORDER BY amount DESC, charge_id
LIMIT 20`,
    ['Filter on status first, then on amount.',
      'failure_code is only populated on failures, so you do not need to filter it.'],
    { orderMatters: true,
      explanation: 'A card_declined on a $599 Scale plan is a customer who wanted to stay. Dunning emails recover 30–50% of these. It is the highest-ROI retention work most companies never do.' }),

  ex('3.28', 3, 'hard',
    'Unanswered support tickets',
    'Return `ticket_id`, `customer_id`, `priority` and `created_at` for tickets that were never given a first response, highest priority first. Top 20.',
    ['support_tickets'], ['where', 'null-handling', 'case-when', 'order-by'],
    `SELECT ticket_id, customer_id, priority, created_at
FROM support_tickets
WHERE first_response_at IS NULL
ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
         created_at,
         ticket_id
LIMIT 20`,
    ['Never answered means first_response_at IS NULL.',
      'Priority is text, so alphabetical sorting gives the wrong order.',
      'Use a CASE expression inside ORDER BY to impose the ranking you want.'],
    { orderMatters: true,
      explanation: 'Sorting `priority` alphabetically puts "high" above "urgent" and "low" above "normal". Whenever a text column encodes an ordering, you must supply that ordering explicitly.' }),

  ex('3.29', 3, 'hard',
    'Trial subscriptions still in trial',
    'Return `subscription_id`, `customer_id`, `started_at` and `trial_end_at` for subscriptions that have a trial end date, have not been cancelled, and are still marked trialing. Order by trial_end_at.',
    ['subscriptions'], ['where', 'null-handling', 'boolean-logic'],
    `SELECT subscription_id, customer_id, started_at, trial_end_at
FROM subscriptions
WHERE trial_end_at IS NOT NULL
  AND canceled_at IS NULL
  AND status = 'trialing'
ORDER BY trial_end_at, subscription_id`,
    ['Three conditions: one IS NOT NULL, one IS NULL, one equality.',
      'Mixing NULL checks with value checks in the same WHERE is completely normal.'],
    { orderMatters: true }),

  ex('3.30', 3, 'expert',
    'The wasted-spend report, properly filtered',
    'Build the report you would actually send. From `google_ads_daily`, return `date`, `campaign_id`, `cost`, `impressions` and `clicks` for rows where: cost is over 30, there are zero conversions, the date is on or before 2024-12-29, and the row actually served impressions. Sort by cost descending, top 25.',
    ['google_ads_daily'], ['where', 'boolean-logic', 'null-handling', 'order-by'],
    `SELECT date, campaign_id, cost, impressions, clicks
FROM google_ads_daily
WHERE cost > 30
  AND conversions = 0
  AND date <= '2024-12-29'
  AND impressions > 0
ORDER BY cost DESC, date, campaign_id
LIMIT 25`,
    ['Four AND conditions.',
      'The impressions filter removes rows where delivery failed rather than the ad underperforming.',
      'Each filter should be defensible out loud — that is the standard for a report you send.'],
    { orderMatters: true,
      explanation: 'Every clause here answers an objection before it is raised: the lag window stops someone saying "those conversions have not landed yet", and the impressions filter stops someone saying "that campaign was not even serving". Anticipating those two questions is most of what separates a junior report from a senior one.' }),
];
