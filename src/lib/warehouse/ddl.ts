/**
 * Schema for the Northbeam marketing warehouse.
 *
 * Column types are written in BigQuery vocabulary (STRING / INT64 / FLOAT64 / DATE /
 * TIMESTAMP / JSON) because that is what the learner sees in the schema panel and in
 * the real BigQuery console. `sqliteType` is what the local engine actually uses.
 *
 * ARRAY<> and STRUCT<> columns are stored as JSON text; the transpiler makes
 * `UNNEST(...)` and `struct.field` work over them. See docs/ARCHITECTURE.md §5.
 */

export type BqType =
  | 'STRING'
  | 'INT64'
  | 'FLOAT64'
  | 'NUMERIC'
  | 'BOOL'
  | 'DATE'
  | 'TIMESTAMP'
  | 'ARRAY'
  | 'STRUCT';

export interface ColumnDef {
  name: string;
  type: BqType;
  /** Full BigQuery type text, e.g. `ARRAY<STRUCT<key STRING, value STRUCT<...>>>` */
  typeText?: string;
  nullable?: boolean;
  pk?: boolean;
  /** `table.column` this column points at. */
  fk?: string;
  description: string;
  /** Shown in the schema panel's column peek. */
  sample?: string;
  /** Average bytes per value — feeds the dry-run cost model. */
  bytes?: number;
}

export interface TableDef {
  name: string;
  group: TableGroup;
  grain: string;
  description: string;
  columns: ColumnDef[];
  /** Partitioning column, mirroring how the table would be defined in BigQuery. */
  partitionBy?: string;
  clusterBy?: string[];
  /** Views are created from SQL instead of being generated. */
  viewSql?: string;
}

export type TableGroup =
  | 'Paid media'
  | 'Web & product'
  | 'CRM'
  | 'Revenue'
  | 'Lifecycle'
  | 'Reference';

const S = (
  name: string,
  description: string,
  extra: Partial<ColumnDef> = {},
): ColumnDef => ({ name, type: 'STRING', description, bytes: 16, ...extra });
const I = (
  name: string,
  description: string,
  extra: Partial<ColumnDef> = {},
): ColumnDef => ({ name, type: 'INT64', description, bytes: 8, ...extra });
const F = (
  name: string,
  description: string,
  extra: Partial<ColumnDef> = {},
): ColumnDef => ({ name, type: 'FLOAT64', description, bytes: 8, ...extra });
const D = (
  name: string,
  description: string,
  extra: Partial<ColumnDef> = {},
): ColumnDef => ({ name, type: 'DATE', description, bytes: 10, ...extra });
const T = (
  name: string,
  description: string,
  extra: Partial<ColumnDef> = {},
): ColumnDef => ({ name, type: 'TIMESTAMP', description, bytes: 19, ...extra });
const B = (
  name: string,
  description: string,
  extra: Partial<ColumnDef> = {},
): ColumnDef => ({ name, type: 'BOOL', description, bytes: 1, ...extra });

export const TABLES: TableDef[] = [
  // ─────────────────────────────────────────────────────────── Paid media ──
  {
    name: 'google_ads_campaigns',
    group: 'Paid media',
    grain: 'One row per campaign',
    description:
      'Google Ads campaign dimensions. Names follow the agency convention ' +
      '`{market}_{channel}_{brandness}_{geo}_{matchtype}`, which day 8 teaches you to parse.',
    columns: [
      I('campaign_id', 'Google Ads campaign ID.', { pk: true, sample: '1001' }),
      S('campaign_name', 'Structured campaign name.', {
        sample: 'GB_Search_NonBrand_UK_Exact',
        bytes: 32,
      }),
      S('channel_type', 'SEARCH, PMAX, DISPLAY, VIDEO or SHOPPING.', { sample: 'SEARCH' }),
      S('status', 'ENABLED, PAUSED or REMOVED.', { sample: 'ENABLED' }),
      I('is_brand', '1 for brand campaigns, 0 for non-brand.', { sample: '0' }),
      S('country', 'ISO-2 country code the campaign targets.', { sample: 'GB' }),
      F('daily_budget', 'Daily budget in USD.', { sample: '250.0' }),
      D('start_date', 'Date the campaign first ran.', { sample: '2024-01-08' }),
    ],
  },
  {
    name: 'google_ads_ad_groups',
    group: 'Paid media',
    grain: 'One row per ad group',
    description: 'Ad groups belong to campaigns; keywords belong to ad groups.',
    columns: [
      I('ad_group_id', 'Ad group ID.', { pk: true }),
      I('campaign_id', 'Parent campaign.', { fk: 'google_ads_campaigns.campaign_id' }),
      S('ad_group_name', 'Ad group name.', { sample: 'Running Shoes — Exact', bytes: 28 }),
      S('status', 'ENABLED or PAUSED.'),
      F('default_cpc_bid', 'Default max CPC in USD.'),
    ],
  },
  {
    name: 'google_ads_daily',
    group: 'Paid media',
    grain: 'One row per date × ad group',
    description:
      'Daily Google Ads performance. `conversions` is fractional because Google ' +
      'attributes conversions fractionally across ads — casting it to an integer ' +
      'quietly destroys about 8% of your conversions.',
    partitionBy: 'date',
    clusterBy: ['campaign_id'],
    columns: [
      D('date', 'Reporting date.', { sample: '2024-06-14' }),
      I('campaign_id', 'Campaign.', { fk: 'google_ads_campaigns.campaign_id' }),
      I('ad_group_id', 'Ad group.', { fk: 'google_ads_ad_groups.ad_group_id' }),
      I('impressions', 'Impressions served.'),
      I('clicks', 'Clicks received.'),
      F('cost', 'Spend in USD.'),
      F('conversions', 'Attributed conversions — fractional.', { sample: '3.42' }),
      F('conversion_value', 'Attributed conversion value in USD.'),
      F('view_through_conversions', 'View-through conversions (Display/Video only).'),
    ],
  },
  {
    name: 'google_ads_keywords',
    group: 'Paid media',
    grain: 'One row per keyword',
    description:
      'Keyword dimensions. `quality_score` is NULL for keywords with too little ' +
      'traffic to be scored — the most common NULL you will meet in ad data.',
    columns: [
      I('keyword_id', 'Keyword ID.', { pk: true }),
      I('ad_group_id', 'Ad group.', { fk: 'google_ads_ad_groups.ad_group_id' }),
      I('campaign_id', 'Campaign.', { fk: 'google_ads_campaigns.campaign_id' }),
      S('keyword_text', 'The keyword itself.', { sample: 'buy running shoes online', bytes: 24 }),
      S('match_type', 'EXACT, PHRASE or BROAD.'),
      I('quality_score', 'Google Quality Score 1–10. NULL when unscored.', {
        nullable: true,
      }),
    ],
  },
  {
    name: 'google_ads_keyword_daily',
    group: 'Paid media',
    grain: 'One row per date × keyword',
    description: 'Daily keyword performance — the largest ads table in the warehouse.',
    partitionBy: 'date',
    clusterBy: ['keyword_id'],
    columns: [
      D('date', 'Reporting date.'),
      I('keyword_id', 'Keyword.', { fk: 'google_ads_keywords.keyword_id' }),
      I('impressions', 'Impressions.'),
      I('clicks', 'Clicks.'),
      F('cost', 'Spend in USD.'),
      F('conversions', 'Attributed conversions — fractional.'),
      F('conversion_value', 'Attributed conversion value in USD.'),
      F('search_impression_share', 'Share of available impressions won (0–1). NULL when undisclosed.', {
        nullable: true,
      }),
    ],
  },
  {
    name: 'meta_ads_campaigns',
    group: 'Paid media',
    grain: 'One row per campaign',
    description: 'Meta (Facebook/Instagram) campaign dimensions.',
    columns: [
      I('campaign_id', 'Meta campaign ID.', { pk: true }),
      S('campaign_name', 'Campaign name.', { sample: 'US | Prospecting | Broad | Q2', bytes: 30 }),
      S('objective', 'CONVERSIONS, TRAFFIC, AWARENESS, CATALOG_SALES or LEAD_GENERATION.'),
      S('buying_type', 'AUCTION or RESERVED.'),
      S('status', 'ACTIVE or PAUSED.'),
      D('created_date', 'Creation date.'),
    ],
  },
  {
    name: 'meta_ads_daily',
    group: 'Paid media',
    grain: 'One row per date × ad set × creative',
    description:
      'Daily Meta delivery. `purchases` uses Meta\'s 7-day-click / 1-day-view window, ' +
      'so it is NOT comparable to Google\'s last-click `conversions`. Adding them ' +
      'together double-counts — this is the whole point of day 13\'s attribution work.',
    partitionBy: 'date',
    clusterBy: ['campaign_id'],
    columns: [
      D('date', 'Reporting date.'),
      I('campaign_id', 'Campaign.', { fk: 'meta_ads_campaigns.campaign_id' }),
      I('adset_id', 'Ad set ID.'),
      S('adset_name', 'Ad set name.', { bytes: 26 }),
      I('creative_id', 'Creative ID.'),
      S('creative_format', 'IMAGE, VIDEO, CAROUSEL or REELS.'),
      I('impressions', 'Impressions.'),
      I('reach', 'Unique people reached.'),
      F('frequency', 'impressions / reach.'),
      I('clicks', 'Link clicks.'),
      F('spend', 'Spend in USD.'),
      F('purchases', 'Attributed purchases (7d click / 1d view).'),
      F('purchase_value', 'Attributed purchase value in USD.'),
      I('video_3s_views', '3-second video views.'),
      I('thruplays', 'ThruPlays (15s or complete).'),
    ],
  },
  {
    name: 'linkedin_ads_campaigns',
    group: 'Paid media',
    grain: 'One row per campaign',
    description: 'LinkedIn campaigns — the B2B side of the business.',
    columns: [
      I('campaign_id', 'LinkedIn campaign ID.', { pk: true }),
      S('campaign_name', 'Campaign name.', { bytes: 30 }),
      S('objective', 'LEAD_GEN, WEBSITE_VISITS or BRAND_AWARENESS.'),
      S('job_function', 'Targeted job function.', { sample: 'Marketing' }),
      S('seniority', 'Targeted seniority.', { sample: 'Director' }),
      S('company_size', 'Targeted company size band.', { sample: '201-500' }),
      S('status', 'ACTIVE or PAUSED.'),
    ],
  },
  {
    name: 'linkedin_ads_daily',
    group: 'Paid media',
    grain: 'One row per date × campaign',
    description: 'Daily LinkedIn delivery, including lead-gen form performance.',
    partitionBy: 'date',
    columns: [
      D('date', 'Reporting date.'),
      I('campaign_id', 'Campaign.', { fk: 'linkedin_ads_campaigns.campaign_id' }),
      I('impressions', 'Impressions.'),
      I('clicks', 'Clicks.'),
      F('spend', 'Spend in USD.'),
      I('lead_form_opens', 'Lead form opens.'),
      I('leads', 'Completed lead form submissions.'),
    ],
  },

  // ────────────────────────────────────────────────────── Web & product ──
  {
    name: 'ga4_events',
    group: 'Web & product',
    grain: 'One row per event',
    description:
      'A faithful copy of the GA4 BigQuery export shape, including its two famous ' +
      'traps: `event_date` is a STRING formatted YYYYMMDD, and `event_timestamp` is ' +
      'in MICROseconds. Nested and repeated fields require UNNEST.',
    partitionBy: 'event_date',
    clusterBy: ['event_name', 'user_pseudo_id'],
    columns: [
      S('event_date', 'Event date as YYYYMMDD — a STRING, not a DATE.', {
        sample: '20240614',
        bytes: 8,
      }),
      I('event_timestamp', 'Event time in MICROseconds since epoch.', {
        sample: '1718352000000000',
      }),
      S('event_name', 'page_view, session_start, view_item, add_to_cart, begin_checkout, add_payment_info, purchase, sign_up, login, view_promotion, scroll.', {
        sample: 'page_view',
      }),
      S('user_pseudo_id', 'Device-scoped pseudonymous ID (the GA4 client ID).', {
        sample: '1a4f9c02.1707…',
        bytes: 24,
      }),
      S('user_id', 'Your own user ID — NULL until the user logs in.', {
        nullable: true,
        bytes: 12,
      }),
      I('ga_session_id', 'Session ID. In the real export this lives inside event_params.'),
      I('ga_session_number', 'How many sessions this device has had, 1-indexed.'),
      {
        name: 'event_params',
        type: 'ARRAY',
        typeText:
          'ARRAY<STRUCT<key STRING, value STRUCT<string_value STRING, int_value INT64, double_value FLOAT64>>>',
        description:
          'Repeated key/value parameters. UNNEST it, filter on key, and read the ' +
          'value sub-field that matches the parameter\'s type.',
        sample: '[{key:"page_location", …}]',
        bytes: 220,
      },
      {
        name: 'items',
        type: 'ARRAY',
        typeText:
          'ARRAY<STRUCT<item_id STRING, item_name STRING, item_category STRING, price FLOAT64, quantity INT64>>',
        description: 'Repeated e-commerce items. Empty for non-commerce events.',
        bytes: 120,
      },
      {
        name: 'traffic_source',
        type: 'STRUCT',
        typeText: 'STRUCT<source STRING, medium STRING, name STRING>',
        description:
          'USER-scoped first-touch source. It never changes for a user, which is why ' +
          'it disagrees with session-scoped channel reporting.',
        bytes: 48,
      },
      {
        name: 'device',
        type: 'STRUCT',
        typeText:
          'STRUCT<category STRING, operating_system STRING, browser STRING, mobile_brand_name STRING>',
        description: 'Device context.',
        bytes: 56,
      },
      {
        name: 'geo',
        type: 'STRUCT',
        typeText: 'STRUCT<continent STRING, country STRING, region STRING, city STRING>',
        description: 'Geographic context.',
        bytes: 52,
      },
      {
        name: 'ecommerce',
        type: 'STRUCT',
        typeText:
          'STRUCT<transaction_id STRING, purchase_revenue FLOAT64, tax_value FLOAT64, shipping_value FLOAT64>',
        description: 'Populated on purchase events only.',
        bytes: 44,
      },
    ],
  },
  {
    name: 'ga4_sessions',
    group: 'Web & product',
    grain: 'One row per session',
    description:
      'A pre-flattened session table, so days 1–10 can teach without UNNEST. ' +
      'Day 12 has you rebuild it from ga4_events and reconcile the difference.',
    partitionBy: 'session_date',
    clusterBy: ['channel_group'],
    columns: [
      S('session_key', 'user_pseudo_id + session id.', { pk: true, bytes: 30 }),
      S('user_pseudo_id', 'Device-scoped ID.', { bytes: 24 }),
      T('session_start_ts', 'Session start timestamp.'),
      D('session_date', 'Session date.'),
      S('channel_group', 'Paid Search, Paid Social, Organic Search, Direct, Email, Referral, Display, Affiliate.'),
      S('source', 'Traffic source, e.g. google, facebook.'),
      S('medium', 'Traffic medium, e.g. cpc, organic, email.'),
      S('campaign', 'Campaign name from UTM. NULL for non-campaign traffic.', { nullable: true, bytes: 24 }),
      I('campaign_id', 'Ad platform campaign ID when resolvable.', { nullable: true }),
      S('device_category', 'desktop, mobile or tablet.'),
      S('country', 'Country name.'),
      S('city', 'City name.'),
      S('landing_page', 'First page path of the session.', { fk: 'landing_pages.page_path', bytes: 22 }),
      I('page_views', 'Page views in the session.'),
      I('engaged', '1 if the session was engaged (GA4 definition).'),
      I('engagement_time_sec', 'Engaged time in seconds.'),
      I('converted', '1 if the session contained a purchase or signup.'),
      F('revenue', 'Revenue attributed to the session. 0 when it did not convert.'),
    ],
  },
  {
    name: 'product_events',
    group: 'Web & product',
    grain: 'One row per in-product event',
    description:
      'Product analytics in the Mixpanel/Amplitude shape: a flat event stream with a ' +
      'JSON properties bag. This is where activation and aha-moment analysis lives.',
    partitionBy: 'event_time',
    columns: [
      I('event_id', 'Event ID.', { pk: true }),
      S('user_id', 'Product user ID.', { fk: 'customers.customer_id', bytes: 12 }),
      S('event_name', 'activated, invited_teammate, created_report, connected_datasource, exported_csv, hit_paywall, viewed_pricing.'),
      T('event_time', 'Event timestamp.'),
      {
        name: 'properties',
        type: 'STRUCT',
        typeText: 'STRUCT<plan STRING, seats INT64, source STRING, value FLOAT64>',
        description: 'Event properties bag.',
        bytes: 60,
      },
      S('platform', 'web, ios or android.'),
      S('app_version', 'Semantic version string.'),
    ],
  },
  {
    name: 'landing_pages',
    group: 'Web & product',
    grain: 'One row per landing page',
    description: 'Landing page dimensions, including the live A/B variant.',
    columns: [
      S('page_path', 'URL path.', { pk: true, sample: '/lp/run-faster', bytes: 22 }),
      S('page_title', 'Page title.', { bytes: 34 }),
      S('template', 'long-form, short-form, product, category, pricing or blog.'),
      S('ab_variant', 'A or B. NULL when the page is not under test.', { nullable: true }),
      I('is_paid_lp', '1 if the page is a dedicated paid landing page.'),
      D('published_date', 'Publish date.'),
    ],
  },

  // ─────────────────────────────────────────────────────────────── CRM ──
  {
    name: 'hubspot_contacts',
    group: 'CRM',
    grain: 'One row per contact',
    description:
      'HubSpot contacts with lifecycle-stage timestamps. The stage dates are NULL ' +
      'until the contact reaches that stage, which makes them perfect for funnel and ' +
      'velocity analysis.',
    columns: [
      I('contact_id', 'Contact ID.', { pk: true }),
      D('created_date', 'Date the contact was created.'),
      S('lifecycle_stage', 'subscriber, lead, mql, sql, opportunity or customer.'),
      S('original_source', 'First-touch source.'),
      S('original_medium', 'First-touch medium.'),
      S('original_campaign', 'First-touch campaign. NULL for organic/direct.', { nullable: true, bytes: 24 }),
      S('country', 'Country.'),
      S('job_title', 'Self-reported job title.', { bytes: 24 }),
      I('company_id', 'Associated Salesforce account. NULL for unmatched contacts.', {
        nullable: true,
        fk: 'salesforce_accounts.account_id',
      }),
      D('mql_date', 'Date the contact became an MQL. NULL if never.', { nullable: true }),
      D('sql_date', 'Date the contact became an SQL. NULL if never.', { nullable: true }),
      D('became_customer_date', 'Date the contact became a customer. NULL if never.', { nullable: true }),
    ],
  },
  {
    name: 'hubspot_deals',
    group: 'CRM',
    grain: 'One row per deal',
    description:
      'Deals in the sales pipeline. `is_won` is NULL for open deals — neither won nor ' +
      'lost — which breaks any win-rate calculation that uses `= 0` instead of `IS NULL`.',
    columns: [
      I('deal_id', 'Deal ID.', { pk: true }),
      I('contact_id', 'Primary contact.', { fk: 'hubspot_contacts.contact_id' }),
      S('deal_name', 'Deal name.', { bytes: 30 }),
      S('pipeline', 'New Business or Expansion.'),
      S('stage', 'discovery, demo, proposal, negotiation, closed_won or closed_lost.'),
      F('amount', 'Deal amount in USD.'),
      D('created_date', 'Created date.'),
      D('close_date', 'Close date. NULL while open.', { nullable: true }),
      I('is_won', '1 won, 0 lost, NULL still open.', { nullable: true }),
    ],
  },
  {
    name: 'salesforce_accounts',
    group: 'CRM',
    grain: 'One row per account',
    description: 'Salesforce accounts — the B2B company dimension.',
    columns: [
      I('account_id', 'Account ID.', { pk: true }),
      S('account_name', 'Company name.', { bytes: 24 }),
      S('industry', 'Industry.'),
      I('employee_count', 'Employee count.'),
      S('country', 'HQ country.'),
      S('tier', 'SMB, MidMarket or Enterprise.'),
      D('created_date', 'Account creation date.'),
    ],
  },
  {
    name: 'salesforce_opportunities',
    group: 'CRM',
    grain: 'One row per opportunity',
    description:
      'Pipeline with ARR. `campaign_id` is NULL on roughly a third of opportunities — ' +
      'the classic attribution gap between sales-sourced and marketing-sourced revenue.',
    columns: [
      I('opportunity_id', 'Opportunity ID.', { pk: true }),
      I('account_id', 'Account.', { fk: 'salesforce_accounts.account_id' }),
      S('owner_name', 'Account executive.', { bytes: 18 }),
      S('stage', 'Prospecting, Qualification, Proposal, Negotiation, Closed Won or Closed Lost.'),
      F('amount', 'Total contract value in USD.'),
      F('arr', 'Annual recurring revenue in USD.'),
      D('created_date', 'Created date.'),
      D('close_date', 'Close date. NULL while open.', { nullable: true }),
      I('is_won', '1 won, 0 lost, NULL still open.', { nullable: true }),
      S('lead_source', 'Paid Search, Paid Social, Webinar, Outbound, Referral, Organic or Partner.'),
      I('campaign_id', 'Sourcing campaign. NULL when sales-sourced.', { nullable: true }),
    ],
  },

  // ─────────────────────────────────────────────────────────── Revenue ──
  {
    name: 'customers',
    group: 'Revenue',
    grain: 'One row per customer',
    description:
      'The customer dimension, spanning both the B2C store and the B2B SaaS product.',
    columns: [
      S('customer_id', 'Customer ID.', { pk: true, sample: 'C0004821', bytes: 8 }),
      D('signup_date', 'Signup date.'),
      S('first_touch_channel', 'Channel of the first recorded marketing touch.'),
      S('last_touch_channel', 'Channel of the touch immediately before conversion.'),
      I('first_campaign_id', 'Campaign of the first touch. NULL for organic/direct.', { nullable: true }),
      S('country', 'Country.'),
      S('city', 'City — deliberately messy: mixed case and stray whitespace.', { sample: ' london' }),
      S('segment', 'B2C or B2B.'),
      I('is_b2b', '1 for B2B customers.'),
      S('email_domain', 'Email domain, e.g. gmail.com or acme.io.', { bytes: 18 }),
    ],
  },
  {
    name: 'orders',
    group: 'Revenue',
    grain: 'One row per order',
    description:
      'E-commerce orders. Refunds appear as negative `gross_revenue`, about 0.4% of ' +
      'rows are exact duplicates from a broken webhook replay, and some `campaign_id` ' +
      'values point at campaigns that no longer exist.',
    partitionBy: 'order_date',
    clusterBy: ['customer_id'],
    columns: [
      I('order_id', 'Order ID. Not unique — the webhook replay duplicated some.', { sample: '80231' }),
      S('customer_id', 'Customer.', { fk: 'customers.customer_id' }),
      T('order_ts', 'Order timestamp.'),
      D('order_date', 'Order date.'),
      S('status', 'completed, refunded, cancelled or pending.'),
      F('gross_revenue', 'Gross revenue in USD. Negative on refunds.'),
      F('discount_amount', 'Discount applied in USD.'),
      F('shipping_amount', 'Shipping charged in USD.'),
      F('tax_amount', 'Tax in USD.'),
      F('cogs', 'Cost of goods sold in USD.'),
      S('channel', 'Attributed acquisition channel.'),
      I('campaign_id', 'Attributed campaign. NULL or orphaned for some rows.', { nullable: true }),
      S('device', 'desktop, mobile or tablet.'),
      S('country', 'Shipping country.'),
      S('city', 'Shipping city — messy, same as customers.city.'),
      S('coupon_code', 'Coupon used. NULL when none.', { nullable: true }),
      I('is_first_order', '1 if this is the customer\'s first order.'),
    ],
  },
  {
    name: 'order_items',
    group: 'Revenue',
    grain: 'One row per order × product',
    description:
      'Order line items. Joining orders to this table and summing `orders.gross_revenue` ' +
      'inflates revenue by 2.19× — the fan-out trap taught on day 7.',
    columns: [
      I('order_id', 'Order.', { fk: 'orders.order_id' }),
      I('product_id', 'Product.', { fk: 'products.product_id' }),
      I('quantity', 'Units.'),
      F('unit_price', 'Price per unit in USD.'),
      F('line_discount', 'Discount on this line in USD.'),
    ],
  },
  {
    name: 'products',
    group: 'Revenue',
    grain: 'One row per product',
    description: 'Product catalogue with unit economics.',
    columns: [
      I('product_id', 'Product ID.', { pk: true }),
      S('product_name', 'Product name.', { bytes: 26 }),
      S('category', 'Footwear, Apparel, Accessories, Nutrition or Equipment.'),
      S('brand', 'Brand.'),
      F('unit_cost', 'Unit cost in USD.'),
      F('list_price', 'List price in USD.'),
      D('launch_date', 'Launch date.'),
      I('is_active', '1 if currently sold.'),
    ],
  },
  {
    name: 'plans',
    group: 'Revenue',
    grain: 'One row per plan',
    description: 'SaaS plan catalogue.',
    columns: [
      I('plan_id', 'Plan ID.', { pk: true }),
      S('plan_name', 'Plan name.'),
      S('tier', 'Starter, Growth, Scale or Enterprise.'),
      F('list_mrr', 'List MRR in USD.'),
      I('seats_included', 'Seats included in the plan.'),
      S('billing_interval', 'monthly or annual.'),
    ],
  },
  {
    name: 'subscriptions',
    group: 'Revenue',
    grain: 'One row per subscription',
    description:
      'SaaS subscriptions. MRR movements — new, expansion, contraction, churn, ' +
      'reactivation — are derived from these rows on day 13.',
    columns: [
      I('subscription_id', 'Subscription ID.', { pk: true }),
      S('customer_id', 'Customer.', { fk: 'customers.customer_id' }),
      I('plan_id', 'Plan.', { fk: 'plans.plan_id' }),
      F('mrr', 'Current monthly recurring revenue in USD.'),
      S('status', 'trialing, active, past_due or canceled.'),
      D('started_at', 'Subscription start date.'),
      D('trial_end_at', 'Trial end date. NULL if the plan had no trial.', { nullable: true }),
      D('canceled_at', 'Cancellation date. NULL if still subscribed.', { nullable: true }),
      S('cancel_reason', 'Stated cancellation reason. NULL if still subscribed.', { nullable: true }),
      I('seats', 'Purchased seats.'),
    ],
  },
  {
    name: 'stripe_charges',
    group: 'Revenue',
    grain: 'One row per charge attempt',
    description:
      'Stripe charges, including failures. Involuntary churn hides in the ' +
      '`failure_code` column and is usually the cheapest churn to fix.',
    partitionBy: 'created_at',
    columns: [
      S('charge_id', 'Charge ID.', { pk: true, sample: 'ch_1P4x…', bytes: 20 }),
      S('customer_id', 'Customer.', { fk: 'customers.customer_id' }),
      I('subscription_id', 'Subscription. NULL for one-off charges.', { nullable: true }),
      F('amount', 'Charge amount in USD.'),
      S('currency', 'ISO currency code — always usd here.'),
      T('created_at', 'Charge timestamp.'),
      S('status', 'succeeded, failed or refunded.'),
      F('refunded_amount', 'Amount refunded in USD. 0 when none.'),
      S('failure_code', 'card_declined, insufficient_funds, expired_card. NULL on success.', { nullable: true }),
      S('card_brand', 'visa, mastercard, amex.'),
      S('card_country', 'Issuing country ISO-2.'),
    ],
  },

  // ───────────────────────────────────────────────────────── Lifecycle ──
  {
    name: 'email_campaigns',
    group: 'Lifecycle',
    grain: 'One row per email send',
    description: 'Lifecycle email performance including attributed revenue.',
    columns: [
      I('email_id', 'Email send ID.', { pk: true }),
      S('campaign_name', 'Send name.', { bytes: 30 }),
      D('sent_date', 'Send date.'),
      S('segment', 'Audience segment.'),
      S('subject_line', 'Subject line.', { bytes: 48 }),
      I('sent', 'Emails sent.'),
      I('delivered', 'Emails delivered.'),
      I('unique_opens', 'Unique opens.'),
      I('unique_clicks', 'Unique clicks.'),
      I('unsubscribes', 'Unsubscribes.'),
      I('bounces', 'Bounces.'),
      F('attributed_revenue', 'Revenue attributed to the send in USD.'),
    ],
  },
  {
    name: 'support_tickets',
    group: 'Lifecycle',
    grain: 'One row per ticket',
    description:
      'Support tickets. Unresolved tickets have NULL `resolved_at`, so averaging ' +
      'resolution time silently reports only on the tickets that got solved.',
    columns: [
      I('ticket_id', 'Ticket ID.', { pk: true }),
      S('customer_id', 'Customer.', { fk: 'customers.customer_id' }),
      T('created_at', 'Created timestamp.'),
      T('first_response_at', 'First response timestamp. NULL if never answered.', { nullable: true }),
      T('resolved_at', 'Resolution timestamp. NULL while open.', { nullable: true }),
      S('channel', 'email, chat or phone.'),
      S('priority', 'low, normal, high or urgent.'),
      S('category', 'billing, bug, how-to, feature-request or outage.'),
      I('csat', 'CSAT 1–5. NULL when not surveyed.', { nullable: true }),
    ],
  },
  {
    name: 'attribution_touchpoints',
    group: 'Lifecycle',
    grain: 'One row per marketing touch',
    description:
      'Every marketing touch on every journey, ordered and positioned. This one table ' +
      'lets you build first-touch, last-touch, linear, time-decay and position-based ' +
      'attribution side by side and watch them disagree.',
    partitionBy: 'touch_ts',
    clusterBy: ['channel'],
    columns: [
      I('touch_id', 'Touch ID.', { pk: true }),
      S('customer_id', 'Customer, once known. NULL for journeys that never converted.', { nullable: true }),
      S('user_pseudo_id', 'Device ID, always present.', { bytes: 24 }),
      T('touch_ts', 'Touch timestamp.'),
      S('channel', 'Paid Search, Paid Social, Organic Search, Direct, Email, Referral, Display or Affiliate.'),
      S('source', 'Source.'),
      S('medium', 'Medium.'),
      I('campaign_id', 'Campaign. NULL for non-paid touches.', { nullable: true }),
      I('touch_position', 'Position within the journey, 1-indexed.'),
      I('journey_length', 'Total touches in this journey.'),
      I('converted', '1 if the journey ended in a conversion.'),
      F('conversion_value', 'Value of the conversion, repeated on every touch of the journey. 0 if unconverted.'),
    ],
  },

  // ───────────────────────────────────────────────────────── Reference ──
  {
    name: 'date_dim',
    group: 'Reference',
    grain: 'One row per calendar date',
    description:
      'A date spine covering 2024. CROSS JOIN it to guarantee that days with zero ' +
      'activity still appear in your report instead of silently vanishing.',
    columns: [
      D('date', 'Calendar date.', { pk: true }),
      I('day_of_week', 'Day of week, 0 = Sunday.'),
      S('day_name', 'Monday … Sunday.'),
      D('week_start', 'Monday of that week.'),
      D('month_start', 'First day of that month.'),
      S('month_name', 'January … December.'),
      I('quarter', 'Calendar quarter 1–4.'),
      I('year', 'Calendar year.'),
      I('is_weekend', '1 for Saturday and Sunday.'),
      I('is_holiday', '1 for a US retail holiday.'),
      S('holiday_name', 'Holiday name. NULL on ordinary days.', { nullable: true }),
    ],
  },
];

/** Views. Created after all base tables exist. */
export const VIEWS: TableDef[] = [
  {
    name: 'ad_spend_daily',
    group: 'Paid media',
    grain: 'One row per date × channel × campaign',
    description:
      'All three ad platforms normalised into one shape. Use it for blended CAC and ' +
      'blended ROAS. It is a VIEW, so querying it re-runs the union every time — ' +
      'which is exactly the trade-off day 11 asks you to reason about.',
    columns: [
      D('date', 'Reporting date.'),
      S('platform', 'google, meta or linkedin.'),
      S('channel', 'Paid Search or Paid Social.'),
      I('campaign_id', 'Platform campaign ID.'),
      S('campaign_name', 'Platform campaign name.', { bytes: 30 }),
      F('spend', 'Spend in USD.'),
      I('impressions', 'Impressions.'),
      I('clicks', 'Clicks.'),
      F('platform_conversions', 'Conversions as the platform counts them.'),
      F('platform_revenue', 'Revenue as the platform counts it.'),
    ],
    viewSql: `
      CREATE VIEW ad_spend_daily AS
      SELECT d.date                       AS date,
             'google'                     AS platform,
             'Paid Search'                AS channel,
             c.campaign_id                AS campaign_id,
             c.campaign_name              AS campaign_name,
             SUM(d.cost)                  AS spend,
             SUM(d.impressions)           AS impressions,
             SUM(d.clicks)                AS clicks,
             SUM(d.conversions)           AS platform_conversions,
             SUM(d.conversion_value)      AS platform_revenue
      FROM google_ads_daily d
      JOIN google_ads_campaigns c ON c.campaign_id = d.campaign_id
      GROUP BY 1, 2, 3, 4, 5
      UNION ALL
      SELECT m.date, 'meta', 'Paid Social', c.campaign_id, c.campaign_name,
             SUM(m.spend), SUM(m.impressions), SUM(m.clicks),
             SUM(m.purchases), SUM(m.purchase_value)
      FROM meta_ads_daily m
      JOIN meta_ads_campaigns c ON c.campaign_id = m.campaign_id
      GROUP BY 1, 2, 3, 4, 5
      UNION ALL
      SELECT l.date, 'linkedin', 'Paid Social', c.campaign_id, c.campaign_name,
             SUM(l.spend), SUM(l.impressions), SUM(l.clicks),
             SUM(l.leads), 0.0
      FROM linkedin_ads_daily l
      JOIN linkedin_ads_campaigns c ON c.campaign_id = l.campaign_id
      GROUP BY 1, 2, 3, 4, 5
    `,
  },
  {
    name: 'customer_ltv',
    group: 'Revenue',
    grain: 'One row per customer',
    description:
      'Convenience view: lifetime gross revenue, order count and lifespan per ' +
      'customer. Day 13 has you rebuild it from scratch before you are allowed to use it.',
    columns: [
      S('customer_id', 'Customer.'),
      D('signup_date', 'Signup date.'),
      S('first_touch_channel', 'First-touch channel.'),
      S('segment', 'B2C or B2B.'),
      I('orders_count', 'Completed orders.'),
      F('lifetime_revenue', 'Net revenue across completed orders in USD.'),
      D('first_order_date', 'First completed order date.'),
      D('last_order_date', 'Most recent completed order date.'),
    ],
    viewSql: `
      CREATE VIEW customer_ltv AS
      SELECT c.customer_id,
             c.signup_date,
             c.first_touch_channel,
             c.segment,
             COUNT(DISTINCT o.order_id)                     AS orders_count,
             COALESCE(SUM(o.gross_revenue), 0)              AS lifetime_revenue,
             MIN(o.order_date)                              AS first_order_date,
             MAX(o.order_date)                              AS last_order_date
      FROM customers c
      LEFT JOIN orders o
             ON o.customer_id = c.customer_id
            AND o.status = 'completed'
      GROUP BY 1, 2, 3, 4
    `,
  },
];

const SQLITE_TYPE: Record<BqType, string> = {
  STRING: 'TEXT',
  INT64: 'INTEGER',
  FLOAT64: 'REAL',
  NUMERIC: 'REAL',
  BOOL: 'INTEGER',
  DATE: 'TEXT',
  TIMESTAMP: 'TEXT',
  ARRAY: 'TEXT',
  STRUCT: 'TEXT',
};

export function createTableSql(t: TableDef): string {
  const cols = t.columns
    .map((c) => `  "${c.name}" ${SQLITE_TYPE[c.type]}`)
    .join(',\n');
  return `CREATE TABLE "${t.name}" (\n${cols}\n)`;
}

/** Indexes that make the exercise queries feel instant. */
export const INDEXES: string[] = [
  'CREATE INDEX idx_gad_date ON google_ads_daily(date)',
  'CREATE INDEX idx_gad_campaign ON google_ads_daily(campaign_id)',
  'CREATE INDEX idx_gkd_date ON google_ads_keyword_daily(date)',
  'CREATE INDEX idx_gkd_keyword ON google_ads_keyword_daily(keyword_id)',
  'CREATE INDEX idx_meta_date ON meta_ads_daily(date)',
  'CREATE INDEX idx_meta_campaign ON meta_ads_daily(campaign_id)',
  'CREATE INDEX idx_li_date ON linkedin_ads_daily(date)',
  'CREATE INDEX idx_ev_name_date ON ga4_events(event_name, event_date)',
  'CREATE INDEX idx_ev_date ON ga4_events(event_date)',
  'CREATE INDEX idx_ev_user ON ga4_events(user_pseudo_id)',
  'CREATE INDEX idx_ev_session ON ga4_events(ga_session_id)',
  'CREATE INDEX idx_sess_date ON ga4_sessions(session_date)',
  'CREATE INDEX idx_sess_channel ON ga4_sessions(channel_group)',
  'CREATE INDEX idx_ord_customer ON orders(customer_id)',
  'CREATE INDEX idx_ord_date ON orders(order_date)',
  'CREATE INDEX idx_oi_order ON order_items(order_id)',
  'CREATE INDEX idx_sub_customer ON subscriptions(customer_id)',
  'CREATE INDEX idx_chg_customer ON stripe_charges(customer_id)',
  'CREATE INDEX idx_tp_customer ON attribution_touchpoints(customer_id)',
  'CREATE INDEX idx_tp_pseudo ON attribution_touchpoints(user_pseudo_id)',
  'CREATE INDEX idx_pe_user ON product_events(user_id)',
];

export const ALL_TABLE_DEFS: TableDef[] = [...TABLES, ...VIEWS];

export function findTable(name: string): TableDef | undefined {
  const bare = name.split('.').pop()?.replace(/`/g, '');
  return ALL_TABLE_DEFS.find((t) => t.name === bare);
}
