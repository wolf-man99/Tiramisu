import type { Cheatsheet, CheatsheetEntry } from './types';

/**
 * Six interactive cheatsheets.
 *
 * Every entry's `example` is executable against the warehouse — the validator runs
 * them, and the UI offers a one-click "open in playground". A cheatsheet whose
 * snippets do not run is a liability, not a reference.
 */

const e = (
  id: string,
  name: string,
  syntax: string,
  description: string,
  example: string,
  useCase: string,
  concepts: string[],
): CheatsheetEntry => ({ id, name, syntax, description, example: example.trim(), useCase, concepts });

export const CHEATSHEETS: Cheatsheet[] = [
  {
    slug: 'sql',
    title: 'SQL cheatsheet',
    subtitle: 'The clauses, in the order the database runs them',
    groups: [
      {
        name: 'Query shape',
        entries: [
          e('select', 'SELECT', 'SELECT col1, col2 FROM table',
            'Chooses which columns come back. Runs fifth, after WHERE and GROUP BY — which is why a SELECT alias cannot be used in WHERE.',
            'SELECT campaign_name, daily_budget FROM google_ads_campaigns LIMIT 5',
            'Any report. Naming columns instead of * is also what keeps BigQuery cheap.',
            ['select']),
          e('alias', 'AS', 'SELECT expr AS name',
            'Renames a column in the output. Quote the alias if it contains spaces.',
            'SELECT campaign_name AS "Campaign", daily_budget AS "Budget" FROM google_ads_campaigns LIMIT 5',
            'Making a query result readable by someone who is not you.',
            ['alias']),
          e('where', 'WHERE', 'WHERE condition',
            'Filters rows before grouping. Cannot see aggregates or SELECT aliases.',
            "SELECT campaign_name FROM google_ads_campaigns WHERE channel_type = 'SEARCH'",
            'Restricting to a date range, a market, or a status.',
            ['where']),
          e('groupby', 'GROUP BY', 'GROUP BY col',
            'Collapses rows into one per distinct value. Every non-aggregated SELECT column must appear here.',
            'SELECT channel, COUNT(*) AS orders FROM orders GROUP BY channel',
            'Every "by channel", "by month", "by campaign" report.',
            ['group-by']),
          e('having', 'HAVING', 'HAVING aggregate_condition',
            'Filters groups after aggregation. Use it for thresholds on sums and counts; use WHERE for row conditions.',
            'SELECT campaign_id, SUM(cost) AS spend FROM google_ads_daily GROUP BY campaign_id HAVING SUM(cost) > 20000',
            'Minimum-volume thresholds so rates are meaningful.',
            ['having']),
          e('orderby', 'ORDER BY', 'ORDER BY col [ASC|DESC]',
            'Sorts the result. Can use SELECT aliases, because it runs after SELECT. Always add a tie-break for reproducibility.',
            'SELECT campaign_name, daily_budget FROM google_ads_campaigns ORDER BY daily_budget DESC, campaign_name LIMIT 5',
            'Any "top N" question.',
            ['order-by']),
          e('limit', 'LIMIT', 'LIMIT n',
            'Keeps the first n rows after sorting. Does NOT reduce bytes scanned in BigQuery.',
            'SELECT * FROM products LIMIT 3',
            'Previewing a table. Never as a cost-control measure.',
            ['limit']),
          e('distinct', 'DISTINCT', 'SELECT DISTINCT col1, col2',
            'Removes duplicate rows across the whole select list — distinct *combinations*, not distinct columns.',
            'SELECT DISTINCT channel_type, country FROM google_ads_campaigns ORDER BY channel_type, country',
            'Finding what values exist before you write a filter.',
            ['distinct']),
        ],
      },
      {
        name: 'Filtering',
        entries: [
          e('in', 'IN', 'col IN (a, b, c)',
            'Shorthand for a chain of ORs. Same plan, fewer bracket mistakes.',
            "SELECT campaign_name FROM google_ads_campaigns WHERE channel_type IN ('PMAX', 'SHOPPING')",
            'Filtering to a known list of channels or markets.',
            ['in']),
          e('between', 'BETWEEN', 'col BETWEEN a AND b',
            'Inclusive on both ends. `BETWEEN \'2024-03-01\' AND \'2024-04-01\'` includes one day of April.',
            "SELECT COUNT(*) AS n FROM orders WHERE order_date BETWEEN '2024-03-01' AND '2024-03-31'",
            'Date ranges. Watch the upper bound.',
            ['between']),
          e('like', 'LIKE', "col LIKE 'pattern'",
            '`%` matches any run of characters, `_` matches exactly one. A literal underscore needs escaping.',
            "SELECT DISTINCT keyword_text FROM google_ads_keywords WHERE keyword_text LIKE '%shoes%' ORDER BY keyword_text LIMIT 10",
            'Finding keywords or campaigns by fragment.',
            ['like']),
          e('isnull', 'IS NULL', 'col IS NULL',
            'The only operator that can see a NULL. `= NULL` is never true, and `!= x` silently drops NULL rows.',
            'SELECT COUNT(*) AS unscored FROM google_ads_keywords WHERE quality_score IS NULL',
            'Finding missing data — and remembering it exists.',
            ['null-handling']),
          e('notin-null', 'NOT IN + NULL', 'col NOT IN (SELECT … WHERE col IS NOT NULL)',
            'NOT IN against a list containing a NULL returns nothing, always, silently. Guard the subquery or use NOT EXISTS.',
            `SELECT COUNT(*) AS n FROM google_ads_campaigns
WHERE campaign_id NOT IN (SELECT campaign_id FROM orders WHERE campaign_id IS NOT NULL)`,
            'Anti-joins written as subqueries.',
            ['in', 'null-handling']),
        ],
      },
      {
        name: 'Aggregates',
        entries: [
          e('count', 'COUNT', 'COUNT(*) | COUNT(col) | COUNT(DISTINCT col)',
            'COUNT(*) counts rows. COUNT(col) skips NULLs. COUNT(DISTINCT col) counts unique non-NULL values. Three different numbers.',
            'SELECT COUNT(*) AS events, COUNT(user_id) AS identified, COUNT(DISTINCT user_id) AS users FROM ga4_events',
            'Any "how many" question — say which one you meant.',
            ['count']),
          e('sum-avg', 'SUM / AVG', 'SUM(col), AVG(col)',
            'AVG ignores NULLs, which shrinks the denominator silently. If missing means zero, COALESCE first.',
            'SELECT AVG(quality_score) AS avg_scored, AVG(COALESCE(quality_score, 0)) AS avg_with_zeros FROM google_ads_keywords',
            'Totals and averages, with the NULL question answered explicitly.',
            ['sum', 'avg']),
          e('countif', 'COUNTIF', 'COUNTIF(condition)',
            'Counts rows matching a condition. BigQuery shorthand for COUNT(CASE WHEN cond THEN 1 END), and returns 0 rather than NULL on empty input.',
            "SELECT COUNTIF(status = 'refunded') AS refunds, COUNT(*) AS orders FROM orders",
            'Conditional counts without a CASE.',
            ['countif']),
          e('rate', 'Weighted rate', 'SAFE_DIVIDE(SUM(a), SUM(b))',
            'A rate is a ratio of sums, never a mean of ratios. AVG(a/b) weights a 12-impression day the same as a 40,000-impression one.',
            `SELECT SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS weighted_ctr,
       AVG(SAFE_DIVIDE(clicks, impressions)) AS misleading_ctr
FROM google_ads_daily`,
            'CTR, CVR, margin — every rate metric you will ever report.',
            ['rate-metrics', 'safe-divide']),
          e('pivot', 'Conditional aggregation', 'SUM(CASE WHEN cond THEN x ELSE 0 END)',
            'Turns rows into columns. Everything you would build with a spreadsheet pivot table is this plus a GROUP BY.',
            `SELECT channel,
       SUM(CASE WHEN device = 'mobile' THEN gross_revenue ELSE 0 END) AS mobile,
       SUM(CASE WHEN device = 'desktop' THEN gross_revenue ELSE 0 END) AS desktop
FROM orders WHERE status = 'completed' GROUP BY channel`,
            'Any cross-tab: revenue by channel × device, funnel steps as columns.',
            ['pivot', 'conditional-aggregation']),
        ],
      },
      {
        name: 'Structure',
        entries: [
          e('cte', 'WITH (CTE)', 'WITH name AS (…) SELECT … FROM name',
            'A named intermediate result. Does not make the query faster — makes it readable, and lets you reference the same result twice.',
            `WITH spend AS (SELECT campaign_id, SUM(cost) AS spend FROM google_ads_daily GROUP BY campaign_id)
SELECT campaign_id, spend FROM spend WHERE spend > (SELECT AVG(spend) FROM spend) ORDER BY spend DESC LIMIT 5`,
            'Any answer with more than one step.',
            ['cte']),
          e('scalar', 'Scalar subquery', '(SELECT agg FROM t)',
            'A query returning exactly one value can be used anywhere a value can. Evaluated once, not per row.',
            `SELECT channel, SUM(gross_revenue) AS revenue,
       SAFE_DIVIDE(SUM(gross_revenue), (SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed')) AS share
FROM orders WHERE status = 'completed' GROUP BY channel`,
            'Percent-of-total, and putting unrelated aggregates on one row.',
            ['subquery', 'percent-of-total']),
          e('exists', 'EXISTS', 'WHERE EXISTS (SELECT 1 FROM … WHERE …)',
            'Asks whether the subquery returns any row. The safe form of IN — NULLs cannot break it.',
            `SELECT COUNT(*) AS buyers FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id AND o.status = 'completed')`,
            'Anti-joins and "has at least one" questions.',
            ['exists']),
        ],
      },
    ],
  },

  {
    slug: 'joins',
    title: 'JOIN cheatsheet',
    subtitle: 'Six join types and the two bugs that cost the most',
    groups: [
      {
        name: 'Join types',
        entries: [
          e('inner', 'INNER JOIN', 'FROM a JOIN b ON a.k = b.k',
            'Keeps only rows that match on both sides. The default, and the one that silently deletes data.',
            `SELECT c.campaign_name, SUM(d.cost) AS spend
FROM google_ads_daily d JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
GROUP BY c.campaign_name ORDER BY spend DESC LIMIT 5`,
            'Attaching a dimension label to a fact row.',
            ['inner-join']),
          e('left', 'LEFT JOIN', 'FROM a LEFT JOIN b ON a.k = b.k',
            'Keeps every row from the left table, filling the right side with NULLs when nothing matches.',
            `SELECT p.product_name, COALESCE(SUM(i.quantity), 0) AS units
FROM products p LEFT JOIN order_items i ON i.product_id = p.product_id
GROUP BY p.product_name ORDER BY units LIMIT 5`,
            '"All X, with their Y" — including the X that have no Y.',
            ['left-join']),
          e('right', 'RIGHT JOIN', 'FROM a RIGHT JOIN b ON a.k = b.k',
            'Mirror of LEFT. Legal and rare — most teams standardise on LEFT because it reads top-to-bottom.',
            `SELECT c.segment, COUNT(DISTINCT c.customer_id) AS customers
FROM orders o RIGHT JOIN customers c ON c.customer_id = o.customer_id
GROUP BY c.segment ORDER BY c.segment`,
            'Rarely. Swap the tables and use LEFT.',
            ['right-join']),
          e('full', 'FULL OUTER JOIN', 'FROM a FULL OUTER JOIN b ON a.k = b.k',
            'Keeps unmatched rows from both sides. The reconciliation join.',
            `SELECT COUNTIF(g.campaign_id IS NOT NULL) AS in_google,
       COUNTIF(m.campaign_id IS NOT NULL) AS in_meta
FROM google_ads_campaigns g FULL OUTER JOIN meta_ads_campaigns m ON m.campaign_id = g.campaign_id`,
            '"What is in system A, what is in B, what is in only one?"',
            ['full-join']),
          e('cross', 'CROSS JOIN', 'FROM a CROSS JOIN b',
            'Every row on the left paired with every row on the right. No ON clause — that is what makes it a cross join.',
            `SELECT c.category, d.device FROM (SELECT DISTINCT category FROM products) c
CROSS JOIN (SELECT DISTINCT device FROM orders) d ORDER BY c.category, d.device LIMIT 6`,
            'Building a complete scaffold — a date spine or a cohort grid.',
            ['cross-join']),
          e('self', 'SELF JOIN', 'FROM t a JOIN t b ON …',
            'Join a table to itself with two aliases. Needs an inequality or you get every pair twice plus self-pairs.',
            `SELECT f.channel AS first_channel, l.channel AS last_channel, COUNT(*) AS journeys
FROM attribution_touchpoints f
JOIN attribution_touchpoints l ON l.user_pseudo_id = f.user_pseudo_id AND l.touch_position = l.journey_length
WHERE f.touch_position = 1 AND f.converted = 1
GROUP BY first_channel, last_channel ORDER BY journeys DESC LIMIT 5`,
            'First-vs-last comparisons, previous-row lookups before you learn LAG.',
            ['self-join']),
        ],
      },
      {
        name: 'Patterns and traps',
        entries: [
          e('anti', 'Anti-join', 'LEFT JOIN … WHERE b.key IS NULL',
            'The way to ask "which of these has none of those?". Not a join type — a pattern.',
            `SELECT c.campaign_id, c.campaign_name
FROM google_ads_campaigns c LEFT JOIN orders o ON o.campaign_id = c.campaign_id
WHERE o.campaign_id IS NULL ORDER BY c.campaign_id`,
            'Campaigns with no orders, customers who never bought, products never sold.',
            ['anti-join']),
          e('on-vs-where', 'ON vs WHERE', 'LEFT JOIN b ON a.k = b.k AND b.cond',
            'A condition on the right table of an outer join belongs in ON. Put it in WHERE and the LEFT JOIN silently becomes an INNER JOIN.',
            `SELECT
  (SELECT COUNT(DISTINCT c.campaign_id) FROM google_ads_campaigns c
   LEFT JOIN orders o ON o.campaign_id = c.campaign_id WHERE o.status = 'completed') AS with_where,
  (SELECT COUNT(DISTINCT c.campaign_id) FROM google_ads_campaigns c
   LEFT JOIN orders o ON o.campaign_id = c.campaign_id AND o.status = 'completed') AS with_on`,
            'The most common JOIN bug in existence, and it fails silently.',
            ['left-join', 'boolean-logic']),
          e('fanout', 'Fan-out', 'aggregate before you join',
            'Joining to a finer grain duplicates the coarse side. Summing a coarse-grain column afterwards inflates it — here by 2.19×.',
            `SELECT
  (SELECT SUM(gross_revenue) FROM orders WHERE status = 'completed') AS correct,
  (SELECT SUM(o.gross_revenue) FROM orders o JOIN order_items i ON i.order_id = o.order_id
   WHERE o.status = 'completed') AS inflated`,
            'Any join between two fact tables. Aggregate each side to a common grain first.',
            ['join-fanout', 'grain']),
          e('spine', 'Date spine', 'FROM date_dim LEFT JOIN facts',
            'Start from a complete calendar so days with no activity appear as zero instead of vanishing.',
            `SELECT d.date, COALESCE(SUM(a.spend), 0) AS spend
FROM date_dim d LEFT JOIN ad_spend_daily a ON a.date = d.date
WHERE d.date BETWEEN '2024-10-01' AND '2024-10-07'
GROUP BY d.date ORDER BY d.date`,
            'Every time series chart. Missing and zero look identical on a line graph.',
            ['date-spine', 'cross-join']),
        ],
      },
    ],
  },

  {
    slug: 'windows',
    title: 'Window function cheatsheet',
    subtitle: 'Compare a row to its group without collapsing the rows',
    groups: [
      {
        name: 'Ranking',
        entries: [
          e('rownumber', 'ROW_NUMBER', 'ROW_NUMBER() OVER (PARTITION BY p ORDER BY o)',
            'Numbers rows 1, 2, 3 within each partition. Never ties — it picks arbitrarily unless you add a tie-break.',
            `SELECT category, product_name, list_price
FROM products
QUALIFY ROW_NUMBER() OVER (PARTITION BY category ORDER BY list_price DESC, product_id) <= 2
ORDER BY category, list_price DESC`,
            'Top-N-per-group, and deduplication.',
            ['row-number']),
          e('rank', 'RANK / DENSE_RANK', 'RANK() OVER (ORDER BY x DESC)',
            'RANK ties then skips (1, 1, 3). DENSE_RANK ties then continues (1, 1, 2). Use them to report a placing, ROW_NUMBER to pick one.',
            `SELECT category, product_name, list_price,
       RANK() OVER (PARTITION BY category ORDER BY list_price DESC) AS rnk,
       DENSE_RANK() OVER (PARTITION BY category ORDER BY list_price DESC) AS dense
FROM products ORDER BY category, list_price DESC LIMIT 10`,
            'Leaderboards where ties should share a position.',
            ['rank', 'dense-rank']),
          e('ntile', 'NTILE', 'NTILE(n) OVER (ORDER BY x)',
            'Splits the ordered rows into n roughly equal buckets.',
            `WITH r AS (SELECT customer_id, lifetime_revenue, NTILE(10) OVER (ORDER BY lifetime_revenue DESC) AS decile FROM customer_ltv)
SELECT decile, COUNT(*) AS customers, SUM(lifetime_revenue) AS revenue FROM r GROUP BY decile ORDER BY decile`,
            'Value deciles, RFM scoring.',
            ['ntile', 'segmentation']),
          e('qualify', 'QUALIFY', 'QUALIFY window_condition',
            'What HAVING is to aggregates, QUALIFY is to window functions. A BigQuery extension; elsewhere use a subquery.',
            `SELECT campaign_id, date, cost FROM (SELECT campaign_id, date, SUM(cost) AS cost FROM google_ads_daily GROUP BY 1,2)
QUALIFY ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY cost DESC) = 1
ORDER BY cost DESC LIMIT 5`,
            'Filtering on a rank without a wrapping subquery.',
            ['qualify']),
        ],
      },
      {
        name: 'Neighbours',
        entries: [
          e('lag', 'LAG / LEAD', 'LAG(col, offset, default) OVER (ORDER BY x)',
            'Reads the previous or next row in the window\'s order. The first row\'s LAG is NULL, which is correct.',
            `WITH m AS (SELECT DATE_TRUNC(order_date, MONTH) AS month, SUM(gross_revenue) AS revenue
           FROM orders WHERE status = 'completed' GROUP BY month)
SELECT month, revenue, LAG(revenue) OVER (ORDER BY month) AS prev_month FROM m ORDER BY month`,
            'Month-over-month, week-over-week, days between orders.',
            ['lag-lead']),
          e('firstlast', 'FIRST_VALUE / LAST_VALUE', 'FIRST_VALUE(col) OVER (PARTITION BY p ORDER BY o)',
            'FIRST_VALUE works with the default frame. LAST_VALUE does NOT — the default frame ends at the current row, so you must widen it.',
            `SELECT campaign_id, date, cost,
       FIRST_VALUE(cost) OVER (PARTITION BY campaign_id ORDER BY date) AS first_day,
       LAST_VALUE(cost) OVER (PARTITION BY campaign_id ORDER BY date
                              ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_day
FROM google_ads_daily ORDER BY campaign_id, date LIMIT 5`,
            'Cohort size (the month-0 value), first and last touch.',
            ['first-last-value']),
        ],
      },
      {
        name: 'Frames',
        entries: [
          e('running', 'Running total', 'SUM(x) OVER (ORDER BY d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)',
            'Adding ORDER BY to a window aggregate makes it cumulative.',
            `WITH m AS (SELECT DATE_TRUNC(order_date, MONTH) AS month, SUM(gross_revenue) AS revenue
           FROM orders WHERE status = 'completed' GROUP BY month)
SELECT month, revenue, SUM(revenue) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative
FROM m ORDER BY month`,
            'Year-to-date revenue, Pareto curves.',
            ['running-total']),
          e('rolling', 'Rolling window', 'SUM(x) OVER (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)',
            'A 7-row window including the current row. Aggregate to one row per day first, or the frame counts rows rather than days.',
            `WITH d AS (SELECT date, SUM(spend) AS spend FROM ad_spend_daily GROUP BY date)
SELECT date, spend, SUM(spend) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7d
FROM d WHERE date BETWEEN '2024-10-01' AND '2024-10-10' ORDER BY date`,
            'Rolling 7-day spend, smoothing out the weekday cycle.',
            ['rolling-window']),
          e('pctoftotal', 'Percent of total', 'SAFE_DIVIDE(x, SUM(x) OVER (PARTITION BY p))',
            'A windowed SUM gives the group total on every row, with no second query and no self-join.',
            `WITH s AS (SELECT c.channel_type, c.campaign_name, SUM(d.cost) AS spend
           FROM google_ads_daily d JOIN google_ads_campaigns c USING (campaign_id)
           GROUP BY 1, 2)
SELECT channel_type, campaign_name, spend,
       SAFE_DIVIDE(spend, SUM(spend) OVER (PARTITION BY channel_type)) AS pct_of_channel
FROM s ORDER BY channel_type, pct_of_channel DESC LIMIT 8`,
            'Share of spend, share of revenue, mix analysis.',
            ['percent-of-total']),
        ],
      },
    ],
  },

  {
    slug: 'bigquery',
    title: 'BigQuery cheatsheet',
    subtitle: 'The dialect, the nested data, and the cost model',
    groups: [
      {
        name: 'Cost',
        entries: [
          e('bytes', 'Bytes scanned', 'SELECT only what you need',
            'On-demand BigQuery bills for bytes scanned, not rows returned. It is columnar, so naming three columns costs a fraction of SELECT *.',
            "SELECT date, campaign_id, cost FROM google_ads_daily WHERE date = '2024-06-14'",
            'Every query. This is the whole cost model.',
            ['cost-optimisation']),
          e('prune', 'Partition pruning', 'WHERE partition_col = value',
            'Filter the partitioning column bare on the left. Any function around it disables pruning and scans everything.',
            `SELECT COUNT(*) AS n FROM ga4_events WHERE event_date BETWEEN '20240601' AND '20240607'`,
            'Every query against a large partitioned table.',
            ['partitioning', 'cost-optimisation']),
          e('cluster', 'Clustering', 'CLUSTER BY col1, col2',
            'Sorts rows within each partition. Helps only if you filter or aggregate on the cluster key, left to right.',
            `SELECT campaign_id, SUM(cost) AS spend FROM google_ads_daily
WHERE date BETWEEN '2024-06-01' AND '2024-06-30' AND campaign_id = 1001 GROUP BY campaign_id`,
            'Narrowing further inside a partition.',
            ['clustering']),
          e('dryrun', 'Dry run', 'bq query --dry_run',
            'Estimates bytes before you spend them. Pair with `maximum_bytes_billed` so a runaway query fails instead of billing you.',
            "SELECT COUNT(*) AS purchases FROM ga4_events WHERE event_date BETWEEN '20241201' AND '20241231' AND event_name = 'purchase'",
            'Before running anything against a table you do not know.',
            ['cost-optimisation']),
        ],
      },
      {
        name: 'Nested data',
        entries: [
          e('struct', 'STRUCT', 'col.field',
            'A nested record — one value with named fields. Reach in with a dot. No UNNEST.',
            'SELECT device.category, geo.country, COUNT(*) AS events FROM ga4_events GROUP BY 1, 2 ORDER BY events DESC LIMIT 5',
            'device, geo, traffic_source, ecommerce in the GA4 export.',
            ['struct']),
          e('unnest', 'UNNEST', 'FROM t, UNNEST(t.arr) AS a',
            'Flattens a repeated field. It is an implicit CROSS JOIN, so it multiplies your row count by the array length — filter first.',
            `SELECT ep.key, COUNT(*) AS n FROM ga4_events e, UNNEST(e.event_params) AS ep
WHERE e.event_name = 'purchase' GROUP BY ep.key ORDER BY n DESC LIMIT 5`,
            'event_params and items in the GA4 export.',
            ['unnest', 'array']),
          e('scalarunnest', 'Scalar subquery over UNNEST', '(SELECT x FROM UNNEST(arr) WHERE key = …)',
            'Pulls one parameter without changing the outer grain. The idiom to memorise for GA4.',
            `SELECT (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'page_location') AS page,
       COUNT(*) AS views
FROM ga4_events e WHERE e.event_name = 'page_view' GROUP BY page ORDER BY views DESC LIMIT 5`,
            'Reading two or more event parameters onto the same row.',
            ['unnest', 'ga4-params']),
          e('genarray', 'GENERATE_DATE_ARRAY', 'UNNEST(GENERATE_DATE_ARRAY(a, b))',
            'Builds a date spine with no table and no bytes scanned.',
            "SELECT d AS day FROM UNNEST(GENERATE_DATE_ARRAY('2024-01-01', '2024-01-07')) AS d ORDER BY day",
            'Time series that must show every day.',
            ['date-spine', 'unnest']),
        ],
      },
      {
        name: 'Dialect',
        entries: [
          e('safedivide', 'SAFE_DIVIDE', 'SAFE_DIVIDE(a, b)',
            'Returns NULL instead of erroring when b is zero. The most useful BigQuery function for marketers.',
            'SELECT SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr FROM google_ads_daily',
            'Every rate metric, because every denominator is sometimes zero.',
            ['safe-divide']),
          e('safecast', 'SAFE_CAST', 'SAFE_CAST(x AS INT64)',
            'Returns NULL instead of erroring on an unconvertible value. CAST truncates; ROUND rounds.',
            'SELECT SAFE_CAST(quality_score AS INT64) AS qs FROM google_ads_keywords LIMIT 5',
            'Parsing values from a source you do not control.',
            ['math-functions']),
          e('datefns', 'Date functions', 'DATE_TRUNC / DATE_DIFF / DATE_ADD',
            'DATE_DIFF takes the LATER date first. DATE_ADD needs the INTERVAL keyword.',
            `SELECT DATE_TRUNC(order_date, MONTH) AS month,
       AVG(DATE_DIFF(DATE '2024-12-31', order_date, DAY)) AS avg_age_days,
       MAX(DATE_ADD(order_date, INTERVAL 30 DAY)) AS latest_plus_30
FROM orders GROUP BY month ORDER BY month LIMIT 5`,
            'Every time-based report.',
            ['date-functions', 'date-diff', 'date-trunc']),
          e('parsedate', 'PARSE_DATE / FORMAT_DATE', "PARSE_DATE('%Y%m%d', s)",
            'Converts between text and DATE. GA4 stores event_date as a YYYYMMDD string on purpose — it sorts correctly and prunes cheaply.',
            `SELECT event_date, PARSE_DATE('%Y%m%d', event_date) AS d,
       FORMAT_DATE('%b %Y', PARSE_DATE('%Y%m%d', event_date)) AS label
FROM ga4_events GROUP BY event_date, d, label ORDER BY event_date LIMIT 5`,
            'The GA4 export, and any date arriving as text.',
            ['date-functions', 'ga4-schema']),
          e('tsmicros', 'TIMESTAMP_MICROS', 'TIMESTAMP_MICROS(event_timestamp)',
            'GA4\'s event_timestamp is MICROseconds. Using TIMESTAMP_SECONDS gives you dates in the wrong millennium.',
            `SELECT EXTRACT(HOUR FROM TIMESTAMP_MICROS(event_timestamp)) AS hour, COUNT(*) AS n
FROM ga4_events WHERE event_name = 'purchase' GROUP BY hour ORDER BY hour LIMIT 6`,
            'Any hour-of-day or session-duration analysis on GA4.',
            ['date-functions', 'ga4-schema']),
        ],
      },
    ],
  },

  {
    slug: 'dates',
    title: 'Date function cheatsheet',
    subtitle: 'Truncating, differencing, formatting and spining',
    groups: [
      {
        name: 'Bucketing',
        entries: [
          e('trunc', 'DATE_TRUNC', 'DATE_TRUNC(date, MONTH)',
            'Snaps a date back to the start of its period: DAY, WEEK, ISOWEEK, MONTH, QUARTER, YEAR.',
            `SELECT DATE_TRUNC(order_date, MONTH) AS month, COUNT(*) AS orders
FROM orders WHERE status = 'completed' GROUP BY month ORDER BY month`,
            'Monthly and weekly rollups.',
            ['date-trunc']),
          e('extract', 'EXTRACT', 'EXTRACT(part FROM date)',
            'Pulls one component out. DAYOFWEEK returns 1 for Sunday in BigQuery.',
            `SELECT EXTRACT(MONTH FROM order_date) AS m, EXTRACT(DAYOFWEEK FROM order_date) AS dow, COUNT(*) AS n
FROM orders GROUP BY m, dow ORDER BY m, dow LIMIT 10`,
            'Day-of-week and hour-of-day patterns.',
            ['date-functions']),
          e('datedim', 'Date dimension', 'JOIN date_dim ON …',
            'A physical calendar table carrying week starts, quarters, weekends and holidays. Everyone gets the same definitions.',
            `SELECT d.day_name, COUNT(*) AS orders FROM orders o JOIN date_dim d ON d.date = o.order_date
WHERE o.status = 'completed' GROUP BY d.day_name ORDER BY orders DESC`,
            'Business calendars — fiscal quarters, holidays, trading days.',
            ['date-spine']),
        ],
      },
      {
        name: 'Arithmetic',
        entries: [
          e('datediff', 'DATE_DIFF', 'DATE_DIFF(later, earlier, DAY)',
            'The LATER date comes first. Counts boundaries crossed, not whole periods — DATE_DIFF on two month-truncated dates gives whole months.',
            `SELECT subscription_id, DATE_DIFF(canceled_at, started_at, DAY) AS days_subscribed
FROM subscriptions WHERE canceled_at IS NOT NULL ORDER BY days_subscribed LIMIT 5`,
            'Tenure, sales cycle length, time to activate.',
            ['date-diff']),
          e('dateadd', 'DATE_ADD / DATE_SUB', 'DATE_ADD(date, INTERVAL n DAY)',
            'Note the INTERVAL keyword. Month arithmetic clamps: Jan 31 + 1 month is Feb 28.',
            `SELECT order_date, DATE_ADD(order_date, INTERVAL 30 DAY) AS refund_deadline
FROM orders ORDER BY order_date LIMIT 5`,
            'Attribution windows, refund deadlines, cohort boundaries.',
            ['date-functions']),
          e('tsdiff', 'TIMESTAMP_DIFF', 'TIMESTAMP_DIFF(a, b, MINUTE)',
            'The timestamp version, with sub-day parts: HOUR, MINUTE, SECOND.',
            `SELECT priority, AVG(TIMESTAMP_DIFF(first_response_at, created_at, MINUTE)) AS avg_minutes
FROM support_tickets WHERE first_response_at IS NOT NULL GROUP BY priority ORDER BY priority`,
            'Response times, session durations.',
            ['date-diff']),
        ],
      },
      {
        name: 'Text and dates',
        entries: [
          e('format', 'FORMAT_DATE', "FORMAT_DATE('%b %Y', d)",
            'Renders a date as text. Never sort by the formatted string — April sorts before January.',
            `SELECT FORMAT_DATE('%b %Y', DATE_TRUNC(order_date, MONTH)) AS label, SUM(gross_revenue) AS revenue
FROM orders WHERE status = 'completed'
GROUP BY label, DATE_TRUNC(order_date, MONTH) ORDER BY DATE_TRUNC(order_date, MONTH)`,
            'Axis labels and report headings.',
            ['date-functions', 'string-functions']),
          e('parse', 'PARSE_DATE', "PARSE_DATE('%Y%m%d', s)",
            'Text to DATE. The format string mirrors the layout of the input exactly.',
            `SELECT PARSE_DATE('%Y%m%d', event_date) AS day, COUNT(*) AS events
FROM ga4_events WHERE event_date <= '20240105' GROUP BY day ORDER BY day`,
            'GA4 event_date, and any CSV import.',
            ['date-functions']),
        ],
      },
    ],
  },

  {
    slug: 'marketing-metrics',
    title: 'Marketing metrics cheatsheet',
    subtitle: 'Every formula, with the denominator argument attached',
    groups: [
      {
        name: 'Efficiency',
        entries: [
          e('ctr', 'CTR', 'clicks / impressions',
            'Weighted, always. Averaging per-row CTR gives a 12-impression day the same weight as a 40,000-impression one.',
            'SELECT SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr FROM ad_spend_daily',
            'Creative and ad-copy quality.',
            ['rate-metrics']),
          e('cpc-cpm', 'CPC and CPM', 'spend / clicks · spend / impressions × 1000',
            'CPC measures auction competitiveness; CPM measures audience cost. Which you optimise depends on the objective.',
            `SELECT platform, SAFE_DIVIDE(SUM(spend), SUM(clicks)) AS cpc,
       SAFE_DIVIDE(SUM(spend), SUM(impressions)) * 1000 AS cpm
FROM ad_spend_daily GROUP BY platform ORDER BY platform`,
            'Media buying efficiency.',
            ['rate-metrics']),
          e('cpa', 'CPA', 'spend / conversions',
            'Whose conversions? Platform-reported and warehouse-observed differ, sometimes by a lot.',
            `SELECT SAFE_DIVIDE(SUM(cost), SUM(conversions)) AS cpa FROM google_ads_daily`,
            'The in-platform bidding target.',
            ['cac', 'rate-metrics']),
          e('roas', 'ROAS', 'revenue / spend',
            'A multiple, not a percentage. Platform ROAS overclaims structurally, because each platform counts conversions the other also counts.',
            `SELECT platform, SAFE_DIVIDE(SUM(platform_revenue), SUM(spend)) AS roas
FROM ad_spend_daily GROUP BY platform ORDER BY roas DESC`,
            'Channel-level return, with the attribution caveat stated.',
            ['roas']),
        ],
      },
      {
        name: 'Customer economics',
        entries: [
          e('cac', 'CAC', 'spend / new customers',
            'Blended divides all spend by all customers; paid-only divides by paid-sourced customers. Blended is honest, paid-only is actionable.',
            `SELECT SAFE_DIVIDE((SELECT SUM(spend) FROM ad_spend_daily), (SELECT COUNT(*) FROM customers)) AS blended_cac`,
            'Whether the acquisition engine works at all.',
            ['cac']),
          e('aov', 'AOV', 'revenue / orders',
            'Report the median alongside the mean when order values are skewed — they usually are.',
            `SELECT SAFE_DIVIDE(SUM(gross_revenue), COUNT(*)) AS mean_aov,
       PERCENTILE_CONT(gross_revenue, 0.5) AS median_aov
FROM orders WHERE status = 'completed'`,
            'Merchandising and free-shipping thresholds.',
            ['aov']),
          e('ltv', 'LTV', 'cumulative revenue per customer',
            'Historical LTV understates young cohorts. Fixed-window cohort LTV is the only fair cross-cohort comparison.',
            `SELECT first_touch_channel, AVG(lifetime_revenue) AS avg_ltv
FROM customer_ltv GROUP BY first_touch_channel ORDER BY avg_ltv DESC`,
            'How much you can afford to pay for a customer.',
            ['ltv']),
          e('ltvcac', 'LTV:CAC and payback', 'LTV / CAC · CAC / monthly revenue',
            '3:1 is the conventional floor. Payback period decides whether growth self-funds.',
            `WITH s AS (SELECT channel, SUM(spend) AS spend FROM ad_spend_daily GROUP BY channel),
v AS (SELECT first_touch_channel AS channel, COUNT(*) AS customers, AVG(lifetime_revenue) AS ltv
      FROM customer_ltv GROUP BY first_touch_channel)
SELECT s.channel, SAFE_DIVIDE(v.ltv, SAFE_DIVIDE(s.spend, v.customers)) AS ltv_cac
FROM s JOIN v USING (channel) ORDER BY ltv_cac DESC`,
            'The budget allocation decision.',
            ['ltv', 'cac']),
        ],
      },
      {
        name: 'Retention',
        entries: [
          e('retention', 'Retention rate', 'active in period n / cohort size',
            'Cohort-anchored. The denominator is the month-0 size, not the previous month.',
            `WITH c AS (SELECT customer_id, DATE_TRUNC(MIN(order_date), MONTH) AS cm
           FROM orders WHERE status = 'completed' GROUP BY customer_id),
a AS (SELECT c.cm, DATE_DIFF(DATE_TRUNC(o.order_date, MONTH), c.cm, MONTH) AS mn, o.customer_id
      FROM orders o JOIN c USING (customer_id) WHERE o.status = 'completed'),
m AS (SELECT cm, mn, COUNT(DISTINCT customer_id) AS customers FROM a GROUP BY cm, mn)
SELECT cm AS cohort_month, mn AS month_number, customers,
       SAFE_DIVIDE(customers, FIRST_VALUE(customers) OVER (PARTITION BY cm ORDER BY mn)) AS retention
FROM m ORDER BY cm, mn LIMIT 12`,
            'Whether the product keeps the customers marketing buys.',
            ['retention', 'cohort']),
          e('churn', 'Churn', 'cancellations / population at period start',
            'The denominator must be the population that had the opportunity to churn — the start, not the end.',
            `SELECT p.tier, SAFE_DIVIDE(COUNTIF(s.canceled_at IS NOT NULL), COUNT(*)) AS churn_rate
FROM subscriptions s JOIN plans p USING (plan_id) GROUP BY p.tier ORDER BY churn_rate DESC`,
            'The leak the growth engine is filling.',
            ['churn']),
          e('mrr', 'MRR movements', 'new + expansion − contraction − churned',
            'Flat MRR can hide large offsetting movements. The bridge is what shows them.',
            `WITH n AS (SELECT DATE_TRUNC(started_at, MONTH) AS month, SUM(mrr) AS new_mrr FROM subscriptions GROUP BY month),
c AS (SELECT DATE_TRUNC(canceled_at, MONTH) AS month, SUM(mrr) AS churned FROM subscriptions
      WHERE canceled_at IS NOT NULL GROUP BY month)
SELECT n.month, n.new_mrr, COALESCE(c.churned, 0) AS churned_mrr
FROM n LEFT JOIN c USING (month) ORDER BY n.month`,
            'The SaaS board slide.',
            ['mrr']),
        ],
      },
      {
        name: 'Funnel and attribution',
        entries: [
          e('funnel', 'Funnel conversion', 'step n / step n−1',
            'Step-to-step rates localise the leak. Step-to-top rates make every step after the leaky one look broken.',
            `WITH s AS (SELECT CONCAT(user_pseudo_id, '-', CAST(ga_session_id AS STRING)) AS k,
                  MAX(CASE WHEN event_name = 'add_to_cart' THEN 1 ELSE 0 END) c,
                  MAX(CASE WHEN event_name = 'purchase' THEN 1 ELSE 0 END) p
           FROM ga4_events GROUP BY k)
SELECT SUM(c) AS carts, SUM(p) AS purchases, SAFE_DIVIDE(SUM(p), SUM(c)) AS cart_to_purchase FROM s`,
            'Finding the one page to fix.',
            ['funnel']),
          e('attribution', 'Attribution models', 'first · last · linear · position · time-decay',
            'All models redistribute the same revenue. Choosing one is a business decision dressed as a technical one — and none of them establish incrementality.',
            `SELECT channel,
       SUM(CASE WHEN touch_position = 1 THEN conversion_value ELSE 0 END) AS first_touch,
       SUM(SAFE_DIVIDE(conversion_value, journey_length)) AS linear
FROM attribution_touchpoints WHERE converted = 1 GROUP BY channel ORDER BY linear DESC`,
            'Budget allocation arguments.',
            ['attribution']),
          e('activation', 'Activation rate', 'activated users / signups',
            'Upstream of retention, expansion and referral — and the fastest metric to move.',
            `WITH a AS (SELECT DISTINCT user_id FROM product_events WHERE event_name = 'activated')
SELECT COUNT(DISTINCT s.customer_id) AS subs, COUNT(DISTINCT a.user_id) AS activated,
       SAFE_DIVIDE(COUNT(DISTINCT a.user_id), COUNT(DISTINCT s.customer_id)) AS activation_rate
FROM subscriptions s LEFT JOIN a ON a.user_id = s.customer_id`,
            'The onboarding roadmap.',
            ['activation']),
        ],
      },
    ],
  },
];

export function cheatsheetBySlug(slug: string): Cheatsheet | undefined {
  return CHEATSHEETS.find((c) => c.slug === slug);
}
