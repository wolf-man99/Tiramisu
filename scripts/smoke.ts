/**
 * Engine smoke test, the Phase 1 gate from docs/ROADMAP.md.
 *
 * Builds the warehouse and runs a battery of BigQuery-dialect queries covering every
 * construct the curriculum teaches. Run with `npm run smoke`.
 */

import { runQuery, warehouseStats, rowCounts, QueryError } from '../src/lib/warehouse/engine';
import { transpile } from '../src/lib/bigquery/transpile';

interface Case {
  name: string;
  sql: string;
  /** Fail the case unless at least this many rows come back. */
  minRows?: number;
  expectError?: boolean;
}

const CASES: Case[] = [
  {
    name: 'basic select + alias + limit',
    sql: `SELECT campaign_name AS campaign, daily_budget FROM google_ads_campaigns ORDER BY daily_budget DESC LIMIT 5`,
    minRows: 5,
  },
  {
    name: 'backticked three-part table name',
    sql: 'SELECT COUNT(*) AS n FROM `growthsql-academy.marketing_analytics.orders`',
    minRows: 1,
  },
  {
    name: 'unquoted dataset qualifier',
    sql: 'SELECT COUNT(*) AS n FROM marketing_analytics.ga4_sessions',
    minRows: 1,
  },
  {
    name: 'WHERE + IN + BETWEEN + IS NULL',
    sql: `SELECT COUNT(*) AS n FROM google_ads_keywords
          WHERE match_type IN ('EXACT','PHRASE') AND quality_score IS NULL`,
    minRows: 1,
  },
  {
    name: 'aggregation with SAFE_DIVIDE and COUNTIF',
    sql: `SELECT c.channel_type,
                 SUM(d.cost) AS spend,
                 SAFE_DIVIDE(SUM(d.clicks), SUM(d.impressions)) AS ctr,
                 COUNTIF(d.clicks = 0) AS zero_click_days
          FROM google_ads_daily d
          JOIN google_ads_campaigns c USING (campaign_id)
          GROUP BY c.channel_type
          HAVING SUM(d.cost) > 0
          ORDER BY spend DESC`,
    minRows: 3,
  },
  {
    name: 'LEFT JOIN anti-join',
    sql: `SELECT COUNT(*) AS orphan_orders
          FROM orders o
          LEFT JOIN google_ads_campaigns c ON c.campaign_id = o.campaign_id
          WHERE o.campaign_id IS NOT NULL AND c.campaign_id IS NULL`,
    minRows: 1,
  },
  {
    name: 'FULL OUTER JOIN',
    sql: `SELECT COUNT(*) AS n FROM (
            SELECT campaign_id FROM google_ads_campaigns
            FULL OUTER JOIN meta_ads_campaigns USING (campaign_id)
          )`,
    minRows: 1,
  },
  {
    name: 'CROSS JOIN date spine',
    sql: `SELECT d.date, COALESCE(SUM(o.gross_revenue), 0) AS revenue
          FROM date_dim d
          LEFT JOIN orders o ON o.order_date = d.date AND o.status = 'completed'
          WHERE d.date BETWEEN '2024-03-01' AND '2024-03-31'
          GROUP BY d.date ORDER BY d.date`,
    minRows: 31,
  },
  {
    name: 'CASE + conditional aggregation pivot',
    sql: `SELECT channel,
                 SUM(CASE WHEN device = 'mobile' THEN gross_revenue ELSE 0 END) AS mobile_rev,
                 SUM(CASE WHEN device = 'desktop' THEN gross_revenue ELSE 0 END) AS desktop_rev
          FROM orders WHERE status = 'completed' GROUP BY channel`,
    minRows: 3,
  },
  {
    name: 'DATE_DIFF / DATE_TRUNC / DATE_ADD with INTERVAL',
    sql: `SELECT DATE_TRUNC(order_date, MONTH) AS month,
                 COUNT(*) AS orders,
                 AVG(DATE_DIFF(order_date, DATE '2024-01-01', DAY)) AS avg_day_index,
                 MAX(DATE_ADD(order_date, INTERVAL 30 DAY)) AS latest_plus_30
          FROM orders GROUP BY month ORDER BY month`,
    minRows: 12,
  },
  {
    name: 'EXTRACT',
    sql: `SELECT EXTRACT(MONTH FROM order_date) AS m,
                 EXTRACT(DAYOFWEEK FROM order_date) AS dow,
                 COUNT(*) AS n
          FROM orders GROUP BY m, dow ORDER BY m, dow`,
    minRows: 20,
  },
  {
    name: 'FORMAT_DATE + PARSE_DATE round trip on GA4 strings',
    sql: `SELECT event_date,
                 PARSE_DATE('%Y%m%d', event_date) AS d,
                 FORMAT_DATE('%Y-%m', PARSE_DATE('%Y%m%d', event_date)) AS ym
          FROM ga4_events GROUP BY event_date, d, ym ORDER BY event_date LIMIT 5`,
    minRows: 5,
  },
  {
    name: 'string functions: SPLIT + OFFSET, REGEXP_EXTRACT, STARTS_WITH',
    sql: `SELECT campaign_name,
                 SPLIT(campaign_name, '_')[OFFSET(0)] AS market,
                 SPLIT(campaign_name, '_')[OFFSET(1)] AS channel,
                 REGEXP_EXTRACT(campaign_name, r'_([A-Za-z]+)_') AS first_seg,
                 STARTS_WITH(campaign_name, 'US') AS is_us
          FROM google_ads_campaigns LIMIT 10`,
    minRows: 10,
  },
  {
    name: 'CTE chain',
    sql: `WITH spend AS (
            SELECT campaign_id, SUM(cost) AS cost FROM google_ads_daily GROUP BY campaign_id
          ), rev AS (
            SELECT campaign_id, SUM(gross_revenue) AS revenue FROM orders
            WHERE status = 'completed' AND campaign_id IS NOT NULL GROUP BY campaign_id
          )
          SELECT c.campaign_name, s.cost, COALESCE(r.revenue, 0) AS revenue,
                 SAFE_DIVIDE(r.revenue, s.cost) AS roas
          FROM spend s
          JOIN google_ads_campaigns c USING (campaign_id)
          LEFT JOIN rev r USING (campaign_id)
          ORDER BY s.cost DESC LIMIT 10`,
    minRows: 10,
  },
  {
    name: 'correlated subquery + EXISTS',
    sql: `SELECT COUNT(*) AS n FROM customers c
          WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id AND o.status = 'completed')`,
    minRows: 1,
  },
  {
    name: 'window functions: ROW_NUMBER, RANK, LAG, running total, percent of total',
    sql: `SELECT campaign_id, date, cost,
                 ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY date) AS rn,
                 RANK() OVER (ORDER BY cost DESC) AS cost_rank,
                 LAG(cost) OVER (PARTITION BY campaign_id ORDER BY date) AS prev_cost,
                 SUM(cost) OVER (PARTITION BY campaign_id ORDER BY date
                                 ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7d,
                 SAFE_DIVIDE(cost, SUM(cost) OVER (PARTITION BY campaign_id)) AS pct_of_campaign
          FROM (SELECT campaign_id, date, SUM(cost) AS cost FROM google_ads_daily GROUP BY 1, 2)
          ORDER BY campaign_id, date LIMIT 50`,
    minRows: 50,
  },
  {
    name: 'QUALIFY',
    sql: `SELECT campaign_id AS campaign_id, date AS date, cost AS cost
          FROM (SELECT campaign_id, date, SUM(cost) AS cost FROM google_ads_daily GROUP BY 1, 2)
          QUALIFY ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY cost DESC) = 1
          ORDER BY cost DESC`,
    minRows: 10,
  },
  {
    name: 'GA4 UNNEST(event_params) with alias',
    sql: `SELECT ep.key AS param, COUNT(*) AS n
          FROM ga4_events e, UNNEST(e.event_params) AS ep
          GROUP BY param ORDER BY n DESC LIMIT 10`,
    minRows: 5,
  },
  {
    name: 'GA4 UNNEST pivot to page_location',
    sql: `SELECT
            (SELECT ep.value.string_value FROM UNNEST(e.event_params) AS ep WHERE ep.key = 'page_location') AS page,
            COUNT(*) AS views
          FROM ga4_events e
          WHERE e.event_name = 'page_view'
          GROUP BY page ORDER BY views DESC LIMIT 10`,
    minRows: 5,
  },
  {
    name: 'GA4 struct field access',
    sql: `SELECT device.category AS device, geo.country AS country, COUNT(*) AS events
          FROM ga4_events
          GROUP BY device, country ORDER BY events DESC LIMIT 10`,
    minRows: 5,
  },
  {
    name: 'GA4 items UNNEST',
    sql: `SELECT i.item_category AS category, SUM(i.price * i.quantity) AS revenue
          FROM ga4_events e, UNNEST(e.items) AS i
          WHERE e.event_name = 'purchase'
          GROUP BY category ORDER BY revenue DESC`,
    minRows: 3,
  },
  {
    name: 'TIMESTAMP_MICROS on event_timestamp',
    sql: `SELECT FORMAT_TIMESTAMP('%H', TIMESTAMP_MICROS(event_timestamp)) AS hour, COUNT(*) AS n
          FROM ga4_events GROUP BY hour ORDER BY hour LIMIT 24`,
    minRows: 10,
  },
  {
    name: 'UNNEST(GENERATE_DATE_ARRAY(...))',
    sql: `SELECT d AS day FROM UNNEST(GENERATE_DATE_ARRAY('2024-01-01', '2024-01-10')) AS d ORDER BY day`,
    minRows: 10,
  },
  {
    name: 'UNNEST(GENERATE_ARRAY(...)) with OFFSET',
    sql: `SELECT n AS num, pos AS position
          FROM UNNEST(GENERATE_ARRAY(10, 14)) AS n WITH OFFSET AS pos ORDER BY pos`,
    minRows: 5,
  },
  {
    name: 'UNNEST(SPLIT(...)) scalar array',
    sql: `SELECT part AS segment, COUNT(*) AS n
          FROM google_ads_campaigns, UNNEST(SPLIT(campaign_name, '_')) AS part
          GROUP BY segment ORDER BY n DESC LIMIT 10`,
    minRows: 5,
  },
  {
    name: 'SAFE_CAST + IFNULL + NULLIF',
    sql: `SELECT SAFE_CAST(quality_score AS INT64) AS qs,
                 IFNULL(quality_score, 0) AS qs_zero,
                 NULLIF(match_type, 'BROAD') AS non_broad
          FROM google_ads_keywords LIMIT 20`,
    minRows: 20,
  },
  {
    name: 'SELECT * EXCEPT()',
    sql: `SELECT * EXCEPT(daily_budget, start_date) FROM google_ads_campaigns LIMIT 3`,
    minRows: 3,
  },
  {
    name: 'STRING_AGG customer journey',
    sql: `SELECT customer_id, STRING_AGG(channel, ' > ') AS journey
          FROM (SELECT customer_id, channel, touch_position FROM attribution_touchpoints
                WHERE customer_id IS NOT NULL ORDER BY customer_id, touch_position)
          GROUP BY customer_id LIMIT 10`,
    minRows: 10,
  },
  {
    name: 'ARRAY_AGG + ARRAY_LENGTH',
    sql: `SELECT customer_id, ARRAY_LENGTH(ARRAY_AGG(channel)) AS touches
          FROM attribution_touchpoints WHERE customer_id IS NOT NULL
          GROUP BY customer_id LIMIT 5`,
    minRows: 5,
  },
  {
    name: 'PERCENTILE_CONT / median as aggregate',
    sql: `SELECT PERCENTILE_CONT(gross_revenue, 0.5) AS median_order,
                 AVG(gross_revenue) AS mean_order
          FROM orders WHERE status = 'completed'`,
    minRows: 1,
  },
  {
    name: 'cohort retention matrix',
    sql: `WITH cohort AS (
            SELECT customer_id, DATE_TRUNC(MIN(order_date), MONTH) AS cohort_month
            FROM orders WHERE status = 'completed' GROUP BY customer_id
          ), activity AS (
            SELECT o.customer_id, c.cohort_month,
                   DATE_DIFF(DATE_TRUNC(o.order_date, MONTH), c.cohort_month, MONTH) AS month_number
            FROM orders o JOIN cohort c USING (customer_id)
            WHERE o.status = 'completed'
          )
          SELECT cohort_month, month_number, COUNT(DISTINCT customer_id) AS customers
          FROM activity GROUP BY cohort_month, month_number
          ORDER BY cohort_month, month_number LIMIT 40`,
    minRows: 20,
  },
  {
    name: 'funnel from GA4 events',
    sql: `SELECT
            COUNTIF(event_name = 'session_start') AS sessions,
            COUNTIF(event_name = 'view_item') AS view_item,
            COUNTIF(event_name = 'add_to_cart') AS add_to_cart,
            COUNTIF(event_name = 'begin_checkout') AS checkout,
            COUNTIF(event_name = 'purchase') AS purchases,
            SAFE_DIVIDE(COUNTIF(event_name = 'purchase'), COUNTIF(event_name = 'session_start')) AS cvr
          FROM ga4_events`,
    minRows: 1,
  },
  {
    name: 'MRR movement',
    sql: `SELECT DATE_TRUNC(started_at, MONTH) AS month,
                 SUM(mrr) AS new_mrr,
                 COUNT(*) AS new_subs
          FROM subscriptions GROUP BY month ORDER BY month`,
    minRows: 10,
  },
  {
    name: 'attribution: first vs last touch',
    sql: `WITH j AS (
            SELECT user_pseudo_id, channel, touch_position, journey_length, converted, conversion_value
            FROM attribution_touchpoints WHERE converted = 1
          )
          SELECT
            SUM(CASE WHEN touch_position = 1 THEN conversion_value ELSE 0 END) AS first_touch_value,
            SUM(CASE WHEN touch_position = journey_length THEN conversion_value ELSE 0 END) AS last_touch_value,
            SUM(SAFE_DIVIDE(conversion_value, journey_length)) AS linear_value
          FROM j`,
    minRows: 1,
  },
  {
    name: 'ad_spend_daily view (blended)',
    sql: `SELECT platform, SUM(spend) AS spend, SUM(clicks) AS clicks,
                 SAFE_DIVIDE(SUM(spend), SUM(clicks)) AS cpc
          FROM ad_spend_daily GROUP BY platform ORDER BY spend DESC`,
    minRows: 3,
  },
  {
    name: 'customer_ltv view',
    sql: `SELECT segment, ROUND(AVG(lifetime_revenue), 2) AS avg_ltv, COUNT(*) AS customers
          FROM customer_ltv GROUP BY segment`,
    minRows: 2,
  },
  // ── guard tests ──
  { name: 'guard: DROP rejected', sql: 'DROP TABLE orders', expectError: true },
  { name: 'guard: INSERT rejected', sql: "INSERT INTO orders VALUES (1)", expectError: true },
  { name: 'guard: multi-statement rejected', sql: 'SELECT 1; SELECT 2', expectError: true },
  { name: 'guard: PRAGMA rejected', sql: 'SELECT 1 FROM orders WHERE 1=1 PRAGMA x', expectError: true },
  {
    name: 'guard: keyword hidden in a string literal is fine',
    sql: `SELECT COUNT(*) AS n FROM orders WHERE coupon_code = 'DROP TABLE'`,
    minRows: 1,
  },
];

function main(): void {
  console.log('Building warehouse…');
  const stats = warehouseStats();
  console.log(`  ${stats.tables} tables/views · ${stats.totalRows.toLocaleString()} rows · ${stats.buildMs} ms\n`);

  const counts = rowCounts();
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [t, n] of top) console.log(`  ${t.padEnd(28)} ${String(n).padStart(8)}`);
  console.log();

  let pass = 0;
  let fail = 0;
  for (const c of CASES) {
    try {
      const r = runQuery(c.sql);
      if (c.expectError) {
        console.log(`✗ ${c.name}\n    expected an error, got ${r.rowCount} rows`);
        fail++;
        continue;
      }
      if (c.minRows !== undefined && r.rowCount < c.minRows) {
        console.log(`✗ ${c.name}\n    expected ≥${c.minRows} rows, got ${r.rowCount}`);
        console.log(`    compiled: ${r.compiledSql.replace(/\s+/g, ' ').slice(0, 220)}`);
        fail++;
        continue;
      }
      console.log(`✓ ${c.name.padEnd(52)} ${String(r.rowCount).padStart(5)} rows  ${String(r.ms).padStart(7)} ms`);
      pass++;
    } catch (e) {
      if (c.expectError) {
        console.log(`✓ ${c.name.padEnd(52)} rejected: ${(e as Error).message.slice(0, 50)}`);
        pass++;
        continue;
      }
      const err = e as QueryError;
      console.log(`✗ ${c.name}\n    ${err.kind ?? 'error'}: ${err.message}`);
      try {
        console.log(`    compiled: ${transpile(c.sql).sql.replace(/\s+/g, ' ').slice(0, 300)}`);
      } catch { /* transpile itself failed; the message above says so */ }
      fail++;
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main();
