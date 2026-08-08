import type { Lab } from './types';

/**
 * Nine hands-on BigQuery labs.
 *
 * Labs differ from exercises in that they teach *cost and shape* rather than answers.
 * Steps marked `measure` render the dry-run estimator so the learner sees bytes
 * scanned change as they edit — which is the only way the partitioning lesson lands.
 */
export const LABS: Lab[] = [
  {
    slug: 'ga4-export-shape',
    index: 1,
    title: 'The GA4 export, opened up',
    subtitle: 'One row per event, and everything else buried inside it',
    objective: 'Read the GA4 export schema confidently and know which columns need UNNEST.',
    concepts: ['ga4-schema', 'struct', 'array'],
    steps: [
      {
        title: 'One row per event',
        body:
          'The export has no sessions table and no users table. It has events, and everything ' +
          'else is derived. Start by seeing what is in there.',
        sql: `SELECT event_name, COUNT(*) AS events
FROM ga4_events
GROUP BY event_name
ORDER BY events DESC`,
      },
      {
        title: 'Two traps in the column types',
        body:
          '`event_date` is a STRING formatted YYYYMMDD — not a DATE. `event_timestamp` is in ' +
          'MICROseconds — not seconds or milliseconds. Both are deliberate: the string date is ' +
          'the partitioning column and compares cheaply, and microseconds preserve event ordering ' +
          'within a single millisecond.',
        sql: `SELECT event_date,
       event_timestamp,
       PARSE_DATE('%Y%m%d', event_date) AS parsed_date,
       TIMESTAMP_MICROS(event_timestamp) AS parsed_time
FROM ga4_events
LIMIT 5`,
      },
      {
        title: 'STRUCT columns need a dot',
        body:
          '`device`, `geo`, `traffic_source` and `ecommerce` are STRUCTs — a single nested ' +
          'record each. Reach into them with a dot. No UNNEST, because there is only one value.',
        sql: `SELECT device.category, device.operating_system, geo.country, geo.city
FROM ga4_events
LIMIT 10`,
      },
      {
        title: 'ARRAY columns need UNNEST',
        body:
          '`event_params` and `items` are repeated — an array per row. Flattening them multiplies ' +
          'your row count by the array length, which is why you filter before you UNNEST.',
        sql: `SELECT ep.key AS param_key, COUNT(*) AS occurrences
FROM ga4_events e, UNNEST(e.event_params) AS ep
WHERE e.event_name = 'purchase'
GROUP BY param_key
ORDER BY occurrences DESC`,
        task: {
          prompt: 'Return `param_key` and `occurrences` for parameters on `add_to_cart` events, top 8.',
          solution: `SELECT ep.key AS param_key, COUNT(*) AS occurrences
FROM ga4_events e, UNNEST(e.event_params) AS ep
WHERE e.event_name = 'add_to_cart'
GROUP BY param_key
ORDER BY occurrences DESC, param_key
LIMIT 8`,
          hints: ['Same shape as the demo, different event name.',
            'Filter on the outer table before the UNNEST.'],
          orderMatters: true,
        },
      },
      {
        title: 'user_id is mostly NULL',
        body:
          '`user_pseudo_id` is the device. `user_id` is your account id, and it is NULL until the ' +
          'person logs in. Any "users" metric has to say which one it means.',
        sql: `SELECT COUNT(*) AS events,
       COUNT(DISTINCT user_pseudo_id) AS devices,
       COUNT(DISTINCT user_id) AS logged_in_users
FROM ga4_events`,
      },
    ],
  },

  {
    slug: 'unnest-deep-dive',
    index: 2,
    title: 'UNNEST, properly',
    subtitle: 'The implicit cross join, and the two idioms worth memorising',
    objective: 'Use both UNNEST idioms and know which one preserves your grain.',
    concepts: ['unnest', 'array', 'ga4-params'],
    steps: [
      {
        title: 'UNNEST is a cross join',
        body:
          '`FROM t, UNNEST(t.arr) AS a` is a CROSS JOIN between each row and its own array. ' +
          'One event with seven parameters becomes seven rows. That is fine when you want ' +
          'parameter-grain output, and wrong when you do not.',
        sql: `SELECT
  (SELECT COUNT(*) FROM ga4_events WHERE event_name = 'purchase') AS purchase_events,
  (SELECT COUNT(*) FROM ga4_events e, UNNEST(e.event_params) AS ep
   WHERE e.event_name = 'purchase') AS rows_after_unnest`,
        measure: true,
      },
      {
        title: 'Idiom 1: UNNEST in FROM, filter on key',
        body:
          'Use this when you want one row per parameter, or when you only need a single ' +
          'parameter and do not mind the grain change.',
        sql: `SELECT ep.value.string_value AS page, COUNT(*) AS views
FROM ga4_events e, UNNEST(e.event_params) AS ep
WHERE e.event_name = 'page_view' AND ep.key = 'page_location'
GROUP BY page
ORDER BY views DESC
LIMIT 10`,
      },
      {
        title: 'Idiom 2: scalar subquery over UNNEST',
        body:
          'Use this when you need two or more parameters on the same row. The outer query keeps ' +
          'its grain, and each subquery pulls one value. This is the idiom to memorise.',
        sql: `SELECT
  (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'source') AS source,
  (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'medium') AS medium,
  COUNT(*) AS events
FROM ga4_events e
GROUP BY source, medium
ORDER BY events DESC
LIMIT 10`,
        task: {
          prompt:
            'Using the scalar-subquery idiom, return `page`, `engagement_ms` and `event_date` for ' +
            '10 page_view events, ordered by event_date then event_timestamp.',
          solution: `SELECT
  (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'page_location') AS page,
  (SELECT ep.value.int_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'engagement_time_msec') AS engagement_ms,
  e.event_date
FROM ga4_events e
WHERE e.event_name = 'page_view'
ORDER BY e.event_date, e.event_timestamp
LIMIT 10`,
          hints: ['One subquery per parameter.',
            'engagement_time_msec is an integer parameter — read int_value, not string_value.'],
          orderMatters: true,
        },
      },
      {
        title: 'The value sub-struct',
        body:
          'Each parameter\'s value is itself a STRUCT with `string_value`, `int_value` and ' +
          '`double_value`. Only one is populated, and reading the wrong one returns NULL silently.',
        sql: `SELECT ep.key,
       COUNTIF(ep.value.string_value IS NOT NULL) AS as_string,
       COUNTIF(ep.value.int_value IS NOT NULL) AS as_int,
       COUNTIF(ep.value.double_value IS NOT NULL) AS as_double
FROM ga4_events e, UNNEST(e.event_params) AS ep
GROUP BY ep.key
ORDER BY ep.key`,
      },
      {
        title: 'UNNEST an array literal',
        body:
          'UNNEST works on any array, not just table columns. `GENERATE_ARRAY` and ' +
          '`GENERATE_DATE_ARRAY` are the cheapest date spine in BigQuery — no table, no bytes.',
        sql: `SELECT d AS day FROM UNNEST(GENERATE_DATE_ARRAY('2024-03-01', '2024-03-10')) AS d ORDER BY day`,
      },
    ],
  },

  {
    slug: 'struct-and-array',
    index: 3,
    title: 'STRUCT and ARRAY',
    subtitle: 'Nested vs repeated, and why BigQuery has both',
    objective: 'Tell a STRUCT from an ARRAY on sight and handle each correctly.',
    concepts: ['struct', 'array', 'unnest'],
    steps: [
      {
        title: 'Nested is not repeated',
        body:
          'A STRUCT is one record with named fields — nested. An ARRAY is many values — repeated. ' +
          'An ARRAY<STRUCT<...>> is many records, which is what `event_params` and `items` are. ' +
          'The schema panel shows the full type; read it before you write.',
        sql: `SELECT device.category AS device_category, COUNT(*) AS events
FROM ga4_events GROUP BY device_category ORDER BY events DESC`,
      },
      {
        title: 'Why denormalise at all',
        body:
          'BigQuery has no indexes and joins are expensive at scale. Nesting the related data ' +
          'inside the row means the join has already happened at write time. It is the same ' +
          'trade you make when you denormalise a warehouse table — paid once, saved forever.',
        sql: `SELECT i.item_category, SUM(i.quantity) AS units, SUM(i.price * i.quantity) AS revenue
FROM ga4_events e, UNNEST(e.items) AS i
WHERE e.event_name = 'purchase'
GROUP BY i.item_category
ORDER BY revenue DESC`,
        task: {
          prompt: 'Return `item_name` and `units` for the 10 best-selling items in purchase events.',
          solution: `SELECT i.item_name, SUM(i.quantity) AS units
FROM ga4_events e, UNNEST(e.items) AS i
WHERE e.event_name = 'purchase'
GROUP BY i.item_name
ORDER BY units DESC, i.item_name
LIMIT 10`,
          hints: ['UNNEST the items array, then group by the item name.',
            'Filter to purchase events first.'],
          orderMatters: true,
        },
      },
      {
        title: 'Building a STRUCT',
        body:
          'You can construct nested output too. `STRUCT(a AS x, b AS y)` builds a record, and ' +
          '`ARRAY_AGG` collects rows into an array — useful when you are writing a table that ' +
          'something else will read.',
        sql: `SELECT customer_id, ARRAY_LENGTH(ARRAY_AGG(channel)) AS touches
FROM attribution_touchpoints
WHERE customer_id IS NOT NULL
GROUP BY customer_id
LIMIT 10`,
      },
      {
        title: 'Engine note',
        body:
          'Locally, ARRAY and STRUCT columns are stored as JSON text and UNNEST compiles to ' +
          'SQLite\'s `json_each`. The SQL you write is valid BigQuery and the semantics match ' +
          'for everything this course teaches — see docs/ARCHITECTURE.md §5 for the exact ' +
          'boundary of the emulation.',
      },
    ],
  },

  {
    slug: 'partitioning',
    index: 4,
    title: 'Partitioning and pruning',
    subtitle: 'The one table property that decides your bill',
    objective: 'Write filters that prune partitions, and recognise the ones that do not.',
    concepts: ['partitioning', 'cost-optimisation'],
    steps: [
      {
        title: 'What a partition is',
        body:
          'A partitioned table is physically split by the partitioning column — usually a date. ' +
          'A filter on that column lets BigQuery skip whole partitions without reading them. ' +
          '`google_ads_daily` is partitioned by `date`; `ga4_events` by `event_date`.',
        sql: `SELECT COUNT(*) AS rows_in_one_day FROM google_ads_daily WHERE date = '2024-06-14'`,
        measure: true,
      },
      {
        title: 'Pruning in action',
        body: 'One day out of 366 should cost roughly 1/366th of the bytes. Compare the estimates.',
        sql: `SELECT COUNT(*) AS all_rows FROM google_ads_daily`,
        measure: true,
      },
      {
        title: 'The filter that breaks pruning',
        body:
          'Any function applied to the partitioning column defeats pruning — BigQuery cannot ' +
          'know which partitions satisfy `FORMAT_DATE(...) = ...` without reading them all. ' +
          'Transform the constant, never the column.',
        sql: `SELECT
  (SELECT COUNT(*) FROM google_ads_daily WHERE date BETWEEN '2024-06-01' AND '2024-06-30') AS pruned,
  (SELECT COUNT(*) FROM google_ads_daily WHERE FORMAT_DATE('%Y-%m', date) = '2024-06') AS not_pruned`,
        measure: true,
        task: {
          prompt:
            'Rewrite this to prune: return `event_date` and `events` for purchase events in ' +
            'the first week of July 2024, filtering the STRING partition column directly. Chronological.',
          solution: `SELECT event_date, COUNT(*) AS events
FROM ga4_events
WHERE event_name = 'purchase'
  AND event_date BETWEEN '20240701' AND '20240707'
GROUP BY event_date
ORDER BY event_date`,
          hints: ['`event_date` is a STRING in YYYYMMDD form.',
            'Compare it to string literals in the same format — no PARSE_DATE needed.',
            'YYYYMMDD sorts correctly as text, so BETWEEN works.'],
          orderMatters: true,
        },
      },
      {
        title: 'Require a partition filter',
        body:
          'In production, set `require_partition_filter = true` on the table. Any query without ' +
          'a partition filter then fails outright instead of quietly scanning a terabyte. It is ' +
          'the single highest-value setting on a large BigQuery table.',
      },
    ],
  },

  {
    slug: 'clustering',
    index: 5,
    title: 'Clustering',
    subtitle: 'Sorting inside the partition',
    objective: 'Know when clustering helps and when it does nothing at all.',
    concepts: ['clustering', 'partitioning', 'cost-optimisation'],
    steps: [
      {
        title: 'Clustering sorts blocks',
        body:
          'Partitioning eliminates whole partitions. Clustering physically sorts rows *within* ' +
          'each partition by the cluster columns, so a filter on them skips blocks. ' +
          '`google_ads_daily` is clustered by `campaign_id`; `ga4_events` by `event_name` and ' +
          '`user_pseudo_id`.',
        sql: `SELECT campaign_id, SUM(cost) AS spend, COUNT(*) AS rows_read
FROM google_ads_daily
WHERE date BETWEEN '2024-06-01' AND '2024-06-30' AND campaign_id = 1001
GROUP BY campaign_id`,
        measure: true,
      },
      {
        title: 'Order matters',
        body:
          'Cluster columns are used left to right, like a composite index. Clustering by ' +
          '(event_name, user_pseudo_id) helps a filter on event_name alone, or on both — but not ' +
          'on user_pseudo_id alone.',
        sql: `SELECT event_name, COUNT(*) AS events
FROM ga4_events
WHERE event_name = 'purchase'
GROUP BY event_name`,
        measure: true,
      },
      {
        title: 'When clustering does nothing',
        body:
          'Clustering is free to add and useless if you never filter or aggregate on the cluster ' +
          'key. It also cannot help a query that has to read every row anyway. Choose cluster ' +
          'columns from your actual WHERE clauses, not from what feels important.',
        task: {
          prompt:
            'Write a query that uses both the partition and the cluster key: return `campaign_id`, ' +
            '`spend` and `clicks` for campaign 1002 in Q3 2024.',
          solution: `SELECT campaign_id, SUM(cost) AS spend, SUM(clicks) AS clicks
FROM google_ads_daily
WHERE date BETWEEN '2024-07-01' AND '2024-09-30'
  AND campaign_id = 1002
GROUP BY campaign_id`,
          hints: ['Partition filter on date, cluster filter on campaign_id.',
            'Both go in the same WHERE clause.'],
        },
      },
    ],
  },

  {
    slug: 'dry-runs',
    index: 6,
    title: 'Dry runs and cost control',
    subtitle: 'Know the bill before you send the query',
    objective: 'Estimate a query\'s cost before running it, and cap what it can spend.',
    concepts: ['cost-optimisation'],
    steps: [
      {
        title: 'Bytes scanned is the whole bill',
        body:
          'On-demand BigQuery charges per byte *scanned*, not per row returned. `LIMIT 10` does ' +
          'not reduce the scan. Neither does `WHERE` on an unpartitioned, unclustered column — ' +
          'the filter is applied after the read.',
        sql: `SELECT * FROM ga4_events LIMIT 10`,
        measure: true,
      },
      {
        title: 'Columns are the first lever',
        body:
          'BigQuery is columnar: naming three columns instead of thirteen costs roughly a quarter ' +
          'as much. This is why `SELECT *` is the most expensive habit a new user brings.',
        sql: `SELECT event_date, event_name, user_pseudo_id FROM ga4_events LIMIT 10`,
        measure: true,
      },
      {
        title: 'Dry run before you run',
        body:
          'In the console, the validator shows the estimate before you click Run. From the CLI it ' +
          'is `bq query --dry_run`, and from the API it is `dryRun: true` on the job config. Get ' +
          'in the habit: read the number, then decide.',
        task: {
          prompt:
            'Write the cheapest query that answers "how many purchase events happened in December 2024?" ' +
            'Return one column, `purchases`.',
          solution: `SELECT COUNT(*) AS purchases
FROM ga4_events
WHERE event_date BETWEEN '20241201' AND '20241231'
  AND event_name = 'purchase'`,
          hints: ['Filter the partition column first, then the clustered event_name.',
            'COUNT(*) needs no other columns, so the scan stays narrow.'],
        },
      },
      {
        title: 'Cap the damage',
        body:
          'Set `maximum_bytes_billed` on every scheduled query and every BI tool connection. A ' +
          'query that would exceed it fails instead of billing you. Combined with ' +
          '`require_partition_filter`, that is most of BigQuery cost governance in two settings.',
      },
    ],
  },

  {
    slug: 'query-optimisation',
    index: 7,
    title: 'Query optimisation',
    subtitle: 'Filter early, aggregate early, join last',
    objective: 'Restructure a slow query into a fast one without changing its output.',
    concepts: ['cost-optimisation', 'join-fanout'],
    steps: [
      {
        title: 'Filter before you explode',
        body:
          'Every UNNEST multiplies rows. Filtering the outer table first means you flatten far ' +
          'fewer arrays. Same answer, a fraction of the work.',
        sql: `SELECT ep.key, COUNT(*) AS n
FROM ga4_events e, UNNEST(e.event_params) AS ep
WHERE e.event_date BETWEEN '20241201' AND '20241231'
  AND e.event_name = 'purchase'
GROUP BY ep.key
ORDER BY n DESC
LIMIT 10`,
        measure: true,
      },
      {
        title: 'Aggregate before you join',
        body:
          'Joining two large fact tables and then aggregating makes the engine materialise the ' +
          'fanned-out product. Aggregating each side to a common grain first keeps both inputs ' +
          'small — and removes the fan-out bug at the same time.',
        sql: `WITH s AS (SELECT campaign_id, SUM(cost) AS spend FROM google_ads_daily GROUP BY campaign_id),
r AS (SELECT campaign_id, SUM(gross_revenue) AS revenue FROM orders
      WHERE status = 'completed' AND campaign_id IS NOT NULL GROUP BY campaign_id)
SELECT c.campaign_name, s.spend, COALESCE(r.revenue, 0) AS revenue
FROM s JOIN google_ads_campaigns c USING (campaign_id)
LEFT JOIN r USING (campaign_id)
ORDER BY s.spend DESC
LIMIT 10`,
      },
      {
        title: 'Approximate when exact does not matter',
        body:
          '`APPROX_COUNT_DISTINCT` uses HyperLogLog and is dramatically cheaper than ' +
          '`COUNT(DISTINCT)` at scale, with an error of about 1%. For a dashboard tile showing ' +
          'monthly active users, 1% error is free. For a billing figure, it is not.',
        sql: `SELECT COUNT(DISTINCT user_pseudo_id) AS exact_users,
       APPROX_COUNT_DISTINCT(user_pseudo_id) AS approx_users
FROM ga4_events`,
        task: {
          prompt:
            'Optimise this: return `event_name` and `users` for the top 5 events by distinct users ' +
            'in November 2024, filtering the partition column.',
          solution: `SELECT event_name, COUNT(DISTINCT user_pseudo_id) AS users
FROM ga4_events
WHERE event_date BETWEEN '20241101' AND '20241130'
GROUP BY event_name
ORDER BY users DESC, event_name
LIMIT 5`,
          hints: ['Filter the partition column before anything else.',
            'Only two columns are needed, so the scan stays narrow.'],
          orderMatters: true,
        },
      },
      {
        title: 'What not to bother with',
        body:
          'Reordering your JOINs by hand, adding hints, or rewriting a subquery as a CTE will not ' +
          'change your bill — BigQuery plans that for you and CTEs are not materialised. The ' +
          'levers that matter are columns read, partitions pruned, and rows produced before a join.',
      },
    ],
  },

  {
    slug: 'cost-reduction',
    index: 8,
    title: 'Cut a query by 100×',
    subtitle: 'One expensive query, five edits, the same answer',
    objective: 'Apply every cost lever to a single realistic query and measure each step.',
    concepts: ['cost-optimisation', 'partitioning', 'clustering', 'unnest'],
    steps: [
      {
        title: 'The starting point',
        body:
          'A colleague sends you this. It answers "which pages did purchasers view in December?" ' +
          'and it reads the entire events table twice over.',
        sql: `SELECT ep.value.string_value AS page, COUNT(*) AS views
FROM ga4_events e, UNNEST(e.event_params) AS ep
WHERE ep.key = 'page_location'
GROUP BY page
ORDER BY views DESC
LIMIT 10`,
        measure: true,
      },
      {
        title: 'Edit 1 — prune the partition',
        body: 'December only. This is the single biggest saving available.',
        sql: `SELECT ep.value.string_value AS page, COUNT(*) AS views
FROM ga4_events e, UNNEST(e.event_params) AS ep
WHERE e.event_date BETWEEN '20241201' AND '20241231'
  AND ep.key = 'page_location'
GROUP BY page
ORDER BY views DESC
LIMIT 10`,
        measure: true,
      },
      {
        title: 'Edit 2 — filter on the cluster key too',
        body:
          'The question was about page views specifically. Adding the event_name filter uses the ' +
          'clustering and cuts the rows entering the UNNEST by about two thirds.',
        sql: `SELECT ep.value.string_value AS page, COUNT(*) AS views
FROM ga4_events e, UNNEST(e.event_params) AS ep
WHERE e.event_date BETWEEN '20241201' AND '20241231'
  AND e.event_name = 'page_view'
  AND ep.key = 'page_location'
GROUP BY page
ORDER BY views DESC
LIMIT 10`,
        measure: true,
        task: {
          prompt:
            'Apply the same three levers to a different question: return `page` and `views` for ' +
            '`view_item` events in the first half of December 2024, top 10.',
          solution: `SELECT ep.value.string_value AS page, COUNT(*) AS views
FROM ga4_events e, UNNEST(e.event_params) AS ep
WHERE e.event_date BETWEEN '20241201' AND '20241215'
  AND e.event_name = 'view_item'
  AND ep.key = 'page_location'
GROUP BY page
ORDER BY views DESC, page
LIMIT 10`,
          hints: ['Partition filter, then event_name, then the parameter key.',
            'All three conditions belong in the same WHERE.'],
          orderMatters: true,
        },
      },
      {
        title: 'Edit 3 — stop selecting what you do not need',
        body:
          'The original had no `SELECT *`, but plenty of real queries do. Naming columns is free ' +
          'and often halves the bill on a wide table like this one.',
      },
      {
        title: 'What you would do next in production',
        body:
          'If this query runs daily, materialise it: a scheduled query writing a small ' +
          '`daily_page_views` table turns a repeated full scan into one incremental write. ' +
          'The cheapest query is the one you do not run.',
      },
    ],
  },

  {
    slug: 'ga4-sessionisation',
    index: 9,
    title: 'Rebuild sessions from raw events',
    subtitle: 'The query behind every GA4 report you have ever read',
    objective: 'Turn the raw event stream into a session table and reconcile it against the UI.',
    concepts: ['ga4-schema', 'unnest', 'row-number', 'funnel'],
    steps: [
      {
        title: 'The session key',
        body:
          '`ga_session_id` is only unique within a user. The real session key is the pair ' +
          '`user_pseudo_id` + `ga_session_id`. Getting this wrong undercounts sessions by a few ' +
          'percent and nobody notices for months.',
        sql: `SELECT COUNT(DISTINCT ga_session_id) AS wrong,
       COUNT(DISTINCT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING))) AS right_answer
FROM ga4_events`,
      },
      {
        title: 'Collapse events to sessions',
        body:
          'One row per session, carrying whatever you need: the channel, the landing page, ' +
          'whether it converted, and how much it was worth.',
        sql: `WITH s AS (
  SELECT CONCAT(e.user_pseudo_id, '-', CAST(e.ga_session_id AS STRING)) AS session_key,
         MIN(e.event_timestamp) AS started_at,
         COUNT(*) AS events,
         MAX(CASE WHEN e.event_name = 'purchase' THEN 1 ELSE 0 END) AS converted,
         SUM(CASE WHEN e.event_name = 'purchase' THEN e.ecommerce.purchase_revenue ELSE 0 END) AS revenue
  FROM ga4_events e
  GROUP BY session_key
)
SELECT COUNT(*) AS sessions, SUM(converted) AS conversions, SUM(revenue) AS revenue FROM s`,
      },
      {
        title: 'The landing page needs a window function',
        body:
          'The landing page is the page_location of the session\'s *earliest* page_view. That is ' +
          'a ROW_NUMBER within the session, ordered by event_timestamp. Note that the QUALIFY ' +
          'needs its own CTE: picking one row per session and then grouping those rows are two ' +
          'separate steps, and trying to do both in one SELECT is a clause-order error.',
        sql: `WITH pv AS (
  SELECT CONCAT(e.user_pseudo_id, '-', CAST(e.ga_session_id AS STRING)) AS session_key,
         e.event_timestamp,
         (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'page_location') AS page
  FROM ga4_events e WHERE e.event_name = 'page_view'
),
first_page AS (
  SELECT session_key, page
  FROM pv
  QUALIFY ROW_NUMBER() OVER (PARTITION BY session_key ORDER BY event_timestamp) = 1
)
SELECT page AS landing_page, COUNT(*) AS sessions
FROM first_page
GROUP BY landing_page
ORDER BY sessions DESC
LIMIT 10`,
        task: {
          prompt:
            'Return `session_key`, `events` and `converted` for the 10 sessions with the most events.',
          solution: `SELECT CONCAT(e.user_pseudo_id, '-', CAST(e.ga_session_id AS STRING)) AS session_key,
       COUNT(*) AS events,
       MAX(CASE WHEN e.event_name = 'purchase' THEN 1 ELSE 0 END) AS converted
FROM ga4_events e
GROUP BY session_key
ORDER BY events DESC, session_key
LIMIT 10`,
          hints: ['Group by the composite session key.',
            'MAX over a 0/1 flag answers "did it ever convert?".'],
          orderMatters: true,
        },
      },
      {
        title: 'Reconcile',
        body:
          'Compare your rebuild to `ga4_sessions`. They agree here. Against the real GA4 UI they ' +
          'would not, by 1–3% — the UI applies its own engagement rules, thresholding and ' +
          'sampling. The job is to know the size and the cause of the gap, not to eliminate it.',
        sql: `SELECT
  (SELECT COUNT(DISTINCT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING))) FROM ga4_events) AS rebuilt,
  (SELECT COUNT(*) FROM ga4_sessions) AS reference`,
      },
    ],
  },
];

export function labBySlug(slug: string): Lab | undefined {
  return LABS.find((l) => l.slug === slug);
}
