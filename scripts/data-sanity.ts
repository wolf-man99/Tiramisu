/**
 * Data sanity checks.
 *
 * The warehouse's whole value is that its numbers are defensible — a marketer must be
 * able to look at any answer and recognise their own world. These assertions pin the
 * economics (CAC, ROAS, CTR, CVR, churn) into realistic bands, and pin the deliberate
 * data-quality defects that the curriculum teaches against.
 *
 * Run via `npm run check`.
 */

import { runQuery } from '../src/lib/warehouse/engine';

interface Check {
  name: string;
  sql: string;
  /** Inclusive band for the first column of the first row. */
  min?: number;
  max?: number;
  /** Formatting only. */
  unit?: string;
}

const CHECKS: Check[] = [
  // ── volumes ──
  { name: 'completed orders', sql: "SELECT COUNT(*) FROM orders WHERE status='completed'", min: 4000, max: 9000 },
  { name: 'net revenue', sql: "SELECT SUM(gross_revenue) FROM orders WHERE status='completed'", min: 500_000, max: 2_000_000, unit: '$' },
  { name: 'AOV', sql: "SELECT AVG(gross_revenue) FROM orders WHERE status='completed'", min: 80, max: 320, unit: '$' },
  { name: 'active subscriptions', sql: "SELECT COUNT(*) FROM subscriptions WHERE status='active'", min: 400, max: 1500 },
  { name: 'active MRR', sql: "SELECT SUM(mrr) FROM subscriptions WHERE status='active'", min: 100_000, max: 600_000, unit: '$' },

  // ── paid media economics ──
  { name: 'total paid spend', sql: 'SELECT SUM(spend) FROM ad_spend_daily', min: 400_000, max: 1_600_000, unit: '$' },
  { name: 'google spend', sql: "SELECT SUM(spend) FROM ad_spend_daily WHERE platform='google'", min: 200_000, max: 900_000, unit: '$' },
  { name: 'meta spend', sql: "SELECT SUM(spend) FROM ad_spend_daily WHERE platform='meta'", min: 60_000, max: 400_000, unit: '$' },
  { name: 'linkedin spend', sql: "SELECT SUM(spend) FROM ad_spend_daily WHERE platform='linkedin'", min: 80_000, max: 500_000, unit: '$' },
  {
    name: 'blended CAC (paid spend / new customers)',
    sql: `SELECT (SELECT SUM(spend) FROM ad_spend_daily)
               / (SELECT COUNT(*) FROM customers)`,
    min: 40, max: 400, unit: '$',
  },
  {
    name: 'google search CTR',
    sql: `SELECT SUM(d.clicks) * 1.0 / SUM(d.impressions)
          FROM google_ads_daily d JOIN google_ads_campaigns c USING (campaign_id)
          WHERE c.channel_type = 'SEARCH'`,
    min: 0.02, max: 0.14,
  },
  {
    name: 'google search CPC',
    sql: `SELECT SUM(d.cost) / SUM(d.clicks)
          FROM google_ads_daily d JOIN google_ads_campaigns c USING (campaign_id)
          WHERE c.channel_type = 'SEARCH'`,
    min: 0.4, max: 6, unit: '$',
  },
  {
    name: 'meta CPM',
    sql: 'SELECT SUM(spend) / SUM(impressions) * 1000 FROM meta_ads_daily',
    min: 3, max: 40, unit: '$',
  },
  {
    name: 'meta CTR',
    sql: 'SELECT SUM(clicks) * 1.0 / SUM(impressions) FROM meta_ads_daily',
    min: 0.005, max: 0.04,
  },
  {
    name: 'linkedin CPC',
    sql: 'SELECT SUM(spend) / SUM(clicks) FROM linkedin_ads_daily',
    min: 4, max: 20, unit: '$',
  },

  // ── funnel ──
  {
    name: 'session → purchase CVR',
    sql: `SELECT COUNTIF(event_name='purchase') * 1.0 / COUNTIF(event_name='session_start') FROM ga4_events`,
    min: 0.01, max: 0.16,
  },
  {
    name: 'add-to-cart → purchase rate',
    sql: `SELECT COUNTIF(event_name='purchase') * 1.0 / COUNTIF(event_name='add_to_cart') FROM ga4_events`,
    min: 0.15, max: 0.75,
  },
  {
    name: 'sessions per device',
    sql: 'SELECT COUNT(*) * 1.0 / COUNT(DISTINCT user_pseudo_id) FROM ga4_sessions',
    min: 1.1, max: 3.5,
  },

  // ── retention / churn ──
  {
    name: 'monthly logo churn',
    sql: `SELECT COUNT(*) * 1.0 / 12 / (SELECT COUNT(*) FROM subscriptions)
          FROM subscriptions WHERE canceled_at IS NOT NULL`,
    min: 0.005, max: 0.06,
  },
  {
    name: 'repeat purchase rate',
    sql: `SELECT COUNT(*) * 1.0 / (SELECT COUNT(DISTINCT customer_id) FROM orders WHERE status='completed')
          FROM (SELECT customer_id FROM orders WHERE status='completed'
                GROUP BY customer_id HAVING COUNT(*) > 1)`,
    min: 0.1, max: 0.6,
  },

  // ── the deliberate defects (docs/DATA-MODEL.md §A.6) ──
  {
    name: 'DEFECT duplicate order rows',
    sql: 'SELECT COUNT(*) - COUNT(DISTINCT order_id) FROM orders',
    min: 20, max: 40,
  },
  {
    name: 'DEFECT NULL quality_score keywords',
    sql: 'SELECT COUNT(*) FROM google_ads_keywords WHERE quality_score IS NULL',
    min: 10, max: 120,
  },
  {
    name: 'DEFECT NULL user_id events',
    sql: 'SELECT COUNT(*) - COUNT(user_id) FROM ga4_events',
    min: 10_000, max: 60_000,
  },
  {
    name: 'DEFECT refunds with negative revenue',
    sql: 'SELECT COUNT(*) FROM orders WHERE gross_revenue < 0',
    min: 100, max: 900,
  },
  {
    name: 'DEFECT zero-click campaign-days',
    sql: 'SELECT COUNT(*) FROM google_ads_daily WHERE impressions > 0 AND clicks = 0',
    min: 20, max: 900,
  },
  {
    name: 'DEFECT zero-impression campaign-days',
    sql: 'SELECT COUNT(*) FROM google_ads_daily WHERE impressions = 0',
    min: 20, max: 600,
  },
  {
    name: 'DEFECT orphan campaign_id on orders',
    sql: `SELECT COUNT(*) FROM orders o
          WHERE o.campaign_id IS NOT NULL
            AND o.campaign_id NOT IN (SELECT campaign_id FROM google_ads_campaigns)
            AND o.campaign_id NOT IN (SELECT campaign_id FROM meta_ads_campaigns)
            AND o.campaign_id NOT IN (SELECT campaign_id FROM linkedin_ads_campaigns)`,
    min: 20, max: 500,
  },
  {
    name: 'DEFECT messy city values',
    sql: `SELECT COUNT(*) FROM (SELECT DISTINCT city FROM orders WHERE city <> TRIM(city) OR city <> INITCAP(city))`,
    min: 3, max: 200,
  },
  {
    name: 'DEFECT internal QA traffic',
    sql: "SELECT COUNT(*) FROM ga4_sessions WHERE source = 'internal-qa'",
    min: 30, max: 400,
  },
  {
    name: 'DEFECT open deals with NULL is_won',
    sql: 'SELECT COUNT(*) FROM hubspot_deals WHERE is_won IS NULL',
    min: 50, max: 500,
  },
  {
    name: 'DEFECT opportunities with no campaign',
    sql: 'SELECT COUNT(*) FROM salesforce_opportunities WHERE campaign_id IS NULL',
    min: 50, max: 300,
  },
  {
    name: 'DEFECT unresolved support tickets',
    sql: 'SELECT COUNT(*) FROM support_tickets WHERE resolved_at IS NULL',
    min: 50, max: 700,
  },

  // ── referential coverage: every table must actually have data ──
  { name: 'every day of 2024 present', sql: 'SELECT COUNT(*) FROM date_dim', min: 366, max: 366 },
  { name: 'orders span the full year', sql: 'SELECT COUNT(DISTINCT order_date) FROM orders', min: 330, max: 366 },
  { name: 'GA4 events span the year', sql: 'SELECT COUNT(DISTINCT event_date) FROM ga4_events', min: 330, max: 366 },
];

function main(): void {
  let fail = 0;
  console.log('Data sanity\n');
  for (const c of CHECKS) {
    let value: number;
    try {
      const r = runQuery(c.sql);
      value = Number(r.rows[0]?.[0] ?? NaN);
    } catch (e) {
      console.log(`✗ ${c.name}\n    query failed: ${(e as Error).message}`);
      fail++;
      continue;
    }
    const lo = c.min ?? -Infinity;
    const hi = c.max ?? Infinity;
    const ok = Number.isFinite(value) && value >= lo && value <= hi;
    const shown = c.unit === '$'
      ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : value < 1 && value > 0 ? value.toFixed(4) : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (ok) {
      console.log(`✓ ${c.name.padEnd(44)} ${shown}`);
    } else {
      console.log(`✗ ${c.name.padEnd(44)} ${shown}   expected ${lo}…${hi}`);
      fail++;
    }
  }
  console.log(fail === 0 ? '\nAll data sanity checks passed.' : `\n${fail} check(s) failed.`);
  if (fail) process.exit(1);
}

main();
