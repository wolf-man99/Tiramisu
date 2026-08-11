/**
 * Deterministic generator for the Northbeam marketing warehouse.
 *
 * Every number here is chosen to be defensible: CTRs sit in real ranges for their
 * channel, CPCs reflect auction competitiveness, conversion rates fall off with
 * funnel depth, B2B seasonality dips in summer while B2C peaks at Black Friday, and
 * roughly 3% of rows are dirty on purpose (see docs/DATA-MODEL.md §A.6).
 *
 * IMPORTANT: the order of RNG draws is part of the contract. Adding a new generator
 * anywhere except the end of `generateWarehouse()` shifts every downstream value and
 * invalidates the reference solutions. `npm run validate:content` will catch it.
 */

import { Rng, round2, round4 } from './prng';

export interface Dataset {
  table: string;
  columns: string[];
  rows: unknown[][];
}

const SEED = 20240614;
const DAY_MS = 86_400_000;
const START_MS = Date.UTC(2024, 0, 1);
const DAYS = 366; // 2024 is a leap year, on purpose.

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const isoTs = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
const dayMs = (i: number) => START_MS + i * DAY_MS;
const dayIso = (i: number) => iso(dayMs(i));
const compact = (i: number) => dayIso(i).replace(/-/g, '');

const MONTH_FACTOR = [0.9, 0.93, 1.0, 1.03, 1.05, 0.97, 0.88, 0.9, 1.04, 1.1, 1.38, 1.22];
const DOW_B2C = [1.05, 0.95, 0.96, 0.98, 1.0, 1.06, 1.12]; // Sun..Sat
const DOW_B2B = [0.35, 1.18, 1.22, 1.2, 1.15, 0.95, 0.38];

const HOLIDAYS: Record<string, string> = {
  '2024-01-01': "New Year's Day",
  '2024-01-15': 'MLK Day',
  '2024-02-19': "Presidents' Day",
  '2024-05-27': 'Memorial Day',
  '2024-07-04': 'Independence Day',
  '2024-09-02': 'Labor Day',
  '2024-11-28': 'Thanksgiving',
  '2024-11-29': 'Black Friday',
  '2024-12-02': 'Cyber Monday',
  '2024-12-24': 'Christmas Eve',
  '2024-12-25': 'Christmas Day',
  '2024-12-31': "New Year's Eve",
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function seasonB2C(i: number): number {
  const d = new Date(dayMs(i));
  let f = MONTH_FACTOR[d.getUTCMonth()] * DOW_B2C[d.getUTCDay()];
  const key = dayIso(i);
  if (key === '2024-11-29') f *= 3.4; // Black Friday
  if (key === '2024-11-30') f *= 2.1;
  if (key === '2024-12-02') f *= 2.6; // Cyber Monday
  if (key === '2024-12-25') f *= 0.25;
  if (key === '2024-07-04') f *= 0.55;
  return f;
}

function seasonB2B(i: number): number {
  const d = new Date(dayMs(i));
  const m = d.getUTCMonth();
  const base = [0.85, 1.0, 1.12, 1.05, 1.02, 1.08, 0.78, 0.72, 1.14, 1.18, 1.05, 0.82][m];
  let f = base * DOW_B2B[d.getUTCDay()];
  if (HOLIDAYS[dayIso(i)]) f *= 0.3;
  return f;
}

// ─────────────────────────────────────────────────────────── name pools ──

const COUNTRIES = ['US', 'GB', 'DE', 'IN', 'AU', 'CA', 'FR', 'BR'];
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', DE: 'Germany', IN: 'India',
  AU: 'Australia', CA: 'Canada', FR: 'France', BR: 'Brazil',
};
const CITIES: Record<string, string[]> = {
  US: ['New York', 'Los Angeles', 'Chicago', 'Austin', 'Seattle', 'Denver', 'Miami', 'Boston'],
  GB: ['London', 'Manchester', 'Bristol', 'Edinburgh', 'Leeds', 'Birmingham'],
  DE: ['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt'],
  IN: ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai'],
  AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
  CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
  FR: ['Paris', 'Lyon', 'Marseille', 'Toulouse'],
  BR: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte'],
};

const CHANNEL_GROUPS = [
  'Paid Search', 'Paid Social', 'Organic Search', 'Direct',
  'Email', 'Referral', 'Display', 'Affiliate',
] as const;

const COMPANY_WORDS_A = [
  'North', 'Bright', 'Cobalt', 'Vertex', 'Lumen', 'Atlas', 'Quanta', 'Ember', 'Nimbus',
  'Orbit', 'Slate', 'Harbor', 'Pivot', 'Kite', 'Forge', 'Delta', 'Prism', 'Junction',
];
const COMPANY_WORDS_B = [
  'Labs', 'Works', 'Systems', 'Digital', 'Health', 'Logistics', 'Retail', 'Studio',
  'Analytics', 'Robotics', 'Finance', 'Media', 'Cloud', 'Group',
];
const INDUSTRIES = [
  'Software', 'E-commerce', 'Financial Services', 'Healthcare', 'Manufacturing',
  'Media', 'Logistics', 'Education', 'Real Estate', 'Travel',
];
const JOB_TITLES = [
  'Growth Marketing Manager', 'Head of Performance', 'Marketing Director',
  'Demand Generation Lead', 'CMO', 'Digital Marketing Specialist', 'Marketing Analyst',
  'VP Marketing', 'Paid Media Manager', 'Lifecycle Marketing Manager',
  'Founder', 'Head of Ecommerce',
];
const AE_NAMES = [
  'Dana Whitfield', 'Ibrahim Kone', 'Rachel Okonkwo', 'Ben Sorensen',
  'Camila Duarte', 'Nikhil Rao', 'Erin Gallagher', 'Tobias Klein',
];

// ══════════════════════════════════════════════════════════════════════════
export function generateWarehouse(): Dataset[] {
  const rng = new Rng(SEED);
  const out: Dataset[] = [];
  const ds = (table: string, columns: string[], rows: unknown[][]) => {
    out.push({ table, columns, rows });
    return rows;
  };

  // ───────────────────────────────────────────────────────── date_dim ──
  {
    const rows: unknown[][] = [];
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(dayMs(i));
      const dow = d.getUTCDay();
      const mondayOffset = (dow + 6) % 7;
      const key = dayIso(i);
      rows.push([
        key,
        dow,
        DAY_NAMES[dow],
        iso(dayMs(i) - mondayOffset * DAY_MS),
        `${key.slice(0, 7)}-01`,
        MONTH_NAMES[d.getUTCMonth()],
        Math.floor(d.getUTCMonth() / 3) + 1,
        d.getUTCFullYear(),
        dow === 0 || dow === 6 ? 1 : 0,
        HOLIDAYS[key] ? 1 : 0,
        HOLIDAYS[key] ?? null,
      ]);
    }
    ds('date_dim', ['date', 'day_of_week', 'day_name', 'week_start', 'month_start',
      'month_name', 'quarter', 'year', 'is_weekend', 'is_holiday', 'holiday_name'], rows);
  }

  // ───────────────────────────────────────────────────────── products ──
  const PRODUCT_SPECS: Array<[string, string, string, number, number]> = [
    ['Velocity Trail Runner', 'Footwear', 'Northbeam', 42, 129],
    ['Velocity Road Runner 2', 'Footwear', 'Northbeam', 38, 119],
    ['Summit Hiking Boot', 'Footwear', 'Ridgeline', 61, 189],
    ['Featherweight Racer', 'Footwear', 'Northbeam', 48, 159],
    ['Everyday Trainer', 'Footwear', 'Northbeam', 31, 89],
    ['Thermal Base Layer', 'Apparel', 'Ridgeline', 14, 49],
    ['Windbreaker Shell', 'Apparel', 'Ridgeline', 27, 95],
    ['Performance Tee', 'Apparel', 'Northbeam', 8, 32],
    ['Compression Tights', 'Apparel', 'Northbeam', 16, 58],
    ['Insulated Vest', 'Apparel', 'Ridgeline', 33, 110],
    ['Trail Running Vest', 'Equipment', 'Ridgeline', 29, 98],
    ['Hydration Bladder 2L', 'Equipment', 'Ridgeline', 11, 38],
    ['Carbon Trekking Poles', 'Equipment', 'Summit Co', 44, 145],
    ['Headlamp 800lm', 'Equipment', 'Summit Co', 19, 62],
    ['GPS Watch Pro', 'Equipment', 'Northbeam', 121, 349],
    ['Merino Running Socks', 'Accessories', 'Northbeam', 5, 19],
    ['Reflective Arm Band', 'Accessories', 'Northbeam', 3, 14],
    ['Sport Sunglasses', 'Accessories', 'Summit Co', 21, 79],
    ['Recovery Sandals', 'Accessories', 'Northbeam', 12, 45],
    ['Electrolyte Tabs 20pk', 'Nutrition', 'FuelWorks', 4, 15],
    ['Energy Gel Box 24', 'Nutrition', 'FuelWorks', 18, 54],
    ['Recovery Protein 1kg', 'Nutrition', 'FuelWorks', 16, 48],
    ['Endurance Drink Mix', 'Nutrition', 'FuelWorks', 9, 29],
    ['Trail Snack Bundle', 'Nutrition', 'FuelWorks', 13, 39],
  ];
  const products = PRODUCT_SPECS.map((p, idx) => {
    const launch = rng.int(0, 300);
    return {
      product_id: 5000 + idx,
      product_name: p[0],
      category: p[1],
      brand: p[2],
      unit_cost: p[3],
      list_price: p[4],
      launch_date: dayIso(Math.max(0, launch - 260)),
      is_active: rng.chance(0.9) ? 1 : 0,
    };
  });
  ds('products',
    ['product_id', 'product_name', 'category', 'brand', 'unit_cost', 'list_price', 'launch_date', 'is_active'],
    products.map((p) => [p.product_id, p.product_name, p.category, p.brand, p.unit_cost, p.list_price, p.launch_date, p.is_active]));

  // ──────────────────────────────────────────────────────────── plans ──
  const PLAN_SPECS: Array<[string, string, number, number, string]> = [
    ['Starter Monthly', 'Starter', 49, 3, 'monthly'],
    ['Starter Annual', 'Starter', 41, 3, 'annual'],
    ['Growth Monthly', 'Growth', 199, 10, 'monthly'],
    ['Growth Annual', 'Growth', 166, 10, 'annual'],
    ['Scale Monthly', 'Scale', 599, 25, 'monthly'],
    ['Scale Annual', 'Scale', 499, 25, 'annual'],
    ['Enterprise', 'Enterprise', 1850, 100, 'annual'],
  ];
  const plans = PLAN_SPECS.map((p, i) => ({
    plan_id: 700 + i, plan_name: p[0], tier: p[1], list_mrr: p[2], seats_included: p[3], billing_interval: p[4],
  }));
  ds('plans', ['plan_id', 'plan_name', 'tier', 'list_mrr', 'seats_included', 'billing_interval'],
    plans.map((p) => [p.plan_id, p.plan_name, p.tier, p.list_mrr, p.seats_included, p.billing_interval]));

  // ──────────────────────────────────────────────────── landing_pages ──
  const LP_SPECS: Array<[string, string, string, number]> = [
    ['/', 'Northbeam - Run Further', 'product', 0],
    ['/lp/run-faster', 'Run Faster in 30 Days', 'long-form', 1],
    ['/lp/trail-collection', 'The Trail Collection', 'short-form', 1],
    ['/lp/free-shipping', 'Free Shipping This Week', 'short-form', 1],
    ['/lp/gps-watch', 'GPS Watch Pro - Pre-order', 'product', 1],
    ['/lp/black-friday', 'Black Friday: Up to 40% Off', 'long-form', 1],
    ['/collections/footwear', 'Footwear', 'category', 0],
    ['/collections/apparel', 'Apparel', 'category', 0],
    ['/collections/nutrition', 'Nutrition', 'category', 0],
    ['/products/velocity-trail-runner', 'Velocity Trail Runner', 'product', 0],
    ['/products/gps-watch-pro', 'GPS Watch Pro', 'product', 0],
    ['/pricing', 'Northbeam Analytics - Pricing', 'pricing', 0],
    ['/lp/analytics-demo', 'Book a Demo', 'long-form', 1],
    ['/lp/analytics-trial', 'Start Your Free Trial', 'short-form', 1],
    ['/blog/marathon-training-plan', '16-Week Marathon Plan', 'blog', 0],
    ['/blog/choosing-trail-shoes', 'How to Choose Trail Shoes', 'blog', 0],
  ];
  const landingPages = LP_SPECS.map((l) => ({
    page_path: l[0], page_title: l[1], template: l[2], is_paid_lp: l[3],
    ab_variant: rng.chance(0.45) ? rng.pick(['A', 'B']) : null,
    published_date: dayIso(rng.int(0, 200)),
  }));
  ds('landing_pages', ['page_path', 'page_title', 'template', 'ab_variant', 'is_paid_lp', 'published_date'],
    landingPages.map((l) => [l.page_path, l.page_title, l.template, l.ab_variant, l.is_paid_lp, l.published_date]));

  // ═══════════════════════════════════════════════════════ Google Ads ══
  interface GCampaign {
    campaign_id: number; campaign_name: string; channel_type: string; status: string;
    is_brand: number; country: string; daily_budget: number; start_date: string;
    startDay: number; endDay: number;
    ctr: number; cpc: number; cvr: number; aov: number;
  }
  const G_SPECS: Array<[string, string, number, string]> = [
    // market_channel_brandness_geo_match, channel_type, is_brand, country
    ['US_Search_Brand_US_Exact', 'SEARCH', 1, 'US'],
    ['US_Search_NonBrand_US_Exact', 'SEARCH', 0, 'US'],
    ['US_Search_NonBrand_US_Phrase', 'SEARCH', 0, 'US'],
    ['US_Search_NonBrand_US_Broad', 'SEARCH', 0, 'US'],
    ['US_Shopping_NonBrand_US_All', 'SHOPPING', 0, 'US'],
    ['US_PMax_NonBrand_US_All', 'PMAX', 0, 'US'],
    ['US_Display_Remarketing_US_All', 'DISPLAY', 0, 'US'],
    ['US_Video_Prospecting_US_All', 'VIDEO', 0, 'US'],
    ['GB_Search_Brand_UK_Exact', 'SEARCH', 1, 'GB'],
    ['GB_Search_NonBrand_UK_Exact', 'SEARCH', 0, 'GB'],
    ['GB_Search_NonBrand_UK_Broad', 'SEARCH', 0, 'GB'],
    ['GB_Shopping_NonBrand_UK_All', 'SHOPPING', 0, 'GB'],
    ['GB_PMax_NonBrand_UK_All', 'PMAX', 0, 'GB'],
    ['DE_Search_Brand_DE_Exact', 'SEARCH', 1, 'DE'],
    ['DE_Search_NonBrand_DE_Phrase', 'SEARCH', 0, 'DE'],
    ['DE_PMax_NonBrand_DE_All', 'PMAX', 0, 'DE'],
    ['IN_Search_NonBrand_IN_Broad', 'SEARCH', 0, 'IN'],
    ['IN_Search_Brand_IN_Exact', 'SEARCH', 1, 'IN'],
    ['IN_Display_Prospecting_IN_All', 'DISPLAY', 0, 'IN'],
    ['AU_Search_NonBrand_AU_Exact', 'SEARCH', 0, 'AU'],
    ['AU_Shopping_NonBrand_AU_All', 'SHOPPING', 0, 'AU'],
    ['CA_Search_NonBrand_CA_Phrase', 'SEARCH', 0, 'CA'],
    ['US_Search_SaaS_NonBrand_US_Exact', 'SEARCH', 0, 'US'],
    ['GB_Search_SaaS_NonBrand_UK_Exact', 'SEARCH', 0, 'GB'],
  ];
  const gCampaigns: GCampaign[] = G_SPECS.map((s, i) => {
    const [name, chan, brand, country] = s;
    const geoCost = { US: 1, GB: 0.92, DE: 0.86, IN: 0.22, AU: 0.88, CA: 0.9, FR: 0.8, BR: 0.3 }[country] ?? 1;
    let ctr: number, cpc: number, cvr: number;
    if (chan === 'SEARCH' && brand === 1) { ctr = rng.float(0.13, 0.24); cpc = rng.float(0.35, 1.1); cvr = rng.float(0.09, 0.17); }
    else if (chan === 'SEARCH') { ctr = rng.float(0.031, 0.068); cpc = rng.float(1.4, 4.2); cvr = rng.float(0.019, 0.048); }
    else if (chan === 'SHOPPING') { ctr = rng.float(0.008, 0.021); cpc = rng.float(0.4, 1.15); cvr = rng.float(0.02, 0.042); }
    else if (chan === 'PMAX') { ctr = rng.float(0.011, 0.031); cpc = rng.float(0.5, 1.6); cvr = rng.float(0.028, 0.062); }
    else if (chan === 'DISPLAY') { ctr = rng.float(0.004, 0.009); cpc = rng.float(0.28, 0.9); cvr = rng.float(0.003, 0.011); }
    else { ctr = rng.float(0.003, 0.008); cpc = rng.float(0.09, 0.4); cvr = rng.float(0.002, 0.007); }
    const isSaaS = name.includes('SaaS');
    if (isSaaS) { cpc *= 2.6; cvr *= 0.55; }
    const startDay = rng.chance(0.72) ? 0 : rng.int(20, 190);
    const paused = rng.chance(0.14);
    return {
      campaign_id: 1000 + i,
      campaign_name: name,
      channel_type: chan,
      status: paused ? 'PAUSED' : 'ENABLED',
      is_brand: brand,
      country,
      // Budgets are sized so the account's economics stay defensible against the
      // ~5.8k orders and ~1k subscriptions the rest of the warehouse produces:
      // roughly $450k/yr on Google at a blended CAC in the $60–90 range.
      daily_budget: round2(rng.float(15, 180) * (brand ? 0.45 : 1) * geoCost),
      start_date: dayIso(startDay),
      startDay,
      endDay: paused ? rng.int(200, 340) : DAYS - 1,
      ctr,
      cpc: round2(cpc * geoCost),
      cvr,
      aov: isSaaS ? rng.float(380, 760) : rng.float(72, 168),
    };
  });
  ds('google_ads_campaigns',
    ['campaign_id', 'campaign_name', 'channel_type', 'status', 'is_brand', 'country', 'daily_budget', 'start_date'],
    gCampaigns.map((c) => [c.campaign_id, c.campaign_name, c.channel_type, c.status, c.is_brand, c.country, c.daily_budget, c.start_date]));

  const AD_GROUP_THEMES = [
    'Trail Shoes', 'Road Shoes', 'Running Apparel', 'Hydration', 'GPS Watches',
    'Nutrition', 'Competitor', 'Generic Running', 'Marathon Gear', 'Winter Kit',
    'Analytics Software', 'Attribution Tools', 'Marketing Dashboards',
  ];
  interface GAdGroup { ad_group_id: number; campaign_id: number; ad_group_name: string; status: string; default_cpc_bid: number; }
  const gAdGroups: GAdGroup[] = [];
  let agId = 20000;
  for (const c of gCampaigns) {
    const n = c.channel_type === 'SEARCH' ? rng.int(2, 4) : rng.int(1, 2);
    const themes = rng.shuffle([...AD_GROUP_THEMES]).slice(0, n);
    for (const theme of themes) {
      const suffix = c.campaign_name.includes('Exact') ? 'Exact'
        : c.campaign_name.includes('Phrase') ? 'Phrase'
          : c.campaign_name.includes('Broad') ? 'Broad' : 'All';
      gAdGroups.push({
        ad_group_id: agId++,
        campaign_id: c.campaign_id,
        ad_group_name: `${theme}, ${suffix}`,
        status: c.status === 'PAUSED' ? 'PAUSED' : rng.chance(0.9) ? 'ENABLED' : 'PAUSED',
        default_cpc_bid: round2(c.cpc * rng.float(0.9, 1.4)),
      });
    }
  }
  ds('google_ads_ad_groups', ['ad_group_id', 'campaign_id', 'ad_group_name', 'status', 'default_cpc_bid'],
    gAdGroups.map((a) => [a.ad_group_id, a.campaign_id, a.ad_group_name, a.status, a.default_cpc_bid]));

  // google_ads_daily, date × ad group
  {
    const rows: unknown[][] = [];
    const byCampaign = new Map(gCampaigns.map((c) => [c.campaign_id, c]));
    // Ad-group shares are normalised within a campaign, so a campaign's total daily
    // spend tracks its daily_budget instead of multiplying by its ad-group count.
    const groupsByCampaign = new Map<number, GAdGroup[]>();
    for (const ag of gAdGroups) {
      const list = groupsByCampaign.get(ag.campaign_id) ?? [];
      list.push(ag);
      groupsByCampaign.set(ag.campaign_id, list);
    }
    const shares = new Map<number, number>();
    for (const [, list] of groupsByCampaign) {
      const draws = list.map(() => rng.float(0.5, 1.5));
      const total = draws.reduce((a, b) => a + b, 0);
      list.forEach((ag, i) => shares.set(ag.ad_group_id, draws[i] / total));
    }

    for (const ag of gAdGroups) {
      const c = byCampaign.get(ag.campaign_id)!;
      const share = shares.get(ag.ad_group_id)!;
      for (let i = c.startDay; i <= c.endDay; i++) {
        const isSaaS = c.campaign_name.includes('SaaS');
        const season = isSaaS ? seasonB2B(i) : seasonB2C(i);
        if (rng.chance(0.035)) continue; // reporting gaps happen
        const budget = c.daily_budget * share * season;
        const targetImpr = Math.max(0, (budget / Math.max(c.cpc, 0.05)) / Math.max(c.ctr, 0.0005));
        let impressions = Math.max(0, Math.round(rng.normal(targetImpr, targetImpr * 0.28)));
        // Deliberate defects for the SAFE_DIVIDE lesson: 1.2% of campaign-days serve
        // impressions and get no clicks at all, and 0.8% serve nothing while the
        // campaign is technically live. Both make a naive CTR divide by zero.
        const noClicks = rng.chance(0.012);
        if (rng.chance(0.008)) impressions = 0;
        const clicks = impressions === 0 || noClicks ? 0 : Math.max(0, rng.poisson(impressions * c.ctr));
        const cost = round2(clicks * c.cpc * rng.float(0.85, 1.18));
        // Conversions are whole events drawn from a Poisson, then fractionally
        // attributed: which is how Google reports them, and why a campaign-day with
        // real spend and exactly zero conversions is completely normal.
        const conversions = round2(rng.poisson(clicks * c.cvr) * rng.float(0.72, 1.0));
        const convValue = round2(conversions * c.aov * rng.float(0.75, 1.35));
        const vtc = c.channel_type === 'DISPLAY' || c.channel_type === 'VIDEO'
          ? round2(conversions * rng.float(1.5, 4.5)) : 0;
        rows.push([dayIso(i), c.campaign_id, ag.ad_group_id, impressions, clicks, cost, conversions, convValue, vtc]);
      }
    }
    ds('google_ads_daily',
      ['date', 'campaign_id', 'ad_group_id', 'impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'view_through_conversions'],
      rows);
  }

  // keywords
  const KEYWORD_STEMS = [
    'trail running shoes', 'best trail shoes', 'buy running shoes online', 'marathon shoes',
    'lightweight running shoes', 'waterproof hiking boots', 'running socks merino',
    'gps running watch', 'best gps watch for runners', 'hydration vest running',
    'energy gels for marathon', 'electrolyte tablets', 'compression tights women',
    'mens running jacket', 'northbeam shoes', 'northbeam trail runner review',
    'ridgeline hiking boots', 'summit co trekking poles', 'cheap running shoes',
    'running shoes sale', 'shoes for flat feet running', 'trail shoes for wide feet',
    'marketing attribution software', 'ga4 bigquery export', 'roas tracking tool',
    'marketing analytics platform', 'cac calculator saas', 'ltv analytics tool',
  ];
  interface GKeyword { keyword_id: number; ad_group_id: number; campaign_id: number; keyword_text: string; match_type: string; quality_score: number | null; ctr: number; cpc: number; cvr: number; aov: number; startDay: number; endDay: number; volume: number; }
  const gKeywords: GKeyword[] = [];
  let kwId = 40000;
  {
    const byCampaign = new Map(gCampaigns.map((c) => [c.campaign_id, c]));
    for (const ag of gAdGroups) {
      const c = byCampaign.get(ag.campaign_id)!;
      if (c.channel_type !== 'SEARCH') continue;
      const n = rng.int(3, 7);
      for (let k = 0; k < n; k++) {
        const stem = rng.pick(KEYWORD_STEMS);
        const isSaaSKw = stem.includes('attribution') || stem.includes('analytics') || stem.includes('roas') || stem.includes('cac') || stem.includes('ltv') || stem.includes('ga4');
        const isBrandKw = stem.includes('northbeam') || stem.includes('ridgeline') || stem.includes('summit co');
        const matchType = c.campaign_name.includes('Exact') ? 'EXACT'
          : c.campaign_name.includes('Phrase') ? 'PHRASE' : 'BROAD';
        const lowTraffic = rng.chance(0.18);
        // Keywords are added and paused continuously, so most run for part of the year.
        const kwStart = Math.min(DAYS - 30, c.startDay + (rng.chance(0.55) ? 0 : rng.int(10, 150)));
        const kwEnd = Math.min(c.endDay, kwStart + (rng.chance(0.6) ? DAYS : rng.int(45, 220)));
        gKeywords.push({
          keyword_id: kwId++,
          ad_group_id: ag.ad_group_id,
          campaign_id: c.campaign_id,
          keyword_text: stem,
          match_type: matchType,
          // NULL quality score for low-traffic keywords, a deliberate NULL lesson
          quality_score: lowTraffic ? null : rng.int(isBrandKw ? 8 : 3, isBrandKw ? 10 : 9),
          ctr: c.ctr * rng.float(0.55, 1.7),
          cpc: c.cpc * rng.float(0.7, 1.5),
          cvr: c.cvr * rng.float(0.5, 1.9),
          aov: isSaaSKw ? rng.float(400, 780) : rng.float(70, 175),
          startDay: kwStart,
          endDay: kwEnd,
          volume: lowTraffic ? rng.float(2, 40) : rng.float(60, 2600) * (isBrandKw ? 1.6 : 1),
        });
      }
    }
  }
  ds('google_ads_keywords', ['keyword_id', 'ad_group_id', 'campaign_id', 'keyword_text', 'match_type', 'quality_score'],
    gKeywords.map((k) => [k.keyword_id, k.ad_group_id, k.campaign_id, k.keyword_text, k.match_type, k.quality_score]));

  {
    const rows: unknown[][] = [];
    for (const k of gKeywords) {
      const isSaaSKw = k.aov > 300;
      for (let i = k.startDay; i <= k.endDay; i++) {
        const season = isSaaSKw ? seasonB2B(i) : seasonB2C(i);
        const impressions = Math.max(0, Math.round(rng.normal(k.volume * season, k.volume * 0.35)));
        if (impressions === 0) continue;
        const clicks = rng.poisson(impressions * k.ctr);
        const cost = round2(clicks * k.cpc * rng.float(0.85, 1.2));
        const conversions = round2(rng.poisson(clicks * k.cvr) * rng.float(0.72, 1.0));
        rows.push([
          dayIso(i), k.keyword_id, impressions, clicks, cost, conversions,
          round2(conversions * k.aov * rng.float(0.8, 1.3)),
          rng.chance(0.14) ? null : round4(Math.min(0.99, rng.float(0.12, 0.95))),
        ]);
      }
    }
    ds('google_ads_keyword_daily',
      ['date', 'keyword_id', 'impressions', 'clicks', 'cost', 'conversions', 'conversion_value', 'search_impression_share'],
      rows);
  }

  // ══════════════════════════════════════════════════════════ Meta Ads ══
  const META_SPECS: Array<[string, string]> = [
    ['US | Prospecting | Broad | Evergreen', 'CONVERSIONS'],
    ['US | Prospecting | Interest | Running', 'CONVERSIONS'],
    ['US | Retargeting | ATC 14d', 'CONVERSIONS'],
    ['US | Retargeting | Viewers 30d', 'CONVERSIONS'],
    ['US | Catalog | DPA All Products', 'CATALOG_SALES'],
    ['US | Awareness | Brand Video', 'AWARENESS'],
    ['GB | Prospecting | Lookalike 1%', 'CONVERSIONS'],
    ['GB | Retargeting | ATC 14d', 'CONVERSIONS'],
    ['GB | Catalog | DPA Bestsellers', 'CATALOG_SALES'],
    ['DE | Prospecting | Broad', 'CONVERSIONS'],
    ['IN | Prospecting | Broad', 'TRAFFIC'],
    ['AU | Prospecting | Lookalike 2%', 'CONVERSIONS'],
    ['US | BF/CM | Prospecting', 'CONVERSIONS'],
    ['US | SaaS | Lead Gen Whitepaper', 'LEAD_GENERATION'],
  ];
  interface MCampaign { campaign_id: number; name: string; objective: string; status: string; created: number; country: string; retargeting: boolean; cpm: number; ctr: number; cvr: number; aov: number; startDay: number; endDay: number; }
  const mCampaigns: MCampaign[] = META_SPECS.map((s, i) => {
    const [name, objective] = s;
    const country = name.slice(0, 2);
    const retargeting = name.includes('Retargeting') || name.includes('Catalog');
    const geo = { US: 1, GB: 0.9, DE: 0.82, IN: 0.18, AU: 0.85 }[country] ?? 1;
    const bfcm = name.includes('BF/CM');
    const startDay = bfcm ? 315 : rng.chance(0.75) ? 0 : rng.int(15, 170);
    const endDay = bfcm ? 340 : rng.chance(0.85) ? DAYS - 1 : rng.int(240, 350);
    return {
      campaign_id: 2000 + i,
      name,
      objective,
      status: endDay < DAYS - 1 ? 'PAUSED' : 'ACTIVE',
      created: startDay,
      country,
      retargeting,
      cpm: rng.float(retargeting ? 12 : 7, retargeting ? 26 : 17) * geo,
      ctr: rng.float(retargeting ? 0.015 : 0.008, retargeting ? 0.036 : 0.019),
      cvr: rng.float(retargeting ? 0.04 : 0.009, retargeting ? 0.095 : 0.026),
      aov: name.includes('SaaS') ? rng.float(420, 720) : rng.float(68, 155),
      startDay,
      endDay,
    };
  });
  ds('meta_ads_campaigns', ['campaign_id', 'campaign_name', 'objective', 'buying_type', 'status', 'created_date'],
    mCampaigns.map((c) => [c.campaign_id, c.name, c.objective, rng.chance(0.93) ? 'AUCTION' : 'RESERVED', c.status, dayIso(c.created)]));

  {
    const rows: unknown[][] = [];
    const FORMATS = ['IMAGE', 'VIDEO', 'CAROUSEL', 'REELS'];
    for (const c of mCampaigns) {
      const adsets = rng.int(1, 3);
      for (let a = 0; a < adsets; a++) {
        const adsetId = c.campaign_id * 100 + a;
        const adsetName = `${c.name.split(' | ').slice(1).join(' | ')}, AS${a + 1}`;
        const creatives = rng.int(1, 3);
        for (let cr = 0; cr < creatives; cr++) {
          const creativeId = adsetId * 10 + cr;
          const format = rng.pick(FORMATS);
          // Creative fatigue as a proportional decay with a floor: a creative loses
          // performance as frequency builds, but refreshes and audience churn stop it
          // falling off a cliff. (An absolute per-day decay would drive CTR to zero.)
          const fatigue = rng.float(0.0012, 0.004); // fraction of CTR lost per live day
          const budget = rng.float(5, 45);
          const crStart = c.startDay + rng.int(0, 30);
          const crEnd = Math.min(c.endDay, crStart + rng.int(45, 260));
          for (let i = crStart; i <= crEnd; i++) {
            if (rng.chance(0.05)) continue;
            const season = c.name.includes('SaaS') ? seasonB2B(i) : seasonB2C(i);
            const spend = round2(budget * season * rng.float(0.7, 1.3));
            const impressions = Math.round((spend / c.cpm) * 1000 * rng.float(0.85, 1.15));
            if (impressions <= 0) continue;
            const liveDays = i - crStart;
            const effCtr = c.ctr * Math.max(0.55, 1 - fatigue * liveDays);
            const clicks = rng.poisson(impressions * effCtr);
            const reach = Math.round(impressions / rng.float(1.1, 3.4));
            const purchases = round2(rng.poisson(clicks * c.cvr) * rng.float(0.72, 1.0));
            rows.push([
              dayIso(i), c.campaign_id, adsetId, adsetName, creativeId, format,
              impressions, reach, round2(impressions / Math.max(reach, 1)), clicks, spend,
              purchases, round2(purchases * c.aov * rng.float(0.8, 1.3)),
              format === 'VIDEO' || format === 'REELS' ? Math.round(impressions * rng.float(0.12, 0.42)) : 0,
              format === 'VIDEO' || format === 'REELS' ? Math.round(impressions * rng.float(0.02, 0.11)) : 0,
            ]);
          }
        }
      }
    }
    ds('meta_ads_daily',
      ['date', 'campaign_id', 'adset_id', 'adset_name', 'creative_id', 'creative_format', 'impressions',
        'reach', 'frequency', 'clicks', 'spend', 'purchases', 'purchase_value', 'video_3s_views', 'thruplays'],
      rows);
  }

  // ══════════════════════════════════════════════════════ LinkedIn Ads ══
  const LI_SPECS: Array<[string, string, string, string, string]> = [
    ['NA | Growth Leaders | Attribution Guide', 'LEAD_GEN', 'Marketing', 'Director', '201-500'],
    ['NA | CMOs | Benchmark Report', 'LEAD_GEN', 'Marketing', 'CXO', '1001-5000'],
    ['NA | Analysts | Demo Request', 'WEBSITE_VISITS', 'Marketing', 'Entry', '51-200'],
    ['EMEA | Growth Leaders | Attribution Guide', 'LEAD_GEN', 'Marketing', 'Director', '201-500'],
    ['EMEA | CMOs | Benchmark Report', 'LEAD_GEN', 'Marketing', 'CXO', '1001-5000'],
    ['NA | Ecommerce | ROAS Playbook', 'LEAD_GEN', 'Operations', 'Manager', '51-200'],
    ['APAC | Growth Leaders | Webinar', 'LEAD_GEN', 'Marketing', 'Manager', '201-500'],
    ['NA | Brand | Thought Leadership', 'BRAND_AWARENESS', 'Marketing', 'Director', '5001+'],
  ];
  const liCampaigns = LI_SPECS.map((s, i) => ({
    campaign_id: 3000 + i, name: s[0], objective: s[1], job_function: s[2], seniority: s[3],
    company_size: s[4], status: rng.chance(0.85) ? 'ACTIVE' : 'PAUSED',
    cpc: rng.float(6.2, 14.5), ctr: rng.float(0.0035, 0.0085),
    leadRate: s[1] === 'LEAD_GEN' ? rng.float(0.08, 0.16) : rng.float(0.01, 0.03),
    budget: rng.float(45, 200),
    startDay: rng.chance(0.7) ? 0 : rng.int(30, 200),
  }));
  ds('linkedin_ads_campaigns',
    ['campaign_id', 'campaign_name', 'objective', 'job_function', 'seniority', 'company_size', 'status'],
    liCampaigns.map((c) => [c.campaign_id, c.name, c.objective, c.job_function, c.seniority, c.company_size, c.status]));

  {
    const rows: unknown[][] = [];
    for (const c of liCampaigns) {
      for (let i = c.startDay; i < DAYS; i++) {
        const season = seasonB2B(i);
        if (season < 0.45 || rng.chance(0.08)) continue; // LinkedIn barely runs at weekends
        const spend = round2(c.budget * season * rng.float(0.75, 1.25));
        const clicks = Math.max(0, Math.round(spend / c.cpc));
        const impressions = Math.round(clicks / Math.max(c.ctr, 0.001));
        const opens = Math.round(clicks * rng.float(0.35, 0.7));
        rows.push([dayIso(i), c.campaign_id, impressions, clicks, spend, opens,
          Math.max(0, rng.poisson(clicks * c.leadRate))]);
      }
    }
    ds('linkedin_ads_daily', ['date', 'campaign_id', 'impressions', 'clicks', 'spend', 'lead_form_opens', 'leads'], rows);
  }

  // ═════════════════════════════════════════════════ Salesforce accounts ══
  interface Account { account_id: number; name: string; industry: string; employees: number; country: string; tier: string; created: number; }
  const accounts: Account[] = [];
  for (let i = 0; i < 320; i++) {
    const employees = Math.round(rng.logNormal(4.6, 1.5));
    const tier = employees > 1200 ? 'Enterprise' : employees > 180 ? 'MidMarket' : 'SMB';
    accounts.push({
      account_id: 90000 + i,
      name: `${rng.pick(COMPANY_WORDS_A)}${rng.pick(COMPANY_WORDS_B)}`,
      industry: rng.pick(INDUSTRIES),
      employees,
      country: rng.weighted(COUNTRIES, [40, 16, 10, 12, 6, 7, 5, 4]),
      tier,
      created: rng.int(-400, DAYS - 20),
    });
  }
  ds('salesforce_accounts', ['account_id', 'account_name', 'industry', 'employee_count', 'country', 'tier', 'created_date'],
    accounts.map((a) => [a.account_id, a.name, a.industry, a.employees, a.country, a.tier, iso(dayMs(a.created))]));

  // ═════════════════════════════════════════════════════════ customers ══
  interface Customer {
    customer_id: string; signupDay: number; first_touch_channel: string; last_touch_channel: string;
    first_campaign_id: number | null; country: string; city: string; segment: string;
    is_b2b: number; email_domain: string; propensity: number;
  }
  const paidGoogleIds = gCampaigns.map((c) => c.campaign_id);
  const paidMetaIds = mCampaigns.map((c) => c.campaign_id);
  const liIds = liCampaigns.map((c) => c.campaign_id);

  /**
   * Last-click order attribution is concentrated, not uniform.
   *
   * Search and shopping close orders; upper-funnel prospecting on video, display and
   * Meta's awareness objective does not close anything on a last-click model, those
   * campaigns are bought and judged on view-through, and `view_through_conversions`
   * is where their credit lives. So they are excluded from last-click attribution
   * entirely, which leaves several campaigns with real spend and zero attributed
   * orders. That is both true to life and what makes INNER JOIN vs LEFT JOIN a
   * visible difference on day 6 rather than a lecture.
   */
  const CLOSE_RATE: Record<string, number> = {
    SEARCH: 1, SHOPPING: 0.85, PMAX: 0.7, DISPLAY: 0.35, VIDEO: 0,
  };
  const closesLastClick = (name: string, channel: string) =>
    (CLOSE_RATE[channel] ?? 0.3) > 0 && !name.includes('Prospecting');

  const googleClose = gCampaigns
    .filter((c) => closesLastClick(c.campaign_name, c.channel_type))
    .map((c) => ({ id: c.campaign_id, w: c.daily_budget * CLOSE_RATE[c.channel_type] }));
  const googleCloseIds = googleClose.map((c) => c.id);
  const googleCloseWeights = googleClose.map((c) => c.w);

  const attributionPool = [
    ...googleClose.filter((c) => {
      const camp = gCampaigns.find((g) => g.campaign_id === c.id)!;
      return !camp.campaign_name.includes('SaaS'); // B2B search does not sell shoes
    }),
    ...mCampaigns
      .filter((c) => c.objective !== 'AWARENESS' && !c.name.includes('SaaS'))
      .map((c) => ({ id: c.campaign_id, w: 1 })),
  ];
  const attributionIds = attributionPool.map((a) => a.id);
  const attributionWeights = attributionPool.map((a) => a.w);

  // Only remarketing display is last-click attributable; prospecting display is not.
  const displayRemarketingIds = gCampaigns
    .filter((c) => c.channel_type === 'DISPLAY' && c.campaign_name.includes('Remarketing'))
    .map((c) => c.campaign_id);

  const customers: Customer[] = [];
  const N_CUSTOMERS = 5200;
  for (let i = 0; i < N_CUSTOMERS; i++) {
    const isB2B = rng.chance(0.17);
    const signupDay = Math.floor(
      isB2B
        ? rng.int(0, DAYS - 1)
        // B2C signups follow the Q4 curve
        : Math.min(DAYS - 1, Math.round(Math.pow(rng.next(), 0.78) * (DAYS - 1))),
    );
    const first = rng.weighted(
      CHANNEL_GROUPS as unknown as string[],
      isB2B ? [18, 22, 16, 9, 12, 14, 6, 3] : [26, 24, 15, 11, 8, 6, 7, 3],
    );
    const last = rng.chance(0.42) ? first : rng.weighted(
      CHANNEL_GROUPS as unknown as string[], [24, 15, 14, 20, 13, 6, 5, 3],
    );
    let firstCampaign: number | null = null;
    if (first === 'Paid Search') firstCampaign = rng.weighted(googleCloseIds, googleCloseWeights);
    else if (first === 'Paid Social') firstCampaign = isB2B && rng.chance(0.55) ? rng.pick(liIds) : rng.pick(paidMetaIds);
    else if (first === 'Display') firstCampaign = rng.pick(displayRemarketingIds);
    const country = rng.weighted(COUNTRIES, isB2B ? [42, 15, 11, 9, 6, 8, 5, 4] : [38, 17, 9, 11, 7, 8, 5, 5]);
    let city = rng.pick(CITIES[country]);
    // Deliberate dirt: 6% of city values carry stray whitespace or odd casing.
    const dirt = rng.next();
    if (dirt < 0.03) city = ` ${city}`;
    else if (dirt < 0.045) city = `${city} `;
    else if (dirt < 0.06) city = city.toLowerCase();
    customers.push({
      customer_id: `C${String(100000 + i).slice(1)}`,
      signupDay,
      first_touch_channel: first,
      last_touch_channel: last,
      first_campaign_id: firstCampaign,
      country,
      city,
      segment: isB2B ? 'B2B' : 'B2C',
      is_b2b: isB2B ? 1 : 0,
      email_domain: isB2B
        ? `${rng.pick(COMPANY_WORDS_A).toLowerCase()}${rng.pick(['', 'labs', 'hq'])}.${rng.pick(['com', 'io', 'co'])}`
        : rng.weighted(['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'proton.me'], [58, 18, 11, 9, 4]),
      propensity: rng.logNormal(0, 0.75),
    });
  }
  ds('customers',
    ['customer_id', 'signup_date', 'first_touch_channel', 'last_touch_channel', 'first_campaign_id',
      'country', 'city', 'segment', 'is_b2b', 'email_domain'],
    customers.map((c) => [c.customer_id, dayIso(c.signupDay), c.first_touch_channel, c.last_touch_channel,
      c.first_campaign_id, c.country, c.city, c.segment, c.is_b2b, c.email_domain]));

  // ════════════════════════════════════════════════════ orders + items ══
  const orderRows: unknown[][] = [];
  const itemRows: unknown[][] = [];
  const ORDER_COLS = ['order_id', 'customer_id', 'order_ts', 'order_date', 'status', 'gross_revenue',
    'discount_amount', 'shipping_amount', 'tax_amount', 'cogs', 'channel', 'campaign_id',
    'device', 'country', 'city', 'coupon_code', 'is_first_order'];
  const COUPONS = ['WELCOME10', 'BF40', 'FREESHIP', 'RUNCLUB15', 'CYBER25', 'VIP20'];
  let orderId = 80000;
  const customerOrderDates = new Map<string, number[]>();

  for (const c of customers) {
    if (c.is_b2b && rng.chance(0.72)) continue; // most B2B buys via subscription, not orders
    const expected = Math.max(0, rng.poisson(1.35 * c.propensity));
    const nOrders = c.is_b2b ? Math.min(expected, 3) : expected;
    let first = true;
    const dates: number[] = [];
    for (let o = 0; o < nOrders; o++) {
      const gap = o === 0 ? rng.int(0, 5) : Math.round(rng.logNormal(3.3, 0.9));
      const day = (dates.length ? dates[dates.length - 1] : c.signupDay) + gap;
      if (day >= DAYS) break;
      dates.push(day);
      const seasonMult = seasonB2C(day) > 2 ? rng.float(1.15, 1.6) : 1;
      const nLines = Math.max(1, rng.poisson(1.4));
      let gross = 0;
      let cogs = 0;
      const chosen = rng.shuffle([...products]).slice(0, nLines);
      const lines: unknown[][] = [];
      for (const p of chosen) {
        const qty = rng.weighted([1, 1, 1, 2, 2, 3], [40, 20, 10, 18, 8, 4]);
        const unitPrice = round2(p.list_price * rng.float(0.85, 1.0));
        const lineDiscount = rng.chance(0.28) ? round2(unitPrice * qty * rng.float(0.05, 0.35)) : 0;
        gross += unitPrice * qty - lineDiscount;
        cogs += p.unit_cost * qty;
        lines.push([0, p.product_id, qty, unitPrice, lineDiscount]);
      }
      gross = round2(gross * seasonMult);
      const statusRoll = rng.next();
      const status = statusRoll < 0.885 ? 'completed'
        : statusRoll < 0.945 ? 'refunded'
          : statusRoll < 0.978 ? 'cancelled' : 'pending';
      const hhmm = rng.weighted([9, 12, 13, 17, 19, 20, 21, 22], [8, 12, 14, 11, 15, 18, 14, 8]);
      const ts = dayMs(day) + hhmm * 3600_000 + rng.int(0, 3599) * 1000;
      const useCoupon = rng.chance(0.31);
      let campaignId: number | null = c.first_campaign_id;
      if (rng.chance(0.34)) campaignId = null;
      else if (rng.chance(0.04)) campaignId = 9500 + rng.int(0, 40); // orphan FK, on purpose
      else if (rng.chance(0.3)) campaignId = rng.weighted(attributionIds, attributionWeights);
      const signedGross = status === 'refunded' ? -Math.abs(gross) : gross;
      orderRows.push([
        orderId, c.customer_id, isoTs(ts), dayIso(day), status, round2(signedGross),
        round2(lines.reduce((a, l) => a + (l[4] as number), 0)),
        round2(gross > 120 ? 0 : rng.float(4.9, 12.9)),
        round2(Math.abs(gross) * 0.08),
        round2(cogs),
        c.last_touch_channel, campaignId,
        rng.weighted(['mobile', 'desktop', 'tablet'], [58, 36, 6]),
        c.country, c.city,
        useCoupon ? rng.pick(COUPONS) : null,
        first ? 1 : 0,
      ]);
      for (const l of lines) { l[0] = orderId; itemRows.push(l); }
      orderId++;
      first = false;
    }
    if (dates.length) customerOrderDates.set(c.customer_id, dates);
  }
  // Deliberate defect: a webhook replay duplicated 26 orders exactly.
  {
    const dupes = rng.shuffle([...orderRows]).slice(0, 26);
    for (const d of dupes) orderRows.push([...d]);
  }
  ds('orders', ORDER_COLS, orderRows);
  ds('order_items', ['order_id', 'product_id', 'quantity', 'unit_price', 'line_discount'], itemRows);

  // ═════════════════════════════════════════════════════ subscriptions ══
  interface Sub { subscription_id: number; customer_id: string; plan_id: number; mrr: number; status: string; startDay: number; trialEnd: number | null; cancelDay: number | null; reason: string | null; seats: number; }
  const subs: Sub[] = [];
  const CANCEL_REASONS = ['too_expensive', 'missing_features', 'switched_competitor', 'no_longer_needed', 'poor_support', 'payment_failed'];
  let subId = 60000;
  for (const c of customers) {
    if (!c.is_b2b && !rng.chance(0.06)) continue; // a few B2C users buy the analytics product too
    if (rng.chance(0.12)) continue;
    const plan = rng.weighted(plans, [26, 12, 28, 14, 10, 5, 5]);
    const seats = Math.max(1, Math.round(plan.seats_included * rng.float(0.4, 1.8)));
    const extraSeats = Math.max(0, seats - plan.seats_included);
    const mrr = round2(plan.list_mrr + extraSeats * (plan.list_mrr / plan.seats_included) * 0.8);
    const startDay = c.signupDay + rng.int(0, 14);
    if (startDay >= DAYS) continue;
    const hasTrial = plan.tier !== 'Enterprise' && rng.chance(0.78);
    const trialEnd = hasTrial ? startDay + 14 : null;
    // Monthly churn hazard ~4.5%, worse on Starter, better on annual
    const monthlyHazard = (plan.tier === 'Starter' ? 0.075 : plan.tier === 'Growth' ? 0.042 : plan.tier === 'Scale' ? 0.024 : 0.012)
      * (plan.billing_interval === 'annual' ? 0.4 : 1);
    let cancelDay: number | null = null;
    for (let m = 1; m <= 12; m++) {
      const d = startDay + m * 30;
      if (d >= DAYS) break;
      if (rng.chance(monthlyHazard)) { cancelDay = d + rng.int(0, 20); break; }
    }
    if (cancelDay !== null && cancelDay >= DAYS) cancelDay = null;
    const status = cancelDay !== null ? 'canceled'
      : hasTrial && trialEnd! > DAYS - 1 ? 'trialing'
        : rng.chance(0.035) ? 'past_due' : 'active';
    subs.push({
      subscription_id: subId++, customer_id: c.customer_id, plan_id: plan.plan_id, mrr, status,
      startDay, trialEnd, cancelDay,
      reason: cancelDay !== null ? rng.pick(CANCEL_REASONS) : null, seats,
    });
  }
  ds('subscriptions',
    ['subscription_id', 'customer_id', 'plan_id', 'mrr', 'status', 'started_at', 'trial_end_at', 'canceled_at', 'cancel_reason', 'seats'],
    subs.map((s) => [s.subscription_id, s.customer_id, s.plan_id, s.mrr, s.status, dayIso(s.startDay),
      s.trialEnd !== null ? dayIso(s.trialEnd) : null,
      s.cancelDay !== null ? dayIso(s.cancelDay) : null, s.reason, s.seats]));

  // ══════════════════════════════════════════════════════ stripe charges ══
  {
    const rows: unknown[][] = [];
    let chargeSeq = 0;
    const CARD_BRANDS = ['visa', 'mastercard', 'amex'];
    const FAIL_CODES = ['card_declined', 'insufficient_funds', 'expired_card'];
    const planLookup = new Map(plans.map((p) => [p.plan_id, p]));
    for (const s of subs) {
      const step = planLookup.get(s.plan_id)!.billing_interval === 'annual' ? 365 : 30;
      const firstCharge = s.trialEnd ?? s.startDay;
      for (let d = firstCharge; d < (s.cancelDay ?? DAYS); d += step) {
        if (d >= DAYS) break;
        const amount = round2(step === 365 ? s.mrr * 12 : s.mrr);
        const fail = rng.chance(0.041);
        const refunded = !fail && rng.chance(0.012);
        rows.push([
          `ch_${String(3000000 + chargeSeq++)}`, s.customer_id, s.subscription_id, amount, 'usd',
          isoTs(dayMs(d) + rng.int(0, 86399) * 1000),
          fail ? 'failed' : refunded ? 'refunded' : 'succeeded',
          refunded ? amount : 0,
          fail ? rng.pick(FAIL_CODES) : null,
          rng.weighted(CARD_BRANDS, [62, 30, 8]),
          rng.weighted(COUNTRIES, [40, 16, 10, 12, 6, 7, 5, 4]),
        ]);
      }
    }
    // One-off e-commerce charges for a sample of orders
    for (const o of orderRows) {
      if (!rng.chance(0.22)) continue;
      const amt = Math.abs(o[5] as number);
      if (amt === 0) continue;
      rows.push([
        `ch_${String(3000000 + chargeSeq++)}`, o[1], null, round2(amt), 'usd',
        `${o[2]}`, o[4] === 'refunded' ? 'refunded' : 'succeeded',
        o[4] === 'refunded' ? round2(amt) : 0, null,
        rng.weighted(CARD_BRANDS, [62, 30, 8]), o[13],
      ]);
    }
    ds('stripe_charges',
      ['charge_id', 'customer_id', 'subscription_id', 'amount', 'currency', 'created_at',
        'status', 'refunded_amount', 'failure_code', 'card_brand', 'card_country'],
      rows);
  }

  // ══════════════════════════════════════════════════════════ HubSpot ══
  interface Contact { contact_id: number; created: number; stage: string; source: string; medium: string; campaign: string | null; country: string; title: string; companyId: number | null; mql: number | null; sqlD: number | null; cust: number | null; }
  const contacts: Contact[] = [];
  const SOURCE_MEDIUM: Array<[string, string]> = [
    ['google', 'cpc'], ['google', 'organic'], ['linkedin', 'paid-social'], ['facebook', 'paid-social'],
    ['(direct)', '(none)'], ['newsletter', 'email'], ['producthunt', 'referral'], ['partner', 'referral'],
    ['bing', 'cpc'], ['youtube', 'video'],
  ];
  for (let i = 0; i < 4200; i++) {
    const created = rng.int(0, DAYS - 1);
    const sm = rng.weighted(SOURCE_MEDIUM, [22, 16, 14, 9, 13, 8, 5, 5, 4, 4]);
    const quality = rng.next();
    const becameMql = quality > 0.55;
    const mql = becameMql ? created + rng.int(0, 21) : null;
    const becameSql = becameMql && rng.chance(0.42);
    const sqlD = becameSql ? mql! + rng.int(2, 30) : null;
    const becameCust = becameSql && rng.chance(0.31);
    const cust = becameCust ? sqlD! + rng.int(5, 60) : null;
    // A stage date beyond the data window has not happened yet, so the contact must
    // not be *labelled* with that stage either, otherwise lifecycle_stage and the
    // stage dates contradict each other and every funnel query disagrees with itself.
    const inWindow = (d: number | null) => d !== null && d < DAYS;
    const stage = inWindow(cust) ? 'customer'
      : inWindow(sqlD) ? (rng.chance(0.5) ? 'opportunity' : 'sql')
        : inWindow(mql) ? 'mql' : quality > 0.28 ? 'lead' : 'subscriber';
    contacts.push({
      contact_id: 50000 + i, created, stage, source: sm[0], medium: sm[1],
      campaign: sm[1] === 'cpc' ? rng.pick(gCampaigns).campaign_name
        : sm[1] === 'paid-social' ? rng.pick([...mCampaigns.map((c) => c.name), ...liCampaigns.map((c) => c.name)])
          : sm[1] === 'email' ? `nurture_${rng.int(1, 12)}` : null,
      country: rng.weighted(COUNTRIES, [40, 16, 10, 12, 6, 7, 5, 4]),
      title: rng.pick(JOB_TITLES),
      companyId: rng.chance(0.62) ? rng.pick(accounts).account_id : null,
      mql, sqlD: sqlD, cust,
    });
  }
  ds('hubspot_contacts',
    ['contact_id', 'created_date', 'lifecycle_stage', 'original_source', 'original_medium', 'original_campaign',
      'country', 'job_title', 'company_id', 'mql_date', 'sql_date', 'became_customer_date'],
    contacts.map((c) => [c.contact_id, dayIso(c.created), c.stage, c.source, c.medium, c.campaign,
      c.country, c.title, c.companyId,
      c.mql !== null && c.mql < DAYS ? dayIso(c.mql) : null,
      c.sqlD !== null && c.sqlD < DAYS ? dayIso(c.sqlD) : null,
      c.cust !== null && c.cust < DAYS ? dayIso(c.cust) : null]));

  {
    const rows: unknown[][] = [];
    const STAGES = ['discovery', 'demo', 'proposal', 'negotiation'];
    let dealId = 70000;
    for (const c of contacts) {
      if (c.sqlD === null) continue;
      const n = rng.chance(0.15) ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const created = c.sqlD + rng.int(0, 14);
        if (created >= DAYS) continue;
        const cycle = rng.int(14, 120);
        const closed = created + cycle;
        const isOpen = closed >= DAYS;
        const won = isOpen ? null : (rng.chance(0.28) ? 1 : 0);
        rows.push([
          dealId++, c.contact_id,
          `${rng.pick(COMPANY_WORDS_A)}${rng.pick(COMPANY_WORDS_B)}: ${rng.pick(['New Business', 'Expansion', 'Renewal'])}`,
          rng.weighted(['New Business', 'Expansion'], [78, 22]),
          isOpen ? rng.pick(STAGES) : won ? 'closed_won' : 'closed_lost',
          round2(rng.logNormal(8.1, 0.95)),
          dayIso(created), isOpen ? null : dayIso(closed), won,
        ]);
      }
    }
    ds('hubspot_deals', ['deal_id', 'contact_id', 'deal_name', 'pipeline', 'stage', 'amount', 'created_date', 'close_date', 'is_won'], rows);
  }

  // ═══════════════════════════════════════════ Salesforce opportunities ══
  {
    const rows: unknown[][] = [];
    const SF_STAGES = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation'];
    const LEAD_SOURCES = ['Paid Search', 'Paid Social', 'Webinar', 'Outbound', 'Referral', 'Organic', 'Partner'];
    let oppId = 95000;
    for (const a of accounts) {
      const n = rng.weighted([0, 1, 2, 3], [22, 45, 24, 9]);
      for (let k = 0; k < n; k++) {
        const created = Math.max(0, a.created + rng.int(5, 260));
        if (created >= DAYS) continue;
        const cycle = a.tier === 'Enterprise' ? rng.int(60, 200) : a.tier === 'MidMarket' ? rng.int(30, 110) : rng.int(10, 60);
        const closeDay = created + cycle;
        const isOpen = closeDay >= DAYS;
        const won = isOpen ? null : (rng.chance(a.tier === 'Enterprise' ? 0.22 : 0.31) ? 1 : 0);
        const arr = round2(
          a.tier === 'Enterprise' ? rng.logNormal(11.0, 0.5)
            : a.tier === 'MidMarket' ? rng.logNormal(9.6, 0.55) : rng.logNormal(8.3, 0.6),
        );
        const source = rng.weighted(LEAD_SOURCES, [20, 14, 12, 22, 11, 13, 8]);
        rows.push([
          oppId++, a.account_id, rng.pick(AE_NAMES),
          isOpen ? rng.pick(SF_STAGES) : won ? 'Closed Won' : 'Closed Lost',
          round2(arr * rng.float(1.0, 2.4)), arr,
          dayIso(created), isOpen ? null : dayIso(closeDay), won, source,
          // Roughly a third of opportunities have no campaign, the attribution gap.
          source === 'Paid Search' ? rng.pick(paidGoogleIds)
            : source === 'Paid Social' ? rng.pick([...paidMetaIds, ...liIds])
              : rng.chance(0.12) ? rng.pick(liIds) : null,
        ]);
      }
    }
    ds('salesforce_opportunities',
      ['opportunity_id', 'account_id', 'owner_name', 'stage', 'amount', 'arr', 'created_date', 'close_date', 'is_won', 'lead_source', 'campaign_id'],
      rows);
  }

  // ═════════════════════════════════════════ GA4 sessions + raw events ══
  const SOURCE_BY_CHANNEL: Record<string, Array<[string, string]>> = {
    'Paid Search': [['google', 'cpc'], ['bing', 'cpc']],
    'Paid Social': [['facebook', 'paid_social'], ['instagram', 'paid_social'], ['linkedin', 'paid_social'], ['tiktok', 'paid_social']],
    'Organic Search': [['google', 'organic'], ['bing', 'organic'], ['duckduckgo', 'organic']],
    Direct: [['(direct)', '(none)']],
    Email: [['newsletter', 'email'], ['lifecycle', 'email']],
    Referral: [['producthunt', 'referral'], ['reddit.com', 'referral'], ['partner', 'referral']],
    Display: [['google', 'display'], ['criteo', 'display']],
    Affiliate: [['awin', 'affiliate'], ['impact', 'affiliate']],
  };
  const BROWSERS = ['Chrome', 'Safari', 'Edge', 'Firefox', 'Samsung Internet'];
  const OSES: Record<string, string[]> = {
    mobile: ['iOS', 'Android'], desktop: ['Windows', 'macOS', 'Linux'], tablet: ['iPadOS', 'Android'],
  };
  const BRANDS: Record<string, string[]> = {
    mobile: ['Apple', 'Samsung', 'Google', 'Xiaomi'], desktop: ['(not set)'], tablet: ['Apple', 'Samsung'],
  };
  const CONTINENTS: Record<string, string> = {
    US: 'Americas', CA: 'Americas', BR: 'Americas', GB: 'Europe', DE: 'Europe',
    FR: 'Europe', IN: 'Asia', AU: 'Oceania',
  };

  const sessionRows: unknown[][] = [];
  const eventRows: unknown[][] = [];
  const EVENT_COLS = ['event_date', 'event_timestamp', 'event_name', 'user_pseudo_id', 'user_id',
    'ga_session_id', 'ga_session_number', 'event_params', 'items', 'traffic_source', 'device', 'geo', 'ecommerce'];

  const N_DEVICES = 6200;
  const LP_WEIGHTS_PAID = landingPages.map((l) => (l.is_paid_lp ? 12 : 8));
  const LP_WEIGHTS_ORGANIC = landingPages.map((l) => (l.is_paid_lp ? 2 : 8));
  let txSeq = 500000;
  for (let u = 0; u < N_DEVICES; u++) {
    const pseudo = `${(rng.int(1000000, 9999999)).toString(16)}.${1700000000 + rng.int(0, 40000000)}`;
    const knownCustomer = rng.chance(0.34) ? rng.pick(customers) : null;
    const userId = knownCustomer ? knownCustomer.customer_id : null;
    const country = knownCustomer ? knownCustomer.country : rng.weighted(COUNTRIES, [38, 17, 9, 11, 7, 8, 5, 5]);
    const city = rng.pick(CITIES[country]);
    const deviceCat = rng.weighted(['mobile', 'desktop', 'tablet'], [59, 35, 6]);
    const os = rng.pick(OSES[deviceCat]);
    const firstChannel = knownCustomer
      ? knownCustomer.first_touch_channel
      : rng.weighted(CHANNEL_GROUPS as unknown as string[], [22, 20, 18, 14, 6, 8, 8, 4]);
    const [ftSource, ftMedium] = rng.pick(SOURCE_BY_CHANNEL[firstChannel]);
    const trafficSource = JSON.stringify({
      source: ftSource, medium: ftMedium,
      name: ftMedium === 'cpc' || ftMedium === 'paid_social' ? rng.pick(gCampaigns).campaign_name : '(not set)',
    });
    const deviceJson = JSON.stringify({
      category: deviceCat, operating_system: os, browser: rng.pick(BROWSERS),
      mobile_brand_name: rng.pick(BRANDS[deviceCat]),
    });
    const geoJson = JSON.stringify({
      continent: CONTINENTS[country], country: COUNTRY_NAMES[country], region: city, city,
    });

    const nSessions = Math.max(1, rng.weighted([1, 2, 3, 4, 6], [58, 21, 11, 6, 4]));
    let day = knownCustomer ? Math.max(0, knownCustomer.signupDay - rng.int(0, 12)) : rng.int(0, DAYS - 1);
    for (let s = 0; s < nSessions; s++) {
      if (day >= DAYS) break;
      const sessionNumber = s + 1;
      const sessionId = 1_700_000_000 + day * 86400 + rng.int(0, 86399);
      const channel = s === 0 ? firstChannel
        : rng.weighted(CHANNEL_GROUPS as unknown as string[], [18, 14, 16, 26, 12, 6, 5, 3]);
      const [source, medium] = rng.pick(SOURCE_BY_CHANNEL[channel]);
      const paid = medium === 'cpc' || medium === 'paid_social' || medium === 'display';
      const campaignObj = paid
        ? (medium === 'cpc' ? rng.pick(gCampaigns) : null)
        : null;
      const metaObj = paid && medium !== 'cpc' ? rng.pick(mCampaigns) : null;
      const campaignName = campaignObj?.campaign_name ?? metaObj?.name ?? null;
      const campaignId = campaignObj?.campaign_id ?? metaObj?.campaign_id ?? null;
      const lp = rng.weighted(landingPages, paid ? LP_WEIGHTS_PAID : LP_WEIGHTS_ORGANIC);

      // Funnel: page_view → view_item → add_to_cart → begin_checkout → add_payment_info → purchase
      const intent = (knownCustomer?.propensity ?? 1) * (paid ? 1.15 : 1) * (s > 0 ? 1.3 : 1);
      const pViewItem = Math.min(0.85, 0.42 * intent);
      const pAtc = Math.min(0.8, 0.34 * intent);
      const pCheckout = Math.min(0.8, 0.48 * intent);
      const pPayment = 0.72;
      const pPurchase = 0.78;

      const startMs = dayMs(day) + rng.int(7, 23) * 3600_000 + rng.int(0, 3599) * 1000;
      let t = startMs;
      const evDate = compact(day);
      const push = (
        name: string,
        params: Array<[string, string | number | null, 'string' | 'int' | 'double']>,
        items: unknown[] = [],
        ecom: Record<string, unknown> = {},
      ) => {
        t += rng.int(3, 95) * 1000;
        eventRows.push([
          evDate, t * 1000, name, pseudo, userId, sessionId, sessionNumber,
          JSON.stringify(params.map(([key, value, kind]) => ({
            key,
            value: {
              string_value: kind === 'string' ? value : null,
              int_value: kind === 'int' ? value : null,
              double_value: kind === 'double' ? value : null,
            },
          }))),
          JSON.stringify(items), trafficSource, deviceJson, geoJson, JSON.stringify(ecom),
        ]);
      };

      const baseParams: Array<[string, string | number | null, 'string' | 'int' | 'double']> = [
        ['ga_session_id', sessionId, 'int'],
        ['ga_session_number', sessionNumber, 'int'],
        ['page_location', `https://northbeam.example${lp.page_path}`, 'string'],
        ['page_title', lp.page_title, 'string'],
        ['source', source, 'string'],
        ['medium', medium, 'string'],
      ];
      if (campaignName) baseParams.push(['campaign', campaignName, 'string']);

      push('session_start', baseParams);
      const pageViews = Math.max(1, rng.poisson(2.1 * intent));
      for (let p = 0; p < pageViews; p++) {
        push('page_view', [...baseParams, ['engagement_time_msec', rng.int(1200, 90000), 'int']]);
      }

      let converted = 0;
      let revenue = 0;
      const product = rng.pick(products);
      const itemJson = [{
        item_id: `SKU-${product.product_id}`, item_name: product.product_name,
        item_category: product.category, price: product.list_price, quantity: 1,
      }];
      if (rng.chance(pViewItem)) {
        push('view_item', baseParams, itemJson);
        if (rng.chance(pAtc)) {
          push('add_to_cart', [...baseParams, ['value', product.list_price, 'double'], ['currency', 'USD', 'string']], itemJson);
          if (rng.chance(pCheckout)) {
            push('begin_checkout', [...baseParams, ['value', product.list_price, 'double'], ['currency', 'USD', 'string']], itemJson);
            if (rng.chance(pPayment)) {
              push('add_payment_info', [...baseParams, ['payment_type', rng.pick(['card', 'paypal', 'applepay']), 'string']], itemJson);
              if (rng.chance(pPurchase)) {
                const qty = rng.weighted([1, 2, 3], [70, 22, 8]);
                const rev = round2(product.list_price * qty * rng.float(0.9, 1.25));
                const txId = `T${txSeq++}`;
                push('purchase',
                  [...baseParams, ['value', rev, 'double'], ['currency', 'USD', 'string'], ['transaction_id', txId, 'string']],
                  [{ ...itemJson[0], quantity: qty }],
                  { transaction_id: txId, purchase_revenue: rev, tax_value: round2(rev * 0.08), shipping_value: rev > 120 ? 0 : 6.9 });
                converted = 1;
                revenue = rev;
              }
            }
          }
        }
      }
      if (!knownCustomer && rng.chance(0.05)) push('sign_up', [...baseParams, ['method', rng.pick(['email', 'google', 'apple']), 'string']]);
      if (knownCustomer && rng.chance(0.22)) push('login', [...baseParams, ['method', 'email', 'string']]);

      const engagementSec = Math.round((t - startMs) / 1000);
      // 1.2% of sessions are internal QA traffic that nobody remembered to filter out.
      const internal = rng.chance(0.012);
      sessionRows.push([
        `${pseudo}.${sessionId}`, pseudo, isoTs(startMs), dayIso(day),
        internal ? 'Referral' : channel,
        internal ? 'internal-qa' : source,
        internal ? 'referral' : medium,
        campaignName, campaignId, deviceCat, COUNTRY_NAMES[country], city, lp.page_path,
        pageViews + 1, engagementSec > 10 || pageViews > 1 ? 1 : 0, engagementSec,
        converted, revenue,
      ]);
      day += Math.max(1, Math.round(rng.logNormal(2.4, 1.1)));
    }
  }
  ds('ga4_sessions',
    ['session_key', 'user_pseudo_id', 'session_start_ts', 'session_date', 'channel_group', 'source', 'medium',
      'campaign', 'campaign_id', 'device_category', 'country', 'city', 'landing_page', 'page_views',
      'engaged', 'engagement_time_sec', 'converted', 'revenue'],
    sessionRows);
  ds('ga4_events', EVENT_COLS, eventRows);

  // ══════════════════════════════════════════════════════ product_events ══
  {
    const rows: unknown[][] = [];
    const PE_NAMES = ['viewed_pricing', 'connected_datasource', 'created_report', 'activated',
      'invited_teammate', 'exported_csv', 'hit_paywall'];
    const PLATFORMS = ['web', 'web', 'web', 'ios', 'android'];
    let peId = 1;
    const customerById = new Map(customers.map((c) => [c.customer_id, c]));
    const planById = new Map(plans.map((p) => [p.plan_id, p]));
    for (const s of subs) {
      const c = customerById.get(s.customer_id)!;
      const plan = planById.get(s.plan_id)!;
      const active = (s.cancelDay ?? DAYS) - s.startDay;
      const intensity = rng.logNormal(0.2, 0.8) * (plan.tier === 'Enterprise' ? 2.2 : plan.tier === 'Scale' ? 1.6 : 1);
      const n = Math.min(26, Math.max(1, Math.round((active / 30) * 2.2 * intensity)));
      // Activation happens (or doesn't) in the first two weeks
      const activates = rng.chance(Math.min(0.92, 0.45 * intensity));
      for (let k = 0; k < n; k++) {
        const d = s.startDay + rng.int(0, Math.max(1, active - 1));
        if (d >= DAYS) continue;
        const name = k === 0 ? 'viewed_pricing' : rng.weighted(PE_NAMES, [6, 14, 26, 8, 9, 22, 15]);
        rows.push([
          peId++, c.customer_id, name,
          isoTs(dayMs(d) + rng.int(8, 20) * 3600_000 + rng.int(0, 3599) * 1000),
          JSON.stringify({ plan: plan.tier, seats: s.seats, source: rng.pick(['app', 'email', 'api']), value: round2(rng.float(0, 400)) }),
          rng.pick(PLATFORMS), `${rng.int(3, 5)}.${rng.int(0, 9)}.${rng.int(0, 20)}`,
        ]);
      }
      if (activates) {
        const d = Math.min(DAYS - 1, s.startDay + rng.int(0, 13));
        rows.push([
          peId++, c.customer_id, 'activated',
          isoTs(dayMs(d) + rng.int(8, 20) * 3600_000),
          JSON.stringify({ plan: plan.tier, seats: s.seats, source: 'app', value: 0 }),
          'web', `${rng.int(3, 5)}.${rng.int(0, 9)}.${rng.int(0, 20)}`,
        ]);
      }
    }
    ds('product_events', ['event_id', 'user_id', 'event_name', 'event_time', 'properties', 'platform', 'app_version'], rows);
  }

  // ══════════════════════════════════════════ attribution_touchpoints ══
  {
    const rows: unknown[][] = [];
    let touchId = 1;
    const journeyOwners = [
      ...customers.map((c) => ({ customer: c, converted: true })),
      // Unconverted journeys: anonymous users who never bought
      ...Array.from({ length: 2600 }, () => ({ customer: null, converted: false })),
    ];
    for (const j of rng.shuffle(journeyOwners)) {
      const converted = j.converted;
      const length = Math.max(1, rng.weighted([1, 2, 3, 4, 5, 7], converted ? [16, 22, 21, 16, 13, 12] : [46, 26, 14, 8, 4, 2]));
      const endDay = j.customer ? j.customer.signupDay : rng.int(0, DAYS - 1);
      const startDay = Math.max(0, endDay - rng.int(0, 45));
      const pseudo = `${(rng.int(1000000, 9999999)).toString(16)}.${1700000000 + rng.int(0, 40000000)}`;
      const value = converted ? round2(rng.logNormal(4.6, 0.85)) : 0;
      for (let p = 1; p <= length; p++) {
        const frac = length === 1 ? 1 : (p - 1) / (length - 1);
        const d = Math.round(startDay + frac * (endDay - startDay));
        // Journeys tend to open on discovery channels and close on branded/direct ones
        const channel = p === 1
          ? rng.weighted(CHANNEL_GROUPS as unknown as string[], [24, 26, 16, 6, 4, 10, 11, 3])
          : p === length
            ? rng.weighted(CHANNEL_GROUPS as unknown as string[], [22, 10, 18, 26, 14, 5, 3, 2])
            : rng.weighted(CHANNEL_GROUPS as unknown as string[], [20, 18, 15, 14, 15, 7, 8, 3]);
        const [source, medium] = rng.pick(SOURCE_BY_CHANNEL[channel]);
        const campaignId = channel === 'Paid Search' ? rng.pick(paidGoogleIds)
          : channel === 'Paid Social' ? rng.pick([...paidMetaIds, ...liIds])
            : channel === 'Display' ? rng.pick(paidGoogleIds) : null;
        rows.push([
          touchId++, j.customer?.customer_id ?? null, pseudo,
          isoTs(dayMs(Math.min(d, DAYS - 1)) + rng.int(0, 86399) * 1000),
          channel, source, medium, campaignId, p, length, converted ? 1 : 0, value,
        ]);
      }
    }
    ds('attribution_touchpoints',
      ['touch_id', 'customer_id', 'user_pseudo_id', 'touch_ts', 'channel', 'source', 'medium',
        'campaign_id', 'touch_position', 'journey_length', 'converted', 'conversion_value'],
      rows);
  }

  // ═════════════════════════════════════════════════════ email_campaigns ══
  {
    const rows: unknown[][] = [];
    const SEGMENTS = ['All Subscribers', 'Recent Buyers', 'Lapsed 90d', 'Cart Abandoners', 'Trial Users', 'VIP', 'Newsletter'];
    const SUBJECTS = [
      'Your cart is waiting 🛒', 'New drop: the Velocity Trail Runner', '40% off, 48 hours only',
      'How Priya cut her CAC by 38%', 'Your monthly running report', 'We saved your size',
      "You're 1 step from activation", 'Black Friday starts now', 'Free shipping ends tonight',
      '3 reports every growth team should build', 'Back in stock: GPS Watch Pro',
    ];
    for (let i = 0; i < 132; i++) {
      const day = rng.int(0, DAYS - 1);
      const segment = rng.pick(SEGMENTS);
      const sent = rng.int(2400, 96000);
      const delivered = Math.round(sent * rng.float(0.962, 0.995));
      const openRate = segment === 'VIP' ? rng.float(0.42, 0.61)
        : segment === 'Cart Abandoners' ? rng.float(0.38, 0.55)
          : segment === 'Lapsed 90d' ? rng.float(0.09, 0.19) : rng.float(0.18, 0.36);
      const opens = Math.round(delivered * openRate);
      const clicks = Math.round(opens * rng.float(0.06, 0.24));
      rows.push([
        900 + i, `${MONTH_NAMES[new Date(dayMs(day)).getUTCMonth()].slice(0, 3)}: ${rng.pick(['Promo', 'Newsletter', 'Lifecycle', 'Winback', 'Product'])} ${i + 1}`,
        dayIso(day), segment, rng.pick(SUBJECTS), sent, delivered, opens, clicks,
        Math.round(delivered * rng.float(0.0004, 0.0038)),
        sent - delivered,
        round2(clicks * rng.float(0.6, 3.2) * rng.float(18, 62)),
      ]);
    }
    ds('email_campaigns',
      ['email_id', 'campaign_name', 'sent_date', 'segment', 'subject_line', 'sent', 'delivered',
        'unique_opens', 'unique_clicks', 'unsubscribes', 'bounces', 'attributed_revenue'],
      rows);
  }

  // ═════════════════════════════════════════════════════ support_tickets ══
  {
    const rows: unknown[][] = [];
    const CHANNELS = ['email', 'chat', 'phone'];
    const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
    const CATEGORIES = ['billing', 'bug', 'how-to', 'feature-request', 'outage'];
    let ticketId = 1;
    for (const c of customers) {
      const n = rng.poisson(c.is_b2b ? 0.9 : 0.35);
      for (let k = 0; k < n; k++) {
        const d = c.signupDay + rng.int(1, 200);
        if (d >= DAYS) continue;
        const createdMs = dayMs(d) + rng.int(0, 86399) * 1000;
        const priority = rng.weighted(PRIORITIES, [22, 48, 22, 8]);
        const responded = rng.chance(0.93);
        const respMin = priority === 'urgent' ? rng.int(3, 45) : priority === 'high' ? rng.int(10, 180) : rng.int(30, 900);
        const resolved = responded && rng.chance(0.86);
        const resHrs = priority === 'urgent' ? rng.float(0.5, 8) : rng.float(2, 96);
        rows.push([
          ticketId++, c.customer_id, isoTs(createdMs),
          responded ? isoTs(createdMs + respMin * 60_000) : null,
          resolved ? isoTs(createdMs + respMin * 60_000 + resHrs * 3600_000) : null,
          rng.pick(CHANNELS), priority, rng.pick(CATEGORIES),
          resolved && rng.chance(0.55) ? rng.weighted([1, 2, 3, 4, 5], [5, 6, 12, 32, 45]) : null,
        ]);
      }
    }
    ds('support_tickets',
      ['ticket_id', 'customer_id', 'created_at', 'first_response_at', 'resolved_at', 'channel', 'priority', 'category', 'csat'],
      rows);
  }

  return out;
}
