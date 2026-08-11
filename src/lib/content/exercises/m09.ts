import { ex } from './helpers';

/**
 * Module 9, BigQuery in anger (day 11).
 *
 * 14 exercises. The distinguishing skill of a BigQuery analyst is not syntax, it is
 * knowing what a query costs and why. Everything here is about bytes scanned, nested
 * data, and the two structural decisions, partitioning and clustering, that decide
 * whether a table is cheap or ruinous to query.
 */
export const M09 = [
  ex('9.1', 11, 'easy',
    'Select only what you need',
    'The habit that saves the most money: return `date`, `campaign_id` and `cost` from `google_ads_daily` for June 2024, ordered by date then campaign_id, limit 20, never `SELECT *`.',
    ['google_ads_daily'], ['cost-optimisation'],
    `SELECT date, campaign_id, cost
FROM google_ads_daily
WHERE date BETWEEN '2024-06-01' AND '2024-06-30'
ORDER BY date, campaign_id, ad_group_id
LIMIT 20`,
    ['BigQuery is columnar: it reads only the columns you name.',
      'Three columns out of nine costs a third of the bytes.',
      'LIMIT does not reduce cost, the scan happens before the limit.'],
    { orderMatters: true,
      explanation: 'On-demand BigQuery bills for bytes *scanned*, not rows returned. `SELECT *` with a `LIMIT 10` scans the entire table and charges you for all of it. This is the single most expensive habit a new BigQuery user brings with them.' }),

  ex('9.2', 11, 'easy',
    'Partition pruning',
    'Return `days` and `total_cost` from `google_ads_daily` for a single partition, 2024-06-14, by filtering on the partitioning column.',
    ['google_ads_daily'], ['partitioning', 'cost-optimisation'],
    `SELECT COUNT(DISTINCT date) AS days, SUM(cost) AS total_cost
FROM google_ads_daily
WHERE date = '2024-06-14'`,
    ['The table is partitioned by `date`.',
      'A filter directly on the partitioning column lets BigQuery skip every other partition.',
      'Wrapping the column in a function would defeat pruning entirely.'],
    { explanation: 'One day out of 366 means roughly 0.3% of the bytes. The same query filtered with `WHERE CAST(date AS STRING) = \'2024-06-14\'` scans the whole table, because a function on the partitioning column blocks pruning.' }),

  ex('9.3', 11, 'medium',
    'The filter that breaks pruning',
    'Return `pruned_rows` and `unpruned_rows`: both counting June 2024 rows in google_ads_daily, one filtering on the raw date column and one wrapping it in FORMAT_DATE. The answers match; the cost does not.',
    ['google_ads_daily'], ['partitioning', 'cost-optimisation'],
    `SELECT
  (SELECT COUNT(*) FROM google_ads_daily
   WHERE date BETWEEN '2024-06-01' AND '2024-06-30') AS pruned_rows,
  (SELECT COUNT(*) FROM google_ads_daily
   WHERE FORMAT_DATE('%Y-%m', date) = '2024-06') AS unpruned_rows`,
    ['Both filters select the same rows.',
      'Only the first one can use the partition index.',
      'Any function applied to a partitioning column forces a full scan.'],
    {
      explanation:
        'Identical results, wildly different bills. The rule: keep the partitioning column bare on the left-hand side of the comparison, and transform the constant instead. `WHERE date >= \'2024-06-01\'` prunes; `WHERE EXTRACT(MONTH FROM date) = 6` does not.',
      trap: 'A function around the partitioning column silently disables partition pruning.',
    }),

  ex('9.4', 11, 'medium',
    'Clustering columns',
    '`google_ads_daily` is clustered by `campaign_id`. Return `campaign_id`, `spend` and `days` for one campaign, filtering on both the partition and the cluster key.',
    ['google_ads_daily'], ['clustering', 'partitioning'],
    `SELECT campaign_id, SUM(cost) AS spend, COUNT(DISTINCT date) AS days
FROM google_ads_daily
WHERE date BETWEEN '2024-06-01' AND '2024-06-30'
  AND campaign_id = 1001
GROUP BY campaign_id`,
    ['Filter the partition first, then the cluster key.',
      'Clustering sorts data within each partition, so a filter on the cluster key skips blocks.'],
    { explanation: 'Partitioning eliminates whole partitions; clustering eliminates blocks within the partitions that survive. Clustering only helps if you filter or aggregate on the cluster key. Otherwise it is free but useless.' }),

  ex('9.5', 11, 'medium',
    'Aggregate rather than export',
    'Return `campaign_id` and `spend` per campaign for 2024, 24 rows instead of 19,000. Order by spend descending.',
    ['google_ads_daily'], ['cost-optimisation', 'group-by'],
    `SELECT campaign_id, SUM(cost) AS spend
FROM google_ads_daily
GROUP BY campaign_id
ORDER BY spend DESC, campaign_id`,
    ['Aggregating in the warehouse beats exporting raw rows and aggregating in a spreadsheet.',
      'The scan cost is the same, but everything downstream gets cheaper.'],
    { orderMatters: true }),

  ex('9.6', 11, 'medium',
    'UNNEST a repeated field',
    '`ga4_events.event_params` is a repeated STRUCT. Return `param_key` and `occurrences` for the 10 most common parameter keys on page_view events.',
    ['ga4_events'], ['unnest', 'array', 'ga4-params'],
    `SELECT ep.key AS param_key, COUNT(*) AS occurrences
FROM ga4_events e, UNNEST(e.event_params) AS ep
WHERE e.event_name = 'page_view'
GROUP BY param_key
ORDER BY occurrences DESC, param_key
LIMIT 10`,
    ['`FROM table, UNNEST(array) AS alias` flattens the array into rows.',
      'The comma is an implicit CROSS JOIN. Each event becomes one row per parameter.',
      'Alias the unnested value so you can reach its fields.'],
    { orderMatters: true,
      explanation: 'UNNEST multiplies your row count by the array length. 56,000 events with ~7 params each become ~390,000 rows. That is fine when you filter first and fatal when you do not.' }),

  ex('9.7', 11, 'hard',
    'Pull one parameter out',
    'Return `page` and `views`, the 10 most-viewed `page_location` values from page_view events.',
    ['ga4_events'], ['unnest', 'ga4-params'],
    `SELECT
  (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'page_location') AS page,
  COUNT(*) AS views
FROM ga4_events e
WHERE e.event_name = 'page_view'
GROUP BY page
ORDER BY views DESC, page
LIMIT 10`,
    ['A scalar subquery over UNNEST pulls out exactly one parameter without fanning out the outer query.',
      'Read the sub-field that matches the parameter\'s type: string_value, int_value or double_value.',
      'This is the standard GA4 idiom. Learn it by heart.'],
    { orderMatters: true,
      explanation: 'The scalar-subquery form keeps the outer query at one row per event. The alternative, UNNEST in the FROM and filter on key, also works but changes the grain, which matters the moment you need two parameters at once.' }),

  ex('9.8', 11, 'hard',
    'Two parameters at once',
    'Return `page`, `engagement_ms` and `event_date` for 15 page_view events, pulling two parameters with two scalar subqueries. Order by event_date then event_timestamp.',
    ['ga4_events'], ['unnest', 'ga4-params'],
    `SELECT e.event_date,
       (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'page_location') AS page,
       (SELECT ep.value.int_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'engagement_time_msec') AS engagement_ms
FROM ga4_events e
WHERE e.event_name = 'page_view'
ORDER BY e.event_date, e.event_timestamp
LIMIT 15`,
    ['One scalar subquery per parameter.',
      'Each reads a different sub-field because the parameters have different types.'],
    { orderMatters: true,
      trap: 'Reading `value.string_value` for a numeric parameter returns NULL, not an error.' }),

  ex('9.9', 11, 'medium',
    'STRUCT field access',
    'Return `device_category`, `country` and `events` from `ga4_events`, reading the nested STRUCT columns directly. Top 10 by events.',
    ['ga4_events'], ['struct', 'ga4-schema'],
    `SELECT device.category AS device_category,
       geo.country AS country,
       COUNT(*) AS events
FROM ga4_events
GROUP BY device_category, country
ORDER BY events DESC, device_category, country
LIMIT 10`,
    ['A STRUCT is a nested record, reach into it with a dot.',
      'No UNNEST needed: a STRUCT is one value, not a repeated one.'],
    { orderMatters: true,
      explanation: 'STRUCT (nested, one value) and ARRAY (repeated, many values) are different things and need different treatment. `device` is a STRUCT so `device.category` just works; `event_params` is an ARRAY so it needs UNNEST.' }),

  ex('9.10', 11, 'hard',
    'UNNEST the items array',
    'Return `item_category`, `units` and `revenue` from purchase events\' `items` array. Order by revenue descending.',
    ['ga4_events'], ['unnest', 'array', 'ga4-schema'],
    `SELECT i.item_category AS item_category,
       SUM(i.quantity) AS units,
       SUM(i.price * i.quantity) AS revenue
FROM ga4_events e, UNNEST(e.items) AS i
WHERE e.event_name = 'purchase'
GROUP BY item_category
ORDER BY revenue DESC, item_category`,
    ['`items` is a repeated STRUCT, so UNNEST it and read its fields.',
      'Filter to purchase events first. Every other event has an empty items array.'],
    { orderMatters: true }),

  ex('9.11', 11, 'hard',
    'GENERATE_DATE_ARRAY as a spine',
    'Build a date spine with `UNNEST(GENERATE_DATE_ARRAY(...))` for January 2024 and LEFT JOIN daily spend onto it. Return `day` and `spend`, chronological.',
    ['ad_spend_daily'], ['unnest', 'date-spine', 'array'],
    `SELECT d AS day, COALESCE(SUM(a.spend), 0) AS spend
FROM UNNEST(GENERATE_DATE_ARRAY('2024-01-01', '2024-01-31')) AS d
LEFT JOIN ad_spend_daily a ON a.date = d
GROUP BY day
ORDER BY day`,
    ['`GENERATE_DATE_ARRAY(start, end)` builds an array of dates; UNNEST turns it into rows.',
      'This is the BigQuery-native alternative to keeping a date dimension table.',
      'LEFT JOIN the facts onto the generated spine.'],
    { orderMatters: true,
      explanation: 'GENERATE_DATE_ARRAY needs no table and costs no bytes, which makes it the cheaper spine in BigQuery. A physical date dimension still wins when you need business attributes like fiscal quarters or holidays.' }),

  ex('9.12', 11, 'hard',
    'Rebuild a session from raw events',
    'Return `sessions`. The count of distinct sessions in `ga4_events`, identified by user_pseudo_id plus ga_session_id, and `events`.',
    ['ga4_events'], ['ga4-schema', 'distinct', 'string-functions'],
    `SELECT COUNT(DISTINCT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING))) AS sessions,
       COUNT(*) AS events
FROM ga4_events`,
    ['A session id is only unique within a user, so the session key is the pair.',
      'CONCAT them with a separator and count distinct.'],
    { trap: 'COUNT(DISTINCT ga_session_id) undercounts, because two different users can share a session id.' }),

  ex('9.13', 11, 'expert',
    'Cheap query, same answer',
    'Rewrite an expensive question cheaply. Return `event_date` and `purchases` for the first 10 days of June 2024, filtering on the partitioning column as a string rather than parsing it.',
    ['ga4_events'], ['cost-optimisation', 'partitioning', 'ga4-schema'],
    `SELECT event_date, COUNT(*) AS purchases
FROM ga4_events
WHERE event_name = 'purchase'
  AND event_date BETWEEN '20240601' AND '20240610'
GROUP BY event_date
ORDER BY event_date`,
    ['`event_date` is a STRING in YYYYMMDD form, and it is the partitioning column.',
      'Compare it to string literals in the same format, no PARSE_DATE needed.',
      'YYYYMMDD sorts correctly as text, so BETWEEN works.'],
    { orderMatters: true,
      explanation: 'This is why the GA4 export stores dates as YYYYMMDD strings: the format sorts and ranges correctly as text, so you get partition pruning without a single conversion. `WHERE PARSE_DATE(\'%Y%m%d\', event_date) BETWEEN …` returns the same rows and scans the whole table.' }),

  ex('9.14', 11, 'expert',
    'Filter before you UNNEST',
    'Return `param_key` and `occurrences` for parameters on purchase events in December 2024 only, filtering on the partition column *and* the event name before the UNNEST does its damage. Top 10.',
    ['ga4_events'], ['unnest', 'cost-optimisation', 'partitioning'],
    `SELECT ep.key AS param_key, COUNT(*) AS occurrences
FROM ga4_events e, UNNEST(e.event_params) AS ep
WHERE e.event_date BETWEEN '20241201' AND '20241231'
  AND e.event_name = 'purchase'
GROUP BY param_key
ORDER BY occurrences DESC, param_key
LIMIT 10`,
    ['Both filters are on the outer table, so they apply before the fan-out.',
      'Partition filter first, then the event name.',
      'Filtering after the UNNEST would materialise every parameter of every event first.'],
    { orderMatters: true,
      explanation: 'Order of operations is the whole optimisation. Filter the partition, filter the rows, *then* explode the arrays. Do it the other way round and you pay to flatten 390,000 parameter rows to keep a few hundred.' }),
];
