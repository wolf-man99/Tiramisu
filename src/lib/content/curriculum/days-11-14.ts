import type { DayContent } from '../types';
import { p, h, list, key, call, sql, table, compare, mcq, predict, debug, explain, order, task } from './helpers';

export const DAYS_11_14: DayContent[] = [
  // ═════════════════════════════════════════════════════════ DAY 11 ══
  {
    day: 11,
    module: 9,
    moduleTitle: 'BigQuery in anger',
    title: 'What your query costs, and why',
    subtitle: 'The bill is bytes scanned',
    objective:
      'Read a query and predict its cost, then cut that cost without changing the answer.',
    estimatedMinutes: 100,
    concepts: ['partitioning', 'clustering', 'cost-optimisation', 'unnest', 'struct', 'array'],
    theory: [
      h('BigQuery is not a database you tune, it is a bill you write'),
      p(
        'There is no index to add and no server to size. On the on-demand model you are billed ' +
        'for one thing only: **the bytes BigQuery had to read to answer your question**. Roughly ' +
        '$6.25 per terabyte, with the first terabyte each month free. Everything a competent ' +
        'BigQuery analyst does differently comes from that single sentence.',
      ),
      key(
        'Rows returned cost nothing. Bytes scanned cost everything. `SELECT * … LIMIT 10` reads ' +
        'the entire table and charges you for all of it.',
      ),
      h('Columnar storage: you pay per column'),
      p(
        'BigQuery stores each column separately. A query that names three columns out of forty ' +
        'reads three columns out of forty. This is why `SELECT *` is the single most expensive ' +
        'habit a new user brings with them — and why the fix is free.',
      ),
      table(
        ['Query', 'Columns read', 'Relative cost'],
        [
          ['`SELECT * FROM ga4_events`', 'all 14', '1.00×'],
          ['`SELECT event_name, user_pseudo_id FROM ga4_events`', '2 narrow', '≈ 0.05×'],
          ['`SELECT event_params FROM ga4_events`', '1 wide', '≈ 0.30×'],
          ['`SELECT COUNT(*) FROM ga4_events`', 'none — metadata only', '0.00×'],
        ],
        'Not all columns are the same size. `event_params` alone is bigger than every scalar column combined.',
      ),
      h('Partitioning: skipping whole slabs of the table'),
      p(
        'A partitioned table is physically split — usually by day. A filter directly on the ' +
        'partitioning column lets BigQuery skip every partition that cannot match. `ga4_events` ' +
        'is partitioned on `event_date` and `google_ads_daily` on `date`; one day out of 366 is ' +
        'about 0.3% of the bytes.',
      ),
      compare(
        'Prunes — 1 partition read',
        "SELECT SUM(cost)\nFROM google_ads_daily\nWHERE date = '2024-06-14'",
        'Does not prune — 366 partitions read',
        "SELECT SUM(cost)\nFROM google_ads_daily\nWHERE CAST(date AS STRING) = '2024-06-14'",
        'Both return the same number. The second costs about 366 times more, because a function wrapped around the partitioning column makes it opaque to the pruner. The rule generalises: keep the partitioning column naked on the left of the comparison.',
      ),
      call(
        'warn',
        'The join that quietly unprunes',
        'Filtering on a date that comes from *another* table — `WHERE d.date = other.date` — ' +
        'cannot prune, because BigQuery does not know the value until the join runs. Push a ' +
        'literal date range onto the partitioned table as well, even when it looks redundant.',
      ),
      h('Clustering: sorted blocks inside each partition'),
      p(
        'Clustering sorts rows within a partition by up to four columns. A filter on a clustering ' +
        'column lets BigQuery skip blocks. `ga4_events` is clustered on `event_name` then ' +
        '`user_pseudo_id`, so `WHERE event_name = \'purchase\'` is cheap — purchases live ' +
        'together on disk.',
      ),
      list([
        '**Prefix matters.** Clustering on `(a, b)` helps a filter on `a`, or on `a AND b`. A filter on `b` alone barely helps.',
        '**Order by selectivity**, most-filtered column first.',
        '**Partition first, cluster second.** Pruning removes slabs; clustering removes blocks inside the surviving slabs.',
        '**Cost is an estimate, not a guarantee.** The dry-run byte count for a clustered table is an upper bound — the actual bill is often lower.',
      ]),
      h('Nested and repeated fields'),
      p(
        'BigQuery lets a column hold a `STRUCT` (a record) or an `ARRAY` (a repeated value), or ' +
        'an array of structs. This is not exotic — it is how the GA4 export is shaped, and it ' +
        'exists so that one row can stay one row instead of exploding into a join.',
      ),
      list([
        '`STRUCT` — read with a dot: `device.category`, `geo.country`, `ecommerce.purchase_revenue`. No UNNEST, no join, no cost.',
        '`ARRAY` — read with `UNNEST`, which flattens it into rows you can join to.',
        '`ARRAY<STRUCT<…>>` — both at once. `event_params` and `items` are this shape.',
      ]),
      sql(
        `SELECT device.category AS device, geo.country AS country, COUNT(*) AS events
FROM ga4_events
WHERE event_date BETWEEN '20241201' AND '20241207'
GROUP BY device, country
ORDER BY events DESC
LIMIT 8`,
        'STRUCT access is free. It is just a dotted column name.',
      ),
      h('UNNEST is a correlated CROSS JOIN'),
      p(
        '`FROM ga4_events e, UNNEST(e.event_params) AS ep` reads "for each event, produce one row ' +
        'per parameter". Thirteen parameters per event turns 54,042 events into roughly 350,000 ' +
        'rows. That is fine when you want them; it is a disaster when you then aggregate without ' +
        'thinking, because every `COUNT(*)` is now a parameter count, not an event count.',
      ),
      call(
        'info',
        'The scalar-subquery idiom',
        'When you want *one* parameter, do not flatten the whole array. ' +
        '`(SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = \'page_location\')` ' +
        'returns a single value per event and leaves the grain alone. Use the CROSS JOIN form ' +
        'only when you genuinely want one row per parameter.',
      ),
      h('The value STRUCT has four fields and only one is populated'),
      p(
        'Every GA4 parameter value is `STRUCT<string_value, int_value, double_value, float_value>`. ' +
        'Read the wrong sub-field and you get NULL — silently, with no error. `page_location` is a ' +
        'string; `ga_session_id` and `engagement_time_msec` are ints; `value` on a purchase is a ' +
        'double. Getting this wrong is the most common reason a GA4 query "returns nothing".',
      ),
      h('Dry runs and the seatbelt'),
      p(
        'Every BigQuery client will tell you the byte count *before* you run — that is a dry run, ' +
        'and it is free. Read it. Then set `maximum_bytes_billed` on the job so a mistake fails ' +
        'instead of billing. A 4 TB accident costs about $25; the same accident on a schedule, ' +
        'hourly, costs $18,000 a month.',
      ),
      table(
        ['Tool', 'What it does', 'When to reach for it'],
        [
          ['Dry run', 'Free byte estimate before execution', 'Every single time, until it is a reflex'],
          ['`maximum_bytes_billed`', 'Job fails instead of over-billing', 'Always, especially on scheduled queries'],
          ['Preview tab', 'Shows rows for free', 'Instead of `SELECT * LIMIT 10`'],
          ['Materialised view', 'Auto-maintained pre-aggregate', 'A heavy aggregate many dashboards share'],
          ['Scheduled query → table', 'Writes a small table on a cadence', 'When the logic is too complex for a MV'],
          ['`BI Engine`', 'In-memory acceleration for dashboards', 'Same dashboard queried all day'],
        ],
      ),
      h('The playbook'),
      list([
        'Name your columns. Never `SELECT *` outside a preview.',
        'Filter the partitioning column with a literal range, unwrapped.',
        'Filter on clustering columns when you can.',
        'Filter *before* you UNNEST, not after.',
        'Aggregate in BigQuery; export the small result, not the big table.',
        'Dry-run first, and cap the job.',
        'If the same aggregate runs more than daily, materialise it.',
      ], true),
      key(
        'Cost optimisation in BigQuery is not a performance topic. It is a correctness-of-behaviour ' +
        'topic: the analyst who knows what a query costs is the analyst who gets to keep running them.',
      ),
    ],
    visual: {
      kind: 'partition-pruning',
      title: 'Pruning, blocks and the bill',
      caption:
        'Watch 366 daily partitions collapse to one when the filter stays naked, and watch the ' +
        'same filter read every partition once you wrap it in CAST().',
    },
    examples: [
      {
        title: 'Name the columns, bound the dates',
        question: 'Which June days had the most expensive spend on a single campaign?',
        sql: `SELECT date, campaign_id, cost, clicks
FROM google_ads_daily
WHERE date BETWEEN '2024-06-01' AND '2024-06-30'
ORDER BY cost DESC
LIMIT 10`,
        takeaway:
          'Four columns instead of nine, one month instead of a year. Same answer, a few percent ' +
          'of the bytes. Neither change made the SQL harder to read.',
      },
      {
        title: 'Filter on the clustering column',
        question: 'How did the three checkout events perform over Black Friday week?',
        sql: `SELECT event_name, COUNT(*) AS events, COUNT(DISTINCT user_pseudo_id) AS devices
FROM ga4_events
WHERE event_date BETWEEN '20241125' AND '20241202'
  AND event_name IN ('purchase', 'begin_checkout', 'add_to_cart')
GROUP BY event_name
ORDER BY events DESC`,
        takeaway:
          '`event_date` prunes partitions and `event_name` — the first clustering column — skips ' +
          'blocks inside them. The two filters compose, and this is the cheapest shape a GA4 ' +
          'question can take.',
      },
      {
        title: 'Filter before you UNNEST',
        question: 'Which traffic sources drove Q4 purchase revenue?',
        sql: `WITH purchases AS (
  SELECT event_params, ecommerce.purchase_revenue AS revenue
  FROM ga4_events
  WHERE event_name = 'purchase'
    AND event_date BETWEEN '20241001' AND '20241231'
)
SELECT (SELECT ep.value.string_value FROM UNNEST(p.event_params) AS ep WHERE ep.key = 'source') AS source,
       COUNT(*) AS purchases,
       ROUND(SUM(p.revenue), 2) AS revenue
FROM purchases p
GROUP BY source
ORDER BY revenue DESC
LIMIT 10`,
        takeaway:
          'The CTE cuts 54,042 events down to a few thousand purchases before a single array is ' +
          'touched. Flattening first and filtering afterwards returns the identical answer and ' +
          'does an order of magnitude more work.',
      },
    ],
    playground: {
      prompt:
        'Run the query below, then break it deliberately: wrap `event_date` in a function, swap ' +
        'the column list for `*`, and move the `event_name` filter into a HAVING clause. Each ' +
        'change keeps the answer and raises the cost. Predict which one hurts most before you run it.',
      starter: `-- Cheap shape: pruned partition, clustered filter, named columns.
SELECT event_date,
       COUNT(*) AS purchases,
       ROUND(SUM(ecommerce.purchase_revenue), 2) AS revenue
FROM ga4_events
WHERE event_name = 'purchase'
  AND event_date BETWEEN '20240601' AND '20240614'
GROUP BY event_date
ORDER BY event_date`,
    },
    practice: ['9.1', '9.2', '9.3', '9.4', '9.6', '9.7', '9.8', '9.9', '9.10', '9.11', '9.12'],
    quiz: [
      mcq('d11q1', 'On the on-demand model, what are you billed for?',
        ['Rows returned', 'Bytes scanned', 'Query duration', 'Number of joins'],
        1,
        'Bytes scanned, and nothing else. A LIMIT does not reduce the scan, because the scan happens first.'),
      predict('d11q2', 'Which of these reads the whole table?',
        `SELECT SUM(cost) FROM google_ads_daily WHERE DATE_TRUNC(date, MONTH) = '2024-06-01'`,
        ['It prunes to June', 'It reads all 366 partitions', 'It reads one partition', 'It errors'],
        1,
        'DATE_TRUNC wraps the partitioning column, so the pruner cannot use it. `WHERE date BETWEEN \'2024-06-01\' AND \'2024-06-30\'` prunes and returns the same number.'),
      mcq('d11q3', '`ga4_events` is clustered on `(event_name, user_pseudo_id)`. Which filter benefits most?',
        ['`WHERE user_pseudo_id = \'…\'`', '`WHERE event_name = \'purchase\'`',
          '`WHERE geo.country = \'GB\'`', 'All equally'],
        1,
        'Clustering helps left-to-right. A filter on the first column skips blocks; a filter on the second alone barely helps.'),
      debug('d11q4', 'This returns NULL for every row. Why?',
        `(SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'ga_session_id')`,
        ['The key is wrong', 'ga_session_id is an INT64, so read `value.int_value`',
          'UNNEST needs an alias', 'event_params is empty'],
        1,
        'The value STRUCT has one sub-field per type and only the matching one is populated. Read the wrong one and you get a silent NULL.'),
      mcq('d11q5', 'You want one parameter per event without changing the grain. What do you write?',
        ['`FROM t, UNNEST(event_params)`', 'A scalar subquery over UNNEST in the SELECT list',
          '`LEFT JOIN UNNEST(...)`', '`ARRAY_AGG`'],
        1,
        'The CROSS JOIN form multiplies rows by parameter count. The scalar subquery returns one value and leaves one row per event.'),
    ],
    assessment: {
      passScore: 0.7,
      timeLimitSec: 1080,
      questions: [
        mcq('d11a1', 'A scheduled query scans 4 TB every hour. Roughly what does it cost per month?',
          ['About $25', 'About $180', 'About $18,000', 'Nothing — schedules are free'],
          2,
          '4 TB × ~$6.25 × 24 × 30 ≈ $18,000. The same 4 TB run once is $25. Scheduling multiplies mistakes.'),
        explain('d11a2', 'What does the comma in this FROM clause do?',
          `FROM ga4_events e, UNNEST(e.event_params) AS ep`,
          ['A CROSS JOIN with every event_params in the table',
            'A correlated CROSS JOIN — each event joined only to its own parameters',
            'An INNER JOIN on key',
            'Nothing; it is a syntax quirk'],
          1,
          'UNNEST after a comma is correlated to the row it came from. It multiplies rows by that row\'s array length, which is why filtering first matters so much.'),
        mcq('d11a3', 'Which change reduces cost without changing the result?',
          ['Adding LIMIT 100', 'Adding ORDER BY',
            'Replacing `SELECT *` with the four columns you use', 'Adding DISTINCT'],
          2,
          'LIMIT and ORDER BY happen after the scan. Naming columns is the only one of the four that reads less data.'),
        mcq('d11a4', 'The same heavy aggregate powers six dashboards and refreshes hourly. What do you do?',
          ['Add more clustering', 'Materialise it into a table and point the dashboards at that',
            'Add LIMIT to each dashboard', 'Nothing — BigQuery caches it'],
          1,
          'Caching only helps byte-identical queries within 24 hours and is invalidated by any change to the source. Pay for the aggregate once, read it six times.'),
      ],
      exerciseIds: ['9.5', '9.13'],
    },
    challenge: '9.14',
    reflection: [
      'Look at the heaviest query you or your team runs on a schedule. How many of its columns are actually read downstream?',
      'Which of your queries filters on a date that arrives via a join, and therefore never prunes?',
      'What would you set `maximum_bytes_billed` to, if you had to defend the number?',
    ],
    project: {
      title: 'Cut a 4.2 TB query to under 40 GB',
      brief:
        'You inherit a nightly job: `SELECT * FROM ga4_events` exported to a spreadsheet, where ' +
        'somebody pivots it. Replace it with two queries that answer the same two questions in a ' +
        'fraction of the bytes — and produce answers small enough to email.',
      tasks: [
        task('prune-and-project', 'Aggregate in the warehouse, not the spreadsheet',
          'Return `event_date`, `page_views`, `purchases` and `devices` for December 2024, one row per day, chronological. The old job exported every column of every event to get this.',
          `SELECT event_date,
       COUNTIF(event_name = 'page_view') AS page_views,
       COUNTIF(event_name = 'purchase') AS purchases,
       COUNT(DISTINCT user_pseudo_id) AS devices
FROM ga4_events
WHERE event_date BETWEEN '20241201' AND '20241231'
GROUP BY event_date
ORDER BY event_date`,
          ['Filter on the raw `event_date` string so the partition filter stays naked.',
            'COUNTIF gives you one pass over the data instead of three separate queries.',
            'Three named columns, 31 rows out — that is the whole point of the rewrite.'],
          { orderMatters: true }),
        task('filter-before-unnest', 'Filter first, flatten second',
          'Return `source`, `purchases` and `revenue` for Q4 2024 purchase events, ordered by revenue descending. Reduce the event set *before* touching `event_params`.',
          `WITH purchases AS (
  SELECT event_params, ecommerce.purchase_revenue AS revenue
  FROM ga4_events
  WHERE event_name = 'purchase'
    AND event_date BETWEEN '20241001' AND '20241231'
)
SELECT (SELECT ep.value.string_value FROM UNNEST(p.event_params) AS ep WHERE ep.key = 'source') AS source,
       COUNT(*) AS purchases,
       ROUND(SUM(p.revenue), 2) AS revenue
FROM purchases p
GROUP BY source
ORDER BY revenue DESC, source`,
          ['A CTE that filters on the partition and the clustering column first.',
            'Then the scalar-subquery idiom, so the grain stays one row per purchase.',
            '`source` is a string parameter, so read `value.string_value`.'],
          { orderMatters: true }),
      ],
    },
  },

  // ═════════════════════════════════════════════════════════ DAY 12 ══
  {
    day: 12,
    module: 10,
    moduleTitle: 'The GA4 export schema',
    title: 'The GA4 export, honestly',
    subtitle: 'Where marketers meet real SQL, and most give up',
    objective:
      'Rebuild GA4 reports from raw events, and explain every place your numbers disagree with the UI.',
    estimatedMinutes: 110,
    concepts: ['ga4-schema', 'ga4-params', 'unnest', 'struct', 'grain', 'funnel'],
    theory: [
      h('One row per event. That is the whole schema.'),
      p(
        'The GA4 BigQuery export has no sessions table, no users table and no pages table. It has ' +
        'events. Everything the GA4 interface shows you — sessions, engagement rate, channel ' +
        'grouping, landing pages, conversion rate — is *derived* at query time from this one ' +
        'stream. Once you accept that, the export stops being confusing and starts being honest.',
      ),
      key(
        'The GA4 UI is a set of opinions applied to this table. When your SQL disagrees with the ' +
        'UI, one of you has a different opinion — and you can read yours.',
      ),
      h('Four traps, in the order they will bite you'),
      table(
        ['Field', 'What you assume', 'What it actually is'],
        [
          ['`event_date`', 'A DATE', 'A STRING shaped `20241214`. Comparing it to a DATE errors; comparing it to `\'2024-12-14\'` silently matches nothing.'],
          ['`event_timestamp`', 'Seconds or millis', 'MICROseconds since epoch. Divide by 1,000,000, or use `TIMESTAMP_MICROS`.'],
          ['`user_pseudo_id`', 'A person', 'A device/browser. One person on two devices is two users.'],
          ['`user_id`', 'Always present', 'NULL until the user logs in. Most of your rows have none.'],
        ],
      ),
      p(
        'The string date is not an accident — it is what makes the table partitionable and cheap. ' +
        'Convert it when you need date maths (`PARSE_DATE(\'%Y%m%d\', event_date)`), but always ' +
        'filter on the raw string so pruning survives.',
      ),
      h('There is no session. You build one.'),
      p(
        'A session is a *pair*: `user_pseudo_id` plus the `ga_session_id` parameter. Neither is ' +
        'unique alone — session ids are timestamps and collide across devices. Concatenate them.',
      ),
      sql(
        `SELECT COUNT(DISTINCT CONCAT(user_pseudo_id, '.', CAST(ga_session_id AS STRING))) AS sessions,
       COUNT(DISTINCT user_pseudo_id) AS devices,
       COUNT(*) AS events
FROM ga4_events
WHERE event_date BETWEEN '20241201' AND '20241207'`,
        'Sessions, devices and events are three different numbers from one table. Say which one you mean.',
      ),
      call(
        'warn',
        'In the real export, ga_session_id lives inside event_params',
        'This warehouse promotes `ga_session_id` and `ga_session_number` to top-level columns so ' +
        'you can learn sessionisation before you learn array-wrangling. In production you pull ' +
        'them out of `event_params` with `value.int_value` — and every session query starts with ' +
        'that extraction. Exercise 10.3 and the `ga4-sessionisation` lab do it the real way.',
      ),
      h('event_params: the key/value bag'),
      p(
        'Anything GA4 does not have a column for goes into `event_params`, a repeated ' +
        '`STRUCT<key, value>`. Two idioms extract from it, and choosing between them is most of ' +
        'the skill.',
      ),
      compare(
        'One parameter — scalar subquery',
        "SELECT\n  (SELECT ep.value.string_value\n   FROM UNNEST(e.event_params) AS ep\n   WHERE ep.key = 'page_location') AS page,\n  COUNT(*) AS views\nFROM ga4_events e\nWHERE e.event_name = 'page_view'\nGROUP BY page",
        'Several parameters — flatten and pivot',
        "SELECT e.event_timestamp,\n  MAX(CASE WHEN ep.key = 'page_location'\n           THEN ep.value.string_value END) AS page,\n  MAX(CASE WHEN ep.key = 'engagement_time_msec'\n           THEN ep.value.int_value END) AS engaged_ms\nFROM ga4_events e, UNNEST(e.event_params) AS ep\nGROUP BY e.event_timestamp",
        'The scalar subquery keeps one row per event and is clearer for one or two parameters. The flatten-and-pivot reads the array once and is faster when you need five. Both are correct; neither is always right.',
      ),
      h('traffic_source is not the session\'s source'),
      p(
        'This is the single most misunderstood field in the export, and it quietly ruins channel ' +
        'reports. `traffic_source` is a `STRUCT` describing the user\'s **first ever** acquisition, ' +
        'stamped immutably onto every event that device will ever fire. The `source` and `medium` ' +
        'inside `event_params` describe **this session**.',
      ),
      table(
        ['You want', 'Read', 'Scope'],
        [
          ['"Where did this session come from?"', '`event_params` → `source` / `medium`', 'Session'],
          ['"How did we first acquire this user?"', '`traffic_source.source` / `.medium`', 'User, immutable'],
          ['"Which campaign gets last-click credit?"', '`event_params` on the converting session', 'Session'],
          ['"Which campaign started the relationship?"', '`traffic_source.name`', 'User, immutable'],
        ],
      ),
      call(
        'trap',
        'The symptom',
        'A paid campaign appears to be driving direct traffic months after it stopped running. ' +
        'That is `traffic_source` doing exactly what it promises, in a report that wanted ' +
        'session scope.',
      ),
      h('Channel grouping is business logic, not data'),
      p(
        'GA4 has no `channel` column. The Default Channel Group you see in the UI is a CASE ' +
        'ladder over source and medium that Google maintains and every company eventually ' +
        'overrides. Owning that ladder in SQL is what lets you match the definition your CMO ' +
        'actually uses — and it is why your rebuild must always have an `ELSE`, so traffic can ' +
        'never silently vanish.',
      ),
      h('Sessions, engagement and conversion, defined exactly'),
      list([
        '**Session** — distinct `user_pseudo_id` + `ga_session_id`. Ends after 30 minutes idle, and resets at midnight in the property timezone.',
        '**Engaged session** — lasted 10+ seconds, *or* had 2+ page views, *or* had a conversion. Any one of the three.',
        '**Engagement rate** — engaged sessions ÷ sessions. Bounce rate is now just its complement.',
        '**Conversion** — an event you flagged as a key event. It is a label you chose, not a fact about the data.',
        '**Users** — distinct `user_pseudo_id`. Devices, not people.',
      ]),
      h('Why your SQL will still disagree with the UI by 1–3%'),
      list([
        '**Sampling and thresholding.** The UI samples large ranges and suppresses small demographic cells; the export never does.',
        '**Cardinality collapse.** The UI folds high-cardinality dimensions into `(other)`; the export keeps every value.',
        '**Late-arriving events.** Mobile SDKs upload hours or days late and land in an earlier partition than the day you queried.',
        '**Modelled conversions.** Consent-mode gaps are modelled in the UI and simply absent from the export.',
        '**Timezone.** `event_date` follows the property timezone; `event_timestamp` is UTC. Mixing them shifts a day boundary.',
      ]),
      key(
        'A 1–3% gap is normal and explainable. A 30% gap is a bug in your SQL. Knowing which one ' +
        'you are looking at is the skill this day is really teaching.',
      ),
    ],
    visual: {
      kind: 'nested-data',
      title: 'Inside one GA4 event',
      caption:
        'Expand a single purchase event: scalar columns, the STRUCTs you read with a dot, and ' +
        'the two arrays that need UNNEST. Toggle a parameter to see which value sub-field is populated.',
    },
    examples: [
      {
        title: 'Sessions, devices and events',
        question: 'How many sessions did we actually have in the first week of December?',
        sql: `SELECT event_date,
       COUNT(DISTINCT CONCAT(user_pseudo_id, '.', CAST(ga_session_id AS STRING))) AS sessions,
       COUNT(DISTINCT user_pseudo_id) AS devices,
       COUNT(*) AS events
FROM ga4_events
WHERE event_date BETWEEN '20241201' AND '20241207'
GROUP BY event_date
ORDER BY event_date`,
        takeaway:
          'Three plausible answers to "how much traffic did we get". Every conversion rate you ' +
          'ever quote depends on which of these three you put in the denominator.',
      },
      {
        title: 'Flatten once, pivot several parameters',
        question: 'For one day, what page did each page_view hit and how long was it engaged?',
        sql: `SELECT e.event_date,
       MAX(CASE WHEN ep.key = 'page_location' THEN ep.value.string_value END) AS page,
       MAX(CASE WHEN ep.key = 'engagement_time_msec' THEN ep.value.int_value END) AS engagement_ms
FROM ga4_events e, UNNEST(e.event_params) AS ep
WHERE e.event_name = 'page_view' AND e.event_date = '20240614'
GROUP BY e.event_date, e.event_timestamp, e.user_pseudo_id
ORDER BY engagement_ms DESC
LIMIT 10`,
        takeaway:
          'One pass over the array, two parameters out. Note the GROUP BY: it has to reconstruct ' +
          'the original event identity, because flattening destroyed it.',
      },
      {
        title: 'First-touch versus this-session',
        question: 'How differently do the two source fields describe the same traffic?',
        sql: `SELECT traffic_source.source AS user_first_touch_source,
       (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'source') AS session_source,
       COUNT(*) AS events
FROM ga4_events e
WHERE e.event_date BETWEEN '20241201' AND '20241207'
GROUP BY user_first_touch_source, session_source
ORDER BY events DESC
LIMIT 12`,
        takeaway:
          'The off-diagonal rows are the entire argument. Every one of them is a session whose ' +
          'channel report changes depending on which field you picked.',
      },
    ],
    playground: {
      prompt:
        'Change `value.string_value` to `value.int_value` and watch the column fill with NULLs ' +
        'instead of erroring. Then swap the scalar subquery for a comma-UNNEST and see the event ' +
        'count multiply by thirteen. Both failures are silent — that is why you check.',
      starter: `SELECT (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'page_location') AS page,
       COUNT(*) AS views,
       COUNT(DISTINCT e.user_pseudo_id) AS devices
FROM ga4_events e
WHERE e.event_name = 'page_view'
  AND e.event_date BETWEEN '20240601' AND '20240607'
GROUP BY page
ORDER BY views DESC
LIMIT 15`,
    },
    practice: ['10.1', '10.2', '10.3', '10.4', '10.5', '10.7', '10.8', '10.9', '10.10', '10.11', '10.12'],
    quiz: [
      mcq('d12q1', 'What is the grain of the GA4 export?',
        ['One row per session', 'One row per user', 'One row per event', 'One row per day'],
        2,
        'Everything else — sessions, users, channels, funnels — is derived from that grain at query time.'),
      predict('d12q2', 'What does this return?',
        `SELECT COUNT(*) FROM ga4_events WHERE event_date = '2024-06-14'`,
        ['The events on 14 June', 'Zero rows', 'An error', 'Every event'],
        1,
        '`event_date` is a STRING shaped `20240614`. The comparison is valid, matches nothing, and reports zero without complaint — the worst kind of failure.'),
      mcq('d12q3', 'A campaign that stopped running in March is credited with direct traffic in November. Why?',
        ['Attribution lag', 'The report used `traffic_source`, which is user-scoped and immutable',
          'GA4 is sampling', 'The campaign is still live'],
        1,
        '`traffic_source` records first-ever acquisition and is stamped on every future event. Session-scoped reporting needs the source parameter in `event_params`.'),
      debug('d12q4', 'This session count is thirteen times too high. What is wrong?',
        `SELECT COUNT(DISTINCT user_pseudo_id) AS sessions
FROM ga4_events e, UNNEST(e.event_params) AS ep`,
        ['DISTINCT is missing', 'The comma-UNNEST multiplied rows, and the count is of devices not sessions',
          'user_pseudo_id is NULL', 'It needs GROUP BY'],
        1,
        'Two bugs at once: the UNNEST fanned each event into one row per parameter, and distinct devices were never a session count anyway.'),
      mcq('d12q5', 'Your rebuilt session count is 2% below the GA4 UI. What is the most likely cause?',
        ['A bug in your SQL', 'Sampling, late-arriving events and modelled conversions',
          'The export is broken', 'You used the wrong table'],
        1,
        'A 1–3% gap is the expected difference between a sampled, modelled UI and a raw export. Thirty percent would be your bug.'),
    ],
    assessment: {
      passScore: 0.7,
      timeLimitSec: 1080,
      questions: [
        mcq('d12a1', 'You need the session key. What is it?',
          ['`ga_session_id`', '`user_pseudo_id`',
            '`user_pseudo_id` concatenated with `ga_session_id`', '`user_id`'],
          2,
          '`ga_session_id` is derived from a timestamp and collides across devices. Only the pair is unique.'),
        explain('d12a2', 'Why does this return NULL for every row?',
          `(SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'engagement_time_msec')`,
          ['The parameter does not exist', 'engagement_time_msec is an INT64 — read `value.int_value`',
            'UNNEST is wrong', 'The key needs quoting'],
          1,
          'The value STRUCT populates exactly one sub-field. Reading the wrong one is legal SQL and returns silent NULLs.'),
        mcq('d12a3', 'Which definition of "engaged session" does GA4 use?',
          ['10+ seconds only', '2+ page views only',
            '10+ seconds OR 2+ page views OR a conversion', 'Any session with a scroll event'],
          2,
          'It is a three-way OR. Implementing only one of the three is the most common reason a rebuilt engagement rate is too low.'),
        mcq('d12a4', 'Your channel rebuild has no ELSE branch. What happens?',
          ['It errors', 'Unmatched traffic becomes NULL and disappears from grouped reports',
            'It defaults to Direct', 'Nothing'],
          1,
          'The rows survive but land in a NULL bucket that readers skip past. Always terminate the ladder with `ELSE \'Other\'` so a gap is visible.'),
      ],
      exerciseIds: ['10.6', '10.13'],
    },
    challenge: '10.14',
    reflection: [
      'Which of your team\'s GA4 reports depends on a definition nobody has written down?',
      'If your SQL and the GA4 UI disagreed by 8%, what would you check first, second and third?',
      'Whose definition of "conversion" is your dashboard using, and did they know they were choosing it?',
    ],
    project: {
      title: 'Rebuild Traffic Acquisition, then reconcile it',
      brief:
        'Rebuild GA4\'s Traffic Acquisition report from raw events, month by month. Then compare ' +
        'your rebuild to the pre-flattened `ga4_sessions` table channel by channel, and account ' +
        'for every session that lands in a different bucket.',
      tasks: [
        task('acquisition-by-month', 'Traffic acquisition, by month and channel',
          'Return `month`, `channel`, `sessions`, `cvr_pct` and `revenue` from raw events. Collapse to one row per session first, then apply the channel ladder. Order by month, then sessions descending.',
          `WITH per_session AS (
  SELECT CONCAT(e.user_pseudo_id, '.', CAST(e.ga_session_id AS STRING)) AS session_key,
         MIN(e.event_date) AS session_date,
         MAX((SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'medium')) AS medium,
         MAX(CASE WHEN e.event_name = 'purchase' THEN 1 ELSE 0 END) AS converted,
         SUM(CASE WHEN e.event_name = 'purchase' THEN e.ecommerce.purchase_revenue ELSE 0 END) AS revenue
  FROM ga4_events e
  GROUP BY session_key
)
SELECT FORMAT_DATE('%Y-%m', PARSE_DATE('%Y%m%d', session_date)) AS month,
       CASE WHEN medium = 'cpc' THEN 'Paid Search'
            WHEN medium = 'paid_social' THEN 'Paid Social'
            WHEN medium = 'organic' THEN 'Organic Search'
            WHEN medium = 'email' THEN 'Email'
            WHEN medium = 'referral' THEN 'Referral'
            WHEN medium = 'display' THEN 'Display'
            WHEN medium = 'affiliate' THEN 'Affiliate'
            WHEN medium = '(none)' THEN 'Direct'
            ELSE 'Other' END AS channel,
       COUNT(*) AS sessions,
       ROUND(SAFE_DIVIDE(SUM(converted), COUNT(*)) * 100, 2) AS cvr_pct,
       ROUND(SUM(revenue), 2) AS revenue
FROM per_session
GROUP BY month, channel
ORDER BY month, sessions DESC, channel`,
          ['Collapse events to one row per session before you group by anything else.',
            'The session date is the first event\'s `event_date` — a session cannot start twice.',
            'PARSE_DATE turns the YYYYMMDD string into a real date; FORMAT_DATE gives you the month label.',
            'End the CASE ladder with ELSE so no traffic disappears.'],
          { orderMatters: true }),
        task('reconcile-by-channel', 'Where the rebuild and the flattened table disagree',
          'Join your per-session rebuild to `ga4_sessions` on the session key and return `stored_channel`, `rebuilt_channel` and `sessions` for every pair that disagrees, most sessions first. Then explain what you found.',
          `WITH rebuilt AS (
  SELECT DISTINCT CONCAT(e.user_pseudo_id, '.', CAST(e.ga_session_id AS STRING)) AS session_key,
         (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'medium') AS medium
  FROM ga4_events e
)
SELECT s.channel_group AS stored_channel,
       CASE WHEN r.medium = 'cpc' THEN 'Paid Search'
            WHEN r.medium = 'paid_social' THEN 'Paid Social'
            WHEN r.medium = 'organic' THEN 'Organic Search'
            WHEN r.medium = 'email' THEN 'Email'
            WHEN r.medium = 'referral' THEN 'Referral'
            WHEN r.medium = 'display' THEN 'Display'
            WHEN r.medium = 'affiliate' THEN 'Affiliate'
            WHEN r.medium = '(none)' THEN 'Direct'
            ELSE 'Other' END AS rebuilt_channel,
       COUNT(*) AS sessions
FROM ga4_sessions s
LEFT JOIN rebuilt r ON r.session_key = s.session_key
GROUP BY stored_channel, rebuilt_channel
HAVING stored_channel <> rebuilt_channel
ORDER BY sessions DESC, stored_channel, rebuilt_channel`,
          ['The stored `session_key` is `user_pseudo_id` and `ga_session_id` joined by a dot.',
            'Apply the identical CASE ladder to the rebuild so the comparison is fair.',
            'HAVING can filter on the grouping keys — keep only the pairs that disagree.',
            'Look at the `source` on the stored side of the disagreeing rows before you write your explanation.'],
          {
            orderMatters: true,
            note:
              'Every disagreeing session is `internal-qa` traffic. The flattened table labels it ' +
              'Referral; the raw events carry the real medium the QA script simulated. Totals ' +
              'reconcile exactly — 10,633 sessions either way — so a top-line check would have ' +
              'missed it entirely. Reconcile at the grain you report at, not at the total.',
          }),
      ],
    },
  },

  // ═════════════════════════════════════════════════════════ DAY 13 ══
  {
    day: 13,
    module: 11,
    moduleTitle: 'Marketing analytics',
    title: 'Every metric, from first principles',
    subtitle: 'The module the other eleven exist to enable',
    objective:
      'Derive, implement and stress-test the metrics a growth team actually argues about.',
    estimatedMinutes: 150,
    concepts: ['cac', 'roas', 'aov', 'ltv', 'retention', 'churn', 'mrr', 'activation',
      'funnel', 'cohort', 'attribution', 'segmentation'],
    theory: [
      h('A metric is a definition with a number attached'),
      p(
        'Everything today follows one pattern: **decide the numerator, decide the denominator, ' +
        'decide the population, decide the window.** Change any of the four and the number ' +
        'changes. Nobody is lying — they made a different choice and did not say so.',
      ),
      key(
        'When two dashboards disagree, the bug is almost never arithmetic. It is a denominator ' +
        'nobody wrote down.',
      ),
      h('Rate metrics: weight, always'),
      p(
        'CTR, CPC, CPM, conversion rate, ROAS — all of them are ratios of sums, never averages of ' +
        'ratios. Day 4 proved this; today you will feel it, because the numbers you produce go on ' +
        'a slide.',
      ),
      sql(
        `SELECT platform,
       ROUND(SAFE_DIVIDE(SUM(clicks), SUM(impressions)) * 100, 2) AS ctr_pct,
       ROUND(SAFE_DIVIDE(SUM(spend), SUM(clicks)), 2) AS cpc,
       ROUND(SAFE_DIVIDE(SUM(spend), SUM(impressions)) * 1000, 2) AS cpm
FROM ad_spend_daily
GROUP BY platform
ORDER BY cpm DESC`,
        'LinkedIn CPM is nine times Meta\'s. That is not a bug; it is what B2B audience targeting costs.',
      ),
      h('CAC has three answers and you must name which one'),
      table(
        ['Definition', 'Numerator', 'Denominator', 'Use it when'],
        [
          ['Blended CAC', 'All paid spend', 'All new customers', 'Board reporting. Honest, unflattering, hard to game.'],
          ['Paid-only CAC', 'All paid spend', 'New customers whose first touch was paid', 'Judging the paid team.'],
          ['Channel CAC', 'That channel\'s spend', 'Customers attributed to that channel', 'Budget allocation. Depends entirely on the attribution model.'],
          ['Fully-loaded CAC', 'Spend + salaries + tools', 'All new customers', 'Unit economics and fundraising.'],
        ],
      ),
      p(
        'In this warehouse blended CAC is about $192 and paid-only CAC about $352. Both are ' +
        'correct. A growth lead quoting the first and a CFO quoting the second will have a very ' +
        'confusing meeting.',
      ),
      call(
        'warn',
        'The denominator nobody agrees on',
        'Does a customer who signed up in March and bought in June count in March or June? Does a ' +
        'reactivated churned customer count as new? Does a B2B account with five seats count once ' +
        'or five times? Decide, write it down, and put it in the query as a comment.',
      ),
      h('ROAS: two numbers, one gap'),
      p(
        'Platform-reported ROAS comes from the ad platform\'s own attribution — view-through ' +
        'windows, cross-device modelling, and a strong incentive to look good. Warehouse ROAS ' +
        'comes from your orders table. They will never match, and the *gap itself* is the ' +
        'interesting number.',
      ),
      list([
        'Platform > warehouse: the platform is claiming conversions your data cannot see — view-throughs, modelled conversions, or double counting across platforms.',
        'Warehouse > platform: your attribution is crediting the channel for orders it did not touch, or tracking is broken on the platform side.',
        'Both are normal. Track the ratio over time; a sudden move in it is a tracking incident, not a performance change.',
      ]),
      h('AOV, and the whale problem'),
      p(
        'Mean AOV is revenue ÷ orders. Median AOV is the middle order. When they diverge you have ' +
        'a long tail, and every "average customer" statement you make is describing nobody. ' +
        'Report both, or report the median and the top decile.',
      ),
      h('LTV: three definitions, increasing honesty'),
      table(
        ['Flavour', 'How', 'Trap'],
        [
          ['Historical', 'Sum revenue to date per customer', 'Biased low — young customers have not had time to spend.'],
          ['Cohort-at-age', 'Revenue by month N, only cohorts old enough to have a month N', 'The only one that compares fairly. Fewer cohorts qualify as N grows.'],
          ['Predicted', 'Fit a retention curve and extrapolate', 'Honest only if you state the assumption and the horizon.'],
        ],
      ),
      call(
        'trap',
        'Never divide lifetime revenue by lifetime CAC across different windows',
        'Twelve months of revenue against a CAC computed from a single month of spend is the most ' +
        'common LTV:CAC error in the wild. It flatters every channel, and it flatters the ' +
        'fastest-growing one most.',
      ),
      h('Retention and the cohort matrix'),
      p(
        'A cohort is a group defined by when they arrived. The matrix puts cohorts down the side ' +
        'and age across the top, so you read *down* a column to see whether the product is ' +
        'improving, and *across* a row to see how one cohort decays.',
      ),
      list([
        '**Classic retention** — active in exactly month N. Strict, spiky, honest.',
        '**Rolling retention** — active in month N *or later*. Smoother, more flattering, and it can only be computed for the past.',
        '**Never divide by the wrong cohort size.** The denominator is the cohort at month 0, not the survivors of month N-1.',
      ]),
      h('Churn: logo, revenue, gross, net'),
      table(
        ['Metric', 'Counts', 'What it hides'],
        [
          ['Logo churn', 'Customers lost ÷ customers at start', 'That the ones you lost were tiny.'],
          ['Gross revenue churn', 'MRR lost ÷ MRR at start', 'Nothing — it is the floor. Always ≥ 0.'],
          ['Net revenue retention', '(start − churn − contraction + expansion) ÷ start', 'That your logo count is shrinking. NRR above 100% with negative logo growth is a real and dangerous shape.'],
        ],
      ),
      h('The MRR bridge'),
      p(
        'Last month\'s MRR plus new plus expansion minus contraction minus churn plus ' +
        'reactivation equals this month\'s MRR. If it does not balance, one of your five buckets ' +
        'is misclassifying somebody — usually a customer who cancelled and came back inside the ' +
        'same month.',
      ),
      h('Funnels: any-order versus strict-order'),
      p(
        'An any-order funnel asks "did each step ever happen in this session?". A strict-order ' +
        'funnel asks "did they happen in sequence?" and requires timestamps and window functions. ' +
        'The strict version always reports lower numbers, and it is the one that matches how ' +
        'people actually describe the funnel out loud.',
      ),
      h('Attribution: six models, six answers, one dataset'),
      p(
        'Attribution is not a measurement problem, it is an allocation rule. First-touch rewards ' +
        'discovery, last-touch rewards closing, and the models in between are compromises between ' +
        'those two political positions. Run all six, show the spread, and let the spread be the ' +
        'finding.',
      ),
      key(
        'Every attribution model above is correlational. None of them establishes that the spend ' +
        'caused the revenue. Only a holdout does — and knowing that is the difference between an ' +
        'analyst and a dashboard.',
      ),
    ],
    visual: {
      kind: 'cohort-matrix',
      title: 'The cohort matrix, live',
      caption:
        'Twelve acquisition cohorts by month of age. Toggle between classic and rolling ' +
        'retention, and between customer counts and revenue, to watch the same data tell three ' +
        'different stories.',
    },
    examples: [
      {
        title: 'CAC, blended and paid-only',
        question: 'What did a customer cost us — and which number should go on the board slide?',
        sql: `WITH spend AS (
  SELECT SUM(spend) AS paid_spend FROM ad_spend_daily
), new_customers AS (
  SELECT COUNT(*) AS all_new,
         COUNTIF(first_touch_channel IN ('Paid Search', 'Paid Social', 'Display')) AS paid_new
  FROM customers
)
SELECT ROUND(paid_spend, 2) AS paid_spend,
       all_new,
       paid_new,
       ROUND(SAFE_DIVIDE(paid_spend, all_new), 2) AS blended_cac,
       ROUND(SAFE_DIVIDE(paid_spend, paid_new), 2) AS paid_only_cac
FROM spend, new_customers`,
        takeaway:
          'Same spend, two denominators, an $160 difference per customer. Neither number is ' +
          'wrong. Presenting one without naming it is.',
      },
      {
        title: 'The cohort matrix',
        question: 'Do later cohorts come back more often than earlier ones?',
        sql: `WITH cohorts AS (
  SELECT customer_id, DATE_TRUNC(signup_date, MONTH) AS cohort_month FROM customers
), activity AS (
  SELECT customer_id, DATE_TRUNC(order_date, MONTH) AS order_month
  FROM orders WHERE status = 'completed'
), sizes AS (
  SELECT cohort_month, COUNT(*) AS cohort_size FROM cohorts GROUP BY cohort_month
)
SELECT FORMAT_DATE('%Y-%m', c.cohort_month) AS cohort,
       DATE_DIFF(a.order_month, c.cohort_month, MONTH) AS month_index,
       s.cohort_size,
       COUNT(DISTINCT a.customer_id) AS active,
       ROUND(SAFE_DIVIDE(COUNT(DISTINCT a.customer_id), s.cohort_size) * 100, 1) AS retention_pct
FROM cohorts c
JOIN activity a ON a.customer_id = c.customer_id
JOIN sizes s ON s.cohort_month = c.cohort_month
WHERE DATE_DIFF(a.order_month, c.cohort_month, MONTH) BETWEEN 0 AND 5
GROUP BY cohort, month_index, s.cohort_size
ORDER BY cohort, month_index`,
        takeaway:
          'The denominator is `cohort_size` — the cohort at month 0 — on every single row. ' +
          'Dividing by last month\'s survivors instead produces a chart that only ever goes up.',
      },
      {
        title: 'The AOV that describes nobody',
        question: 'Is our average order value the same story on every device?',
        sql: `SELECT device,
       COUNT(*) AS orders,
       ROUND(SUM(gross_revenue), 2) AS revenue,
       ROUND(SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)), 2) AS mean_aov,
       ROUND(bq_median(gross_revenue), 2) AS median_aov
FROM orders
WHERE status = 'completed'
GROUP BY device
ORDER BY revenue DESC`,
        takeaway:
          'Where mean sits well above median, a handful of large orders is carrying the number. ' +
          'Quote the mean to finance and the median to the merchandising team, and say which is which.',
      },
    ],
    playground: {
      prompt:
        'Take the CAC query and change the paid-channel list — add Email, then remove Display. ' +
        'Watch paid-only CAC swing by more than $50 without a dollar of spend changing. That ' +
        'swing is the whole lesson of the day.',
      starter: `SELECT c.first_touch_channel AS channel,
       COUNT(*) AS customers,
       ROUND(SUM(o.gross_revenue), 2) AS revenue_12m,
       ROUND(SAFE_DIVIDE(SUM(o.gross_revenue), COUNT(DISTINCT c.customer_id)), 2) AS revenue_per_customer
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'completed'
GROUP BY channel
ORDER BY revenue_12m DESC`,
    },
    practice: ['11.1', '11.2', '11.3', '11.4', '11.5', '11.6', '11.7', '11.8', '11.9', '11.10',
      '11.12', '11.13', '11.14', '11.15', '11.16', '11.18', '11.19', '11.20', '11.21', '11.22',
      '11.23', '11.24', '11.26', '11.27', '11.28', '11.29'],
    quiz: [
      mcq('d13q1', 'Blended CAC is $192 and paid-only CAC is $352. Which is wrong?',
        ['Blended', 'Paid-only', 'Neither — they have different denominators', 'Both'],
        2,
        'Same numerator, different populations. The error is quoting one without naming it, not computing either.'),
      predict('d13q2', 'Cohort retention is computed as active ÷ previous month\'s actives. What shape does the chart have?',
        `SAFE_DIVIDE(active_month_n, active_month_n_minus_1)`,
        ['A normal decay curve', 'A curve that trends upward over cohort age',
          'A flat line', 'A curve identical to the correct one'],
        1,
        'Survivors are the loyal ones, so month-on-month survival keeps rising. The denominator must be the cohort at month 0 throughout.'),
      mcq('d13q3', 'Platform-reported ROAS is 4.1 and warehouse ROAS is 2.8. What is the first thing you check?',
        ['The orders table is broken', 'The platform\'s attribution window and view-through settings',
          'Your SQL', 'Nothing — platforms are always right'],
        1,
        'A platform claiming more than your warehouse can see usually means view-through credit or a long click window. Check the setting before you accuse anyone\'s data.'),
      mcq('d13q4', 'NRR is 112% and the logo count fell 6% this quarter. What is happening?',
        ['The numbers contradict each other', 'Existing large accounts are expanding while small ones churn',
          'NRR is computed wrong', 'Churn is zero'],
        1,
        'A real and dangerous shape: revenue looks healthy while the customer base concentrates. Report both, always.'),
      order('d13q5', 'Put the MRR bridge in order, from last month to this month.',
        ['Opening MRR', 'New MRR', 'Expansion MRR', 'Reactivation MRR', 'Contraction MRR', 'Churned MRR', 'Closing MRR'],
        'Additions before subtractions is the convention, because it makes the waterfall chart readable. What matters is that the six movements reconcile exactly to the closing balance.'),
    ],
    assessment: {
      passScore: 0.75,
      timeLimitSec: 1500,
      questions: [
        mcq('d13a1', 'Which LTV definition can be compared fairly across cohorts?',
          ['Historical cumulative revenue', 'Revenue at a fixed cohort age',
            'Predicted LTV', 'Total revenue ÷ total customers'],
          1,
          'Only a fixed age removes the bias where older cohorts have had longer to spend. Cohorts too young to have reached that age must be excluded, not zero-filled.'),
        explain('d13a2', 'What does this compute, and what is its flaw?',
          `SAFE_DIVIDE(SUM(gross_revenue), COUNT(DISTINCT customer_id))`,
          ['Historical revenue per customer — biased low because recent signups have had less time',
            'True LTV',
            'AOV',
            'Predicted LTV'],
          0,
          'It is a perfectly good number as long as you call it "revenue per customer to date" and never call it LTV.'),
        mcq('d13a3', 'First-touch gives Paid Social $187k; last-touch gives it $91k. What do you report?',
          ['First-touch — it found the customer', 'Last-touch — it closed the sale',
            'Both, plus the spread, and say the model is a choice', 'The average of the two'],
          2,
          'The spread is the finding. Picking one silently is how a channel gets defunded on the strength of a formatting decision.'),
        mcq('d13a4', 'Activation rate is measured over "users who signed up this month". Late in the month, what happens?',
          ['Nothing', 'It drops, because recent signups have not had time to activate',
            'It rises', 'It becomes undefined'],
          1,
          'Any time-to-event metric measured on a population that includes people who have not had time is biased low. Fix it with a fixed observation window per user.'),
      ],
      exerciseIds: ['11.11', '11.17'],
    },
    challenge: '11.30',
    reflection: [
      'Which metric on your team\'s dashboard has a denominator you could not defend in a meeting today?',
      'When did you last see the same number reported two ways, and how was it resolved?',
      'What would it cost your company to run one real holdout, and what would it be worth?',
    ],
    project: {
      title: 'The executive summary, current period versus prior',
      brief:
        'Build the one query the growth lead runs before every board meeting: seven headline ' +
        'numbers for Q4 against Q3, with the percentage move. Then the channel scorecard that ' +
        'sits underneath it.',
      tasks: [
        task('kpi-current-vs-prior', 'Seven KPIs, Q4 versus Q3',
          'Return `metric`, `q4`, `q3` and `pct_change` for ad spend, revenue, orders, new customers, AOV, blended CAC and blended ROAS. Keep them in that reading order.',
          `WITH spend AS (
  SELECT SUM(CASE WHEN date >= '2024-10-01' THEN spend ELSE 0 END) AS cur,
         SUM(CASE WHEN date <  '2024-10-01' THEN spend ELSE 0 END) AS pri
  FROM ad_spend_daily WHERE date BETWEEN '2024-07-01' AND '2024-12-31'
), rev AS (
  SELECT SUM(CASE WHEN order_date >= '2024-10-01' THEN gross_revenue ELSE 0 END) AS cur,
         SUM(CASE WHEN order_date <  '2024-10-01' THEN gross_revenue ELSE 0 END) AS pri
  FROM orders WHERE status = 'completed' AND order_date BETWEEN '2024-07-01' AND '2024-12-31'
), ords AS (
  SELECT COUNTIF(order_date >= '2024-10-01') AS cur, COUNTIF(order_date < '2024-10-01') AS pri
  FROM orders WHERE status = 'completed' AND order_date BETWEEN '2024-07-01' AND '2024-12-31'
), news AS (
  SELECT COUNTIF(signup_date >= '2024-10-01') AS cur, COUNTIF(signup_date < '2024-10-01') AS pri
  FROM customers WHERE signup_date BETWEEN '2024-07-01' AND '2024-12-31'
), stacked AS (
  SELECT 'Ad spend' AS metric, spend.cur AS cur, spend.pri AS pri, 1 AS sort_key FROM spend
  UNION ALL SELECT 'Revenue', rev.cur, rev.pri, 2 FROM rev
  UNION ALL SELECT 'Orders', ords.cur, ords.pri, 3 FROM ords
  UNION ALL SELECT 'New customers', news.cur, news.pri, 4 FROM news
  UNION ALL SELECT 'AOV', SAFE_DIVIDE(rev.cur, ords.cur), SAFE_DIVIDE(rev.pri, ords.pri), 5 FROM rev, ords
  UNION ALL SELECT 'Blended CAC', SAFE_DIVIDE(spend.cur, news.cur), SAFE_DIVIDE(spend.pri, news.pri), 6 FROM spend, news
  UNION ALL SELECT 'Blended ROAS', SAFE_DIVIDE(rev.cur, spend.cur), SAFE_DIVIDE(rev.pri, spend.pri), 7 FROM rev, spend
)
SELECT metric,
       ROUND(cur, 2) AS q4,
       ROUND(pri, 2) AS q3,
       ROUND(SAFE_DIVIDE(cur - pri, pri) * 100, 1) AS pct_change
FROM stacked
ORDER BY sort_key`,
          ['One CTE per base measure, each returning a current and a prior value.',
            'Conditional aggregation gets both periods from one scan of each table.',
            'Derived metrics like AOV are ratios of the CTEs, not new scans.',
            'Carry a sort_key so the slide reads in the order you intend, not alphabetically.'],
          {
            orderMatters: true,
            note:
              'Spend rose 13.5% and revenue rose 22.2%, so blended ROAS improved — but new ' +
              'customers only rose 6.7%, so blended CAC rose too. The quarter was good for ' +
              'revenue and mediocre for acquisition, and only the two together tell you that.',
          }),
        task('channel-scorecard', 'The channel scorecard underneath it',
          'Return `channel`, `spend`, `customers`, `cac`, `revenue_per_customer`, `ltv_to_cac` and `payback_months` for the paid channels, best LTV:CAC first. Attribute customers by first touch.',
          `WITH s AS (
  SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel
), a AS (
  SELECT first_touch_channel AS channel, COUNT(*) AS customers FROM customers GROUP BY first_touch_channel
), r AS (
  SELECT c.first_touch_channel AS channel, SUM(o.gross_revenue) AS revenue
  FROM orders o
  JOIN customers c ON c.customer_id = o.customer_id
  WHERE o.status = 'completed'
  GROUP BY c.first_touch_channel
)
SELECT s.channel,
       ROUND(s.spend, 2) AS spend,
       a.customers,
       ROUND(SAFE_DIVIDE(s.spend, a.customers), 2) AS cac,
       ROUND(SAFE_DIVIDE(r.revenue, a.customers), 2) AS revenue_per_customer,
       ROUND(SAFE_DIVIDE(r.revenue, s.spend), 2) AS ltv_to_cac,
       ROUND(SAFE_DIVIDE(s.spend * 12.0, r.revenue), 1) AS payback_months
FROM s
JOIN a ON a.channel = s.channel
JOIN r ON r.channel = s.channel
ORDER BY ltv_to_cac DESC, s.channel`,
          ['Three CTEs at three different grains, joined on the channel label.',
            'CAC is that channel\'s spend over the customers whose *first* touch was that channel.',
            'Payback months is CAC divided by monthly revenue per customer, which simplifies to 12 × spend ÷ revenue.',
            'The revenue here covers twelve months only — say so when you present it.'],
          {
            orderMatters: true,
            note:
              'Both paid channels come out below 1.0 on LTV:CAC. Before you recommend cutting ' +
              'the budget, notice three things: the revenue window is capped at twelve months, ' +
              'first-touch attribution gives paid none of the credit for customers it merely ' +
              'introduced, and the denominator counts every first-touch customer rather than ' +
              'only the ones who bought. Any of the three could move the ratio above 1.',
          }),
      ],
    },
  },

  // ═════════════════════════════════════════════════════════ DAY 14 ══
  {
    day: 14,
    module: 12,
    moduleTitle: 'Thinking like an analyst',
    title: 'The number you would defend',
    subtitle: 'Judgement is the last thing you learn and the first thing you are paid for',
    objective:
      'Interrogate a result before anyone else does, and present it so the decision it supports is obvious.',
    estimatedMinutes: 120,
    concepts: ['grain', 'rate-metrics', 'segmentation', 'attribution', 'cost-optimisation'],
    theory: [
      h('You now know enough SQL. That was the easy part.'),
      p(
        'Thirteen days built a toolkit. Today is about the thing that decides whether anyone acts ' +
        'on your work: whether the number survives contact with someone who wants it to be wrong.',
      ),
      h('Choose the grain before you write a line'),
      p(
        'Before any query, answer out loud: **what is one row of my answer?** One row per ' +
        'campaign? Per campaign-day? Per customer? Almost every wrong number in analytics is a ' +
        'grain mistake wearing a costume — a fan-out that double-counted revenue, an average of ' +
        'averages, a cohort divided by the wrong denominator.',
      ),
      key(
        'If you cannot say what one row of your result represents, you cannot say what the number ' +
        'means either.',
      ),
      h('Sanity-check every number three ways'),
      list([
        '**Magnitude.** Is it the right order of magnitude? A $2.4M month for a company doing $300k is not a great month, it is a join bug.',
        '**A second path.** Compute it from a different table. Revenue from `orders`, from `order_items`, from GA4 purchase events. They will differ; you should be able to say why each gap exists.',
        '**A known slice.** Pick a customer or a day you can verify by hand and check the row.',
      ], true),
      p(
        'In this warehouse those three revenue paths differ by a few percent, and every gap has a ' +
        'named cause: duplicate orders from a webhook replay, refunds carried as negative rows, ' +
        'and GA4 missing the orders placed by phone. An analyst who can recite that list is ' +
        'trusted. One who cannot is checked.',
      ),
      h('Simpson\'s paradox is not a curiosity'),
      p(
        'A channel can lose on every device and still win overall, purely because of the mix. ' +
        'Whenever you compare two segments, ask what else differs between them — and if the ' +
        'headline flips when you split, the split is the story.',
      ),
      compare(
        'The aggregate',
        "SELECT channel, AVG(gross_revenue) AS aov\nFROM orders\nWHERE status = 'completed'\nGROUP BY channel",
        'The same data, split',
        "SELECT device, channel, AVG(gross_revenue) AS aov\nFROM orders\nWHERE status = 'completed'\nGROUP BY device, channel",
        'Any time a ranking survives the aggregate but flips inside a segment, the aggregate was describing the mix rather than the channels. Check before you publish, not after somebody else does.',
      ),
      h('Small samples lie loudly'),
      p(
        'Sort any rate metric descending and the top of the list is noise: the campaign with four ' +
        'clicks and one conversion has a 25% conversion rate. Guard every rate with a volume ' +
        'threshold, and show the volume next to the rate so the reader can apply their own.',
      ),
      call(
        'info',
        'A rule of thumb, not a law',
        'Below roughly 100 trials, treat a rate as a rumour. Below 30, do not report it at all — ' +
        'report the counts. And when you do apply a threshold, say what it was.',
      ),
      h('Directionally useful, numerically wrong'),
      p(
        'Attribution is the canonical example. No model is correct, but the *changes* in a ' +
        'consistently-computed model still carry signal. Learn to say the sentence: "this number ' +
        'is not accurate, and it is still the best available comparison, and here is what it can ' +
        'and cannot support."',
      ),
      table(
        ['Claim', 'Supported by attribution?'],
        [
          ['Paid Social drove more first touches than Paid Search', 'Yes — it is a count of touches.'],
          ['Paid Social generated $187k of revenue', 'No. It received $187k of *allocated* credit under one rule.'],
          ['Cutting Paid Social would cost us $187k', 'No. That requires a holdout, or at minimum a geo test.'],
          ['Paid Social\'s share of first touches fell 20% this quarter', 'Yes, if the model did not change.'],
        ],
      ),
      h('Presenting to a CMO'),
      list([
        'Lead with the decision, not the method. "Shift £40k from Display to Search" beats "I ran a cohort analysis".',
        'One number per slide, with its comparison. A number without a benchmark is trivia.',
        'Name the definition in one line. "New customer = first completed order, attributed by first touch."',
        'Show the caveat before they find it. Volunteering the weakness is what makes the rest credible.',
        'Say what would change your mind. It converts a report into a proposal.',
      ]),
      h('Readable SQL is a professional obligation'),
      p(
        'Your query will be read by someone under pressure, possibly you in six months. CTEs with ' +
        'names that state their grain, one concept per CTE, filters as early as possible, and a ' +
        'comment on every business rule that is not self-evident. Clever SQL that nobody can ' +
        'audit is not an asset.',
      ),
      key(
        'The analyst\'s job is not to produce numbers. It is to produce numbers somebody can act ' +
        'on without being lied to — including by accident.',
      ),
      h('Tomorrow: the capstone'),
      p(
        'You become Growth Analyst at Northbeam, a mid-market SaaS and e-commerce company running ' +
        'on this exact warehouse. One hundred business questions across eight sections — data ' +
        'quality, acquisition, funnel, revenue, customers, subscriptions, attribution, and the ' +
        'board deck. Every one of them has a "so what", because that is the part of the job that ' +
        'is not SQL.',
      ),
    ],
    visual: {
      kind: 'attribution-compare',
      title: 'One dataset, six answers',
      caption:
        'The same 5,200 converting journeys under first-touch, last-touch, last-non-direct, ' +
        'linear, time-decay and position-based. Watch Direct swing from $9.8k to $174k without a ' +
        'single row of data changing.',
    },
    examples: [
      {
        title: 'The mix, not the channels',
        question: 'Which paid channel has the higher AOV — and does the answer hold per device?',
        sql: `SELECT device, channel,
       COUNT(*) AS orders,
       ROUND(SUM(gross_revenue), 2) AS revenue,
       ROUND(SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)), 2) AS aov
FROM orders
WHERE status = 'completed' AND channel IN ('Paid Search', 'Paid Social')
GROUP BY device, channel
ORDER BY device, channel`,
        takeaway:
          'Read the pairs within each device before you read the totals. Whenever a ranking is ' +
          'consistent inside every segment but reverses in aggregate, you have found the mix ' +
          'effect — and the mix is what you should be talking about.',
      },
      {
        title: 'Guard the rate with the volume',
        question: 'Which Google campaigns really convert best?',
        sql: `SELECT campaign_id,
       SUM(clicks) AS clicks,
       ROUND(SUM(conversions), 2) AS conversions,
       ROUND(SAFE_DIVIDE(SUM(conversions), SUM(clicks)) * 100, 2) AS cvr_pct
FROM google_ads_daily
GROUP BY campaign_id
HAVING SUM(clicks) >= 500
ORDER BY cvr_pct DESC
LIMIT 10`,
        takeaway:
          'Drop the HAVING and the leaderboard fills with campaigns nobody has heard of. The ' +
          'threshold is a judgement call, which is exactly why it belongs in the output — ' +
          '`clicks` sits next to `cvr_pct` so the reader can raise the bar themselves.',
      },
      {
        title: 'Three paths to one revenue number',
        question: 'What was 2024 revenue, and can I prove it?',
        sql: `SELECT
  (SELECT ROUND(SUM(gross_revenue), 2) FROM orders WHERE status = 'completed') AS from_orders,
  (SELECT ROUND(SUM(oi.quantity * oi.unit_price), 2)
   FROM order_items oi JOIN orders o ON o.order_id = oi.order_id
   WHERE o.status = 'completed') AS from_line_items,
  (SELECT ROUND(SUM(ecommerce.purchase_revenue), 2)
   FROM ga4_events WHERE event_name = 'purchase') AS from_ga4`,
        takeaway:
          'Three numbers, three definitions, three legitimate reasons to differ — duplicated ' +
          'orders inflate the line-item path, discounts and shipping separate orders from items, ' +
          'and GA4 never sees an offline order. Publish the one you can explain.',
      },
    ],
    playground: {
      prompt:
        'Take any query you wrote this fortnight and interrogate it: state the grain of one row, ' +
        'compute the headline number a second way, and add the volume column next to every rate. ' +
        'If any of the three is awkward, that is the part a reviewer will attack.',
      starter: `-- What is one row of this result? Write the answer down before you run it.
SELECT c.first_touch_channel AS channel,
       COUNT(DISTINCT c.customer_id) AS customers,
       COUNT(o.order_id) AS orders,
       ROUND(SUM(o.gross_revenue), 2) AS revenue
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = 'completed'
GROUP BY channel
ORDER BY revenue DESC`,
    },
    practice: ['12.1', '12.3', '12.5'],
    quiz: [
      mcq('d14q1', 'What is the first question to answer before writing a query?',
        ['Which tables do I need?', 'What does one row of my answer represent?',
          'Which joins?', 'How fast will it run?'],
        1,
        'The grain determines the joins, the GROUP BY and every denominator. Deciding it last is how double-counted revenue happens.'),
      predict('d14q2', 'A campaign has 4 clicks and 1 conversion. Where does it rank?',
        `ORDER BY SAFE_DIVIDE(SUM(conversions), SUM(clicks)) DESC`,
        ['Near the bottom', 'At the top, with a 25% conversion rate',
          'It is excluded', 'It errors'],
        1,
        'Unguarded rate rankings are noise rankings. Add a volume floor, and show the volume so the reader can judge it.'),
      mcq('d14q3', 'Attribution says Paid Social generated $187k. Which claim is safe?',
        ['Cutting it would cost $187k', 'It caused $187k of revenue',
          'It received $187k of credit under this model', 'It is our best channel'],
        2,
        'Allocation is not causation. Only the third sentence is defensible without an experiment.'),
      mcq('d14q4', 'Revenue from `orders` and from `order_items` differ by 3%. What do you do?',
        ['Use the bigger one', 'Average them',
          'Find the cause — duplicates, discounts, shipping — and then choose', 'Report both and let the reader decide'],
        2,
        'An unexplained gap is a bug you have not found yet. Explain it first; then a single, defended number is worth more than two hedged ones.'),
      order('d14q5', 'Order the steps of publishing a number you will be asked about.',
        ['Decide the grain', 'Write the query', 'Sanity-check the magnitude',
          'Reproduce it a second way', 'Segment it to check for a mix effect',
          'Write the one-line definition', 'Send it with its caveat'],
        'The checks come after the query and before the send. Every one of them is cheaper now than in the meeting.'),
    ],
    assessment: {
      passScore: 0.75,
      timeLimitSec: 1500,
      questions: [
        mcq('d14a1', 'Paid Search beats Paid Social on AOV for every device, but loses overall. What happened?',
          ['A bug', 'Simpson\'s paradox — the device mix differs between the channels',
            'Rounding', 'The data is wrong'],
          1,
          'The aggregate is describing the mix, not the channels. The segmented view is the true comparison and the mix itself is a finding.'),
        explain('d14a2', 'A stakeholder asks for "conversion rate". What do you ask back?',
          `SAFE_DIVIDE(conversions, ???)`,
          ['Nothing — use sessions', 'Which denominator: sessions, users, new users or engaged sessions?',
            'Use users', 'Use clicks'],
          1,
          'All four are defensible and they differ by multiples. Choosing silently means the next person to compute it will disagree with you.'),
        mcq('d14a3', 'Your query is correct but nobody can read it. What is the professional position?',
          ['Correctness is all that matters', 'Add comments later',
            'Unauditable SQL is not finished work', 'Rewrite it in a BI tool'],
          2,
          'A number nobody can verify is a number nobody should act on. Naming CTEs after their grain does most of the work.'),
        mcq('d14a4', 'What is the honest way to present an attribution comparison?',
          ['Pick the model that supports the recommendation',
            'Show every model, state the spread, and say the model is a choice',
            'Use last-touch because it is standard', 'Average all six'],
          1,
          'The spread is the finding. Averaging six arbitrary rules produces a seventh arbitrary rule with the disadvantage of looking authoritative.'),
      ],
      exerciseIds: ['12.2', '12.4'],
    },
    challenge: '12.6',
    reflection: [
      'Which number that you have published in the past would not survive the three-way sanity check?',
      'What is the one caveat you always leave out because it is inconvenient?',
      'Write the sentence you would use to tell a CMO that the number they love is directionally useful and numerically wrong.',
    ],
    project: {
      title: 'Capstone kickoff — the data-quality memo and the attribution spread',
      brief:
        'Before you answer a hundred business questions on this warehouse, audit it. Produce the ' +
        'data-quality memo you would send on your first day, and the attribution comparison that ' +
        'stops the first argument before it starts.',
      tasks: [
        task('quality-memo', 'The first-day data-quality audit',
          'Return `check_name` and `rows_affected` for six known defects in this warehouse, worst first: duplicate order ids, orders pointing at a campaign that does not exist, keywords with no quality score, internal QA sessions, orders with negative revenue, and customer cities that need normalising.',
          `SELECT 'duplicate order_ids' AS check_name, COUNT(*) AS rows_affected
FROM (SELECT order_id FROM orders GROUP BY order_id HAVING COUNT(*) > 1)
UNION ALL
SELECT 'orders with an orphan campaign_id', COUNT(*) FROM orders o
WHERE o.campaign_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM google_ads_campaigns g WHERE g.campaign_id = o.campaign_id)
  AND NOT EXISTS (SELECT 1 FROM meta_ads_campaigns m WHERE m.campaign_id = o.campaign_id)
  AND NOT EXISTS (SELECT 1 FROM linkedin_ads_campaigns l WHERE l.campaign_id = o.campaign_id)
UNION ALL
SELECT 'keywords with no quality_score', COUNT(*) FROM google_ads_keywords WHERE quality_score IS NULL
UNION ALL
SELECT 'internal QA sessions', COUNT(*) FROM ga4_sessions WHERE source = 'internal-qa'
UNION ALL
SELECT 'orders with negative gross_revenue', COUNT(*) FROM orders WHERE gross_revenue < 0
UNION ALL
SELECT 'customer cities needing normalisation', COUNT(*) FROM customers WHERE city <> INITCAP(TRIM(city))
ORDER BY rows_affected DESC, check_name`,
          ['A UNION ALL of one-row checks; the first branch names the output columns.',
            'An orphan is an id with no matching row in any of the three campaign tables — NOT EXISTS three times.',
            'A city is messy if it differs from its own trimmed, title-cased form.',
            'None of these are bugs to fix. They are facts to know before you quote a number.'],
          {
            orderMatters: true,
            note:
              'Every one of these is deliberate, and every one of them will change a number ' +
              'somebody asks you for. The 391 negative-revenue rows are refunds — include them ' +
              'and revenue is net, exclude them and it is gross. The 26 duplicate order ids ' +
              'inflate any count that joins through orders. Knowing the list is what lets you ' +
              'answer "why is your number different?" in one sentence.',
          }),
        task('attribution-spread', 'Six attribution models, side by side',
          'Return `channel` plus `first_touch`, `last_touch`, `last_non_direct`, `linear`, `time_decay` and `position_based` — the revenue each model allocates to each channel across all converting journeys. Order by last-touch credit descending.',
          `WITH t AS (
  SELECT user_pseudo_id AS uid, channel, touch_position AS pos, journey_length AS n,
         conversion_value AS v, touch_ts,
         MAX(touch_ts) OVER (PARTITION BY user_pseudo_id) AS conv_ts,
         MAX(CASE WHEN channel <> 'Direct' THEN touch_position END)
           OVER (PARTITION BY user_pseudo_id) AS last_nd
  FROM attribution_touchpoints
  WHERE converted = 1
), w AS (
  SELECT uid, channel, v,
         CASE WHEN pos = 1 THEN 1.0 ELSE 0.0 END AS w_first,
         CASE WHEN pos = n THEN 1.0 ELSE 0.0 END AS w_last,
         CASE WHEN pos = COALESCE(last_nd, n) THEN 1.0 ELSE 0.0 END AS w_lnd,
         1.0 / n AS w_linear,
         POW(0.5, DATE_DIFF(DATE(conv_ts), DATE(touch_ts), DAY) / 7.0) AS w_decay_raw,
         CASE WHEN n = 1 THEN 1.0
              WHEN n = 2 THEN 0.5
              WHEN pos = 1 OR pos = n THEN 0.4
              ELSE 0.2 / (n - 2) END AS w_position
  FROM t
), normalised AS (
  SELECT w.*, SUM(w_decay_raw) OVER (PARTITION BY uid) AS decay_total FROM w
)
SELECT channel,
       ROUND(SUM(v * w_first), 0) AS first_touch,
       ROUND(SUM(v * w_last), 0) AS last_touch,
       ROUND(SUM(v * w_lnd), 0) AS last_non_direct,
       ROUND(SUM(v * w_linear), 0) AS linear,
       ROUND(SUM(v * SAFE_DIVIDE(w_decay_raw, decay_total)), 0) AS time_decay,
       ROUND(SUM(v * w_position), 0) AS position_based
FROM normalised
GROUP BY channel
ORDER BY last_touch DESC, channel`,
          ['Every model is a weight per touch; compute all six weights in one CTE, then aggregate once.',
            'The conversion timestamp is the journey\'s last touch — a window MAX over the journey.',
            'Last-non-direct needs the highest non-Direct position in the journey, falling back to the last touch when the whole journey is Direct.',
            'Time-decay weights must be normalised to sum to 1 within each journey, or you will allocate more revenue than exists.',
            'Position-based is 40/20/40, with special cases for journeys of length 1 and 2.'],
          {
            orderMatters: true,
            note:
              'Direct receives $174k under last-touch and $9.8k under last-non-direct — an ' +
              'eighteen-fold swing driven entirely by a rule, not by data. Paid Social is worth ' +
              '$187k on first touch and $91k on last. Present this table before anyone picks a ' +
              'model, and the conversation becomes about which rule fits the business rather ' +
              'than whose channel is winning.',
          }),
      ],
    },
  },
];
