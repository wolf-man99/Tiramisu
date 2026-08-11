/**
 * The homepage simulator demo: a fictional D2C brand, a fictional ad account.
 *
 * EVERY NUMBER HERE IS INVENTED for teaching. Nothing is sampled from a real Meta
 * account and nothing should be presented as a real-world benchmark, the UI labels
 * it as a simulation in-place, and that labelling is load-bearing, not decoration.
 *
 * The campaign rows are built to sum exactly to the account totals below, so a
 * learner who adds up the table gets the headline figures back.
 */

export interface DemoCampaign {
  name: string;
  type: 'Prospecting' | 'Retargeting' | 'Catalog';
  spend: number;
  revenue: number;
  purchases: number;
  /** Everything below is additional Ads-Manager-style detail for the Run dashboard.
   *  Stored as raw counts (impressions, clicks, reach) rather than pre-computed
   *  rates, so CPM/CPC/CTR/frequency/cost-per-result derive from them via the
   *  helpers below and can never drift out of arithmetic consistency. */
  impressions: number;
  linkClicks: number;
  reach: number;
  bidStrategy: 'Highest volume' | 'Cost per result goal';
  /** Only meaningful when bidStrategy is 'Cost per result goal'. */
  costPerResultGoal?: number;
  dailyBudget: number;
  delivery: 'Active' | 'Not delivering' | 'Learning';
}

export const DEMO_BRAND = {
  name: 'NORTHBOUND',
  category: 'D2C Streetwear',
  role: 'Performance Marketing Specialist',
  budget: 500_000,
  revenueTarget: 2_000_000,
  targetCacLow: 750,
  targetCacHigh: 1_000,
  mission: 'Generate profitable revenue while scaling paid acquisition.',
} as const;

/**
 * Impressions/clicks/reach below are chosen, not random: each campaign's implied CTR
 * (clicks÷impressions) and conversion rate (purchases÷clicks) sit in realistic bands
 * for Indian D2C paid social, prospecting around 1.0–1.5% CTR and 3% conversion,
 * warm retargeting much higher on both, catalog/DPA in between. Frequency (derived
 * as impressions÷reach) is deliberately low for broad prospecting and high for the
 * small warm retargeting pools, matching how those audiences actually behave.
 */
export const DEMO_CAMPAIGNS: DemoCampaign[] = [
  {
    name: 'Prospecting - Advantage+ Broad', type: 'Prospecting', spend: 118_000, revenue: 401_200, purchases: 452,
    impressions: 1_086_000, linkClicks: 14_120, reach: 603_000,
    bidStrategy: 'Highest volume', dailyBudget: 4_000, delivery: 'Active',
  },
  {
    name: 'Prospecting - Interest Stack', type: 'Prospecting', spend: 74_000, revenue: 233_000, purchases: 268,
    impressions: 638_000, linkClicks: 8_930, reach: 304_000,
    bidStrategy: 'Highest volume', dailyBudget: 2_500, delivery: 'Active',
  },
  {
    name: 'Retargeting - Add-to-Cart 7D', type: 'Retargeting', spend: 52_000, revenue: 302_000, purchases: 331,
    impressions: 108_800, linkClicks: 3_480, reach: 22_700,
    bidStrategy: 'Cost per result goal', costPerResultGoal: 850, dailyBudget: 1_800, delivery: 'Active',
  },
  {
    name: 'Retargeting - IG Engagers 30D', type: 'Retargeting', spend: 38_000, revenue: 158_400, purchases: 178,
    impressions: 94_100, linkClicks: 2_540, reach: 24_100,
    bidStrategy: 'Cost per result goal', costPerResultGoal: 900, dailyBudget: 1_300, delivery: 'Active',
  },
  {
    name: 'Catalog Sales - DPA', type: 'Catalog', spend: 60_000, revenue: 189_400, purchases: 197,
    impressions: 162_700, linkClicks: 3_580, reach: 50_800,
    bidStrategy: 'Highest volume', dailyBudget: 2_000, delivery: 'Active',
  },
];

/** The raw counts every derived metric below is computed from, shared by a full
 *  DemoCampaign and by any date-range-aggregated total, so CPM/CPC/CTR/etc. work
 *  identically whether they're describing the whole campaign or a filtered slice. */
export interface MetricTotals {
  spend: number;
  revenue: number;
  purchases: number;
  impressions: number;
  linkClicks: number;
}

/** CPM: cost per 1,000 impressions. */
export const cpm = (c: MetricTotals): number => (c.spend / c.impressions) * 1000;
/** CPC: cost per link click. */
export const cpc = (c: MetricTotals): number => c.spend / c.linkClicks;
/** CTR: link clicks ÷ impressions, as a percentage. */
export const ctr = (c: MetricTotals): number => (c.linkClicks / c.impressions) * 100;
/** Cost per result. Meta's term for cost per purchase on a sales campaign. */
export const costPerResult = (c: MetricTotals): number => c.spend / c.purchases;
/** Purchase ROAS. */
export const campaignRoas = (c: MetricTotals): number => c.revenue / c.spend;
/** Frequency: average number of times a person saw this campaign. Reach doesn't sum
 *  linearly across days (the same person is reached repeatedly), so it takes the
 *  campaign's baseline (30-day) frequency and range length rather than raw counts. */
export const frequency = (c: DemoCampaign): number => c.impressions / c.reach;
/** Estimated reach for an arbitrary-length range, extrapolated from the campaign's
 *  known 30-day frequency. Frequency grows sub-linearly with a longer window (people
 *  keep getting shown the ad, but reach grows slower than impressions do). */
export function estimateReach(c: DemoCampaign, rangeImpressions: number, rangeDays: number): number {
  const freq30 = frequency(c);
  const freqRange = Math.max(1, freq30 * (rangeDays / 30) ** 0.4);
  return rangeImpressions / freqRange;
}

/** Funnel conversion rates below Link Click, per campaign type, cold prospecting
 *  traffic bounces more and adds-to-cart less than an audience that's already
 *  shown intent, which is exactly the gap Retargeting vs Prospecting is meant to
 *  teach. Applied to range-aggregated purchases (not per-day) to avoid the noise
 *  of small daily counts. */
const FUNNEL_RATES: Record<DemoCampaign['type'], { lpvOfClicks: number; cartOfLpv: number; checkoutOfCart: number; purchaseOfCheckout: number }> = {
  Prospecting: { lpvOfClicks: 0.53, cartOfLpv: 0.22, checkoutOfCart: 0.50, purchaseOfCheckout: 0.55 },
  Retargeting: { lpvOfClicks: 0.60, cartOfLpv: 0.35, checkoutOfCart: 0.65, purchaseOfCheckout: 0.70 },
  Catalog: { lpvOfClicks: 0.58, cartOfLpv: 0.28, checkoutOfCart: 0.55, purchaseOfCheckout: 0.62 },
};

export interface FunnelCounts {
  landingPageViews: number;
  addToCart: number;
  checkoutInitiated: number;
}

// ─────────────────────────────────────────────── daily series (date ranges) ──
//
// The account's "as of" date is fixed, not real-world today: this is a frozen
// case-study snapshot (consistent with the "Educational simulation" labelling),
// not a live feed, so it never drifts and never needs regenerating.
const LATEST_DATE = '2026-08-11';
const HISTORY_DAYS = 90;
const RECENT_WINDOW = 30; // the window DEMO_CAMPAIGNS' totals above describe exactly

export interface DailyPoint {
  date: string; // ISO yyyy-mm-dd
  spend: number;
  impressions: number;
  linkClicks: number;
  purchases: number;
  revenue: number;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function stringSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return h;
}
export function isoDaysBefore(latest: string, daysAgo: number): string {
  const d = new Date(`${latest}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}
/** Sunday=0 .. Saturday=6. D2C streetwear skews weekend. People browse and buy
 *  off the clock, not during a workday. */
const WEEKDAY_WEIGHT = [1.15, 0.82, 0.85, 0.88, 0.92, 1.05, 1.28];

/** Splits `total` across `weights` so the parts sum to EXACTLY `total` (largest-
 *  remainder method for integers). The recent-30-days window has to reconcile to
 *  DEMO_CAMPAIGNS' published figures to the rupee, not "approximately". */
function distributeExact(total: number, weights: number[], integer: boolean): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / weightSum) * total);
  if (!integer) {
    const out = raw.slice();
    const drift = total - out.reduce((a, b) => a + b, 0);
    out[out.length - 1] += drift;
    return out;
  }
  const floors = raw.map(Math.floor);
  let remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = floors.slice();
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) out[order[k].i]++;
  return out;
}

function dailyWeights(rng: () => number, days: number, offset: number): number[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(`${LATEST_DATE}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - (offset + (days - 1 - i)));
    const wd = WEEKDAY_WEIGHT[date.getUTCDay()];
    return wd * (0.82 + rng() * 0.36); // ±18% daily noise on top of the weekday shape
  });
}

/** Full 90-day daily series for one campaign, oldest first. Days 61-90 (the recent
 *  window) sum exactly to that campaign's published totals in DEMO_CAMPAIGNS; days
 *  1-60 are independently generated ~15-25% lower, consistent with the account
 *  having scaled up over the quarter rather than run flat. Deterministic: reruns of
 *  this function always produce the same series for the same campaign. */
function generateCampaignSeries(c: DemoCampaign): DailyPoint[] {
  const rng = mulberry32(stringSeed(c.name));
  const olderDays = HISTORY_DAYS - RECENT_WINDOW;

  const recentWeights = dailyWeights(rng, RECENT_WINDOW, 0);
  const spend = distributeExact(c.spend, recentWeights, false);
  const impressions = distributeExact(c.impressions, recentWeights, true);
  const linkClicks = distributeExact(c.linkClicks, recentWeights, true);
  const purchases = distributeExact(c.purchases, recentWeights, true);
  const revenue = distributeExact(c.revenue, recentWeights, false);

  const olderScale = 0.78 + rng() * 0.07; // one draw per campaign, not per day
  const olderWeights = dailyWeights(rng, olderDays, RECENT_WINDOW);
  const olderTotal = {
    spend: c.spend * (olderDays / RECENT_WINDOW) * olderScale,
    impressions: Math.round(c.impressions * (olderDays / RECENT_WINDOW) * olderScale),
    linkClicks: Math.round(c.linkClicks * (olderDays / RECENT_WINDOW) * olderScale),
    purchases: Math.round(c.purchases * (olderDays / RECENT_WINDOW) * olderScale),
    revenue: c.revenue * (olderDays / RECENT_WINDOW) * olderScale,
  };
  const oSpend = distributeExact(olderTotal.spend, olderWeights, false);
  const oImpressions = distributeExact(olderTotal.impressions, olderWeights, true);
  const oLinkClicks = distributeExact(olderTotal.linkClicks, olderWeights, true);
  const oPurchases = distributeExact(olderTotal.purchases, olderWeights, true);
  const oRevenue = distributeExact(olderTotal.revenue, olderWeights, false);

  const points: DailyPoint[] = [];
  for (let i = 0; i < olderDays; i++) {
    points.push({
      date: isoDaysBefore(LATEST_DATE, HISTORY_DAYS - 1 - i),
      spend: Math.round(oSpend[i]), impressions: oImpressions[i], linkClicks: oLinkClicks[i],
      purchases: oPurchases[i], revenue: Math.round(oRevenue[i]),
    });
  }
  for (let i = 0; i < RECENT_WINDOW; i++) {
    points.push({
      date: isoDaysBefore(LATEST_DATE, RECENT_WINDOW - 1 - i),
      spend: Math.round(spend[i]), impressions: impressions[i], linkClicks: linkClicks[i],
      purchases: purchases[i], revenue: Math.round(revenue[i]),
    });
  }
  return points;
}

/** Precomputed once at module load: pure function of fixed inputs, so there's no
 *  reason to regenerate it per render. */
export const DEMO_DAILY: Record<string, DailyPoint[]> = Object.fromEntries(
  DEMO_CAMPAIGNS.map((c) => [c.name, generateCampaignSeries(c)]),
);

export const EARLIEST_DATE = isoDaysBefore(LATEST_DATE, HISTORY_DAYS - 1);
export { LATEST_DATE };

/** Sums a campaign's daily series within [from, to] inclusive (ISO date strings). */
export function aggregateRange(campaignName: string, from: string, to: string): MetricTotals {
  const points = DEMO_DAILY[campaignName] ?? [];
  const totals = { spend: 0, revenue: 0, purchases: 0, impressions: 0, linkClicks: 0 };
  for (const p of points) {
    if (p.date < from || p.date > to) continue;
    totals.spend += p.spend;
    totals.revenue += p.revenue;
    totals.purchases += p.purchases;
    totals.impressions += p.impressions;
    totals.linkClicks += p.linkClicks;
  }
  return totals;
}

/** Number of whole days between two ISO dates, inclusive. */
export function rangeDayCount(from: string, to: string): number {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000) + 1;
}

/** Derives the funnel backward from purchases (the one number that must stay exact),
 *  then sanity-clamps landing page views under link clicks. Physically it can never
 *  exceed them, and the backward derivation is an approximation, not a hard identity. */
export function funnelFor(type: DemoCampaign['type'], purchases: number, linkClicks: number): FunnelCounts {
  const r = FUNNEL_RATES[type];
  const checkoutInitiated = Math.round(purchases / r.purchaseOfCheckout);
  const addToCart = Math.round(checkoutInitiated / r.checkoutOfCart);
  const landingPageViews = Math.min(Math.round(addToCart / r.cartOfLpv), Math.round(linkClicks * 0.95));
  return { landingPageViews, addToCart, checkoutInitiated };
}

// ───────────────────────────────────────────────── ad sets & ads (hierarchy) ──
//
// Meta's real structure is Campaign > Ad set > Ad. Each level below Campaign is
// defined as a fixed share of its parent's totals rather than its own daily series
//: shares always sum to 1 within a parent, so every level reconciles to the
// campaign figures above it at any date range, with no extra reconciliation work.

export interface DemoAdSet {
  id: string;
  campaignName: string;
  name: string;
  share: number;
  delivery: DemoCampaign['delivery'];
}

export const DEMO_ADSETS: DemoAdSet[] = [
  { id: 'as-1', campaignName: 'Prospecting - Advantage+ Broad', name: 'Advantage+ audience - 18–34', share: 0.58, delivery: 'Active' },
  { id: 'as-2', campaignName: 'Prospecting - Advantage+ Broad', name: 'Advantage+ audience - 35–54', share: 0.42, delivery: 'Active' },
  { id: 'as-3', campaignName: 'Prospecting - Interest Stack', name: 'Streetwear & sneakerhead interests', share: 0.64, delivery: 'Active' },
  { id: 'as-4', campaignName: 'Prospecting - Interest Stack', name: 'Fashion lookalike 3%', share: 0.36, delivery: 'Active' },
  { id: 'as-5', campaignName: 'Retargeting - Add-to-Cart 7D', name: 'Cart abandoners - 7 day', share: 1, delivery: 'Active' },
  { id: 'as-6', campaignName: 'Retargeting - IG Engagers 30D', name: 'IG engagers - 30 day', share: 0.7, delivery: 'Active' },
  { id: 'as-7', campaignName: 'Retargeting - IG Engagers 30D', name: 'Video viewers 75%+ - 30 day', share: 0.3, delivery: 'Learning' },
  { id: 'as-8', campaignName: 'Catalog Sales - DPA', name: 'Dynamic - viewed or added to cart', share: 0.55, delivery: 'Active' },
  { id: 'as-9', campaignName: 'Catalog Sales - DPA', name: 'Dynamic - broad catalog audience', share: 0.45, delivery: 'Active' },
];

export interface DemoAd {
  id: string;
  adSetId: string;
  name: string;
  format: 'Image' | 'Video' | 'Carousel' | 'Collection';
  share: number;
  delivery: DemoCampaign['delivery'];
}

export const DEMO_ADS: DemoAd[] = [
  { id: 'ad-1', adSetId: 'as-1', name: 'UGC: "Why I switched"', format: 'Video', share: 0.55, delivery: 'Active' },
  { id: 'ad-2', adSetId: 'as-1', name: 'Carousel - Bestsellers', format: 'Carousel', share: 0.45, delivery: 'Active' },
  { id: 'ad-3', adSetId: 'as-2', name: 'Static - Founder story', format: 'Image', share: 1, delivery: 'Active' },
  { id: 'ad-4', adSetId: 'as-3', name: 'UGC - Street styling', format: 'Video', share: 0.6, delivery: 'Active' },
  { id: 'ad-5', adSetId: 'as-3', name: 'Carousel - New drop', format: 'Carousel', share: 0.4, delivery: 'Active' },
  { id: 'ad-6', adSetId: 'as-4', name: 'Static - Lookbook grid', format: 'Image', share: 1, delivery: 'Active' },
  { id: 'ad-7', adSetId: 'as-5', name: 'Dynamic: "Still thinking it over?"', format: 'Image', share: 0.5, delivery: 'Active' },
  { id: 'ad-8', adSetId: 'as-5', name: 'Video - 10% off reminder', format: 'Video', share: 0.5, delivery: 'Active' },
  { id: 'ad-9', adSetId: 'as-6', name: 'Collection - Shop the collection', format: 'Collection', share: 1, delivery: 'Active' },
  { id: 'ad-10', adSetId: 'as-7', name: 'Video - Behind the drop', format: 'Video', share: 1, delivery: 'Learning' },
  { id: 'ad-11', adSetId: 'as-8', name: 'Dynamic catalog - carousel', format: 'Carousel', share: 0.65, delivery: 'Active' },
  { id: 'ad-12', adSetId: 'as-8', name: 'Dynamic catalog - single image', format: 'Image', share: 0.35, delivery: 'Active' },
  { id: 'ad-13', adSetId: 'as-9', name: 'Dynamic catalog - collection', format: 'Collection', share: 1, delivery: 'Active' },
];

/** Scales a totals object by a fixed share, derives ad-set/ad-level totals from a
 *  parent's already range-aggregated totals, so date ranges flow down for free. */
export function scaleTotals(t: MetricTotals, share: number): MetricTotals {
  return {
    spend: Math.round(t.spend * share),
    revenue: Math.round(t.revenue * share),
    purchases: Math.round(t.purchases * share),
    impressions: Math.round(t.impressions * share),
    linkClicks: Math.round(t.linkClicks * share),
  };
}

/** One audience per ad set (this account doesn't reuse an audience across ad sets),
 *  so the Audiences tab can show each audience's own performance by joining back to
 *  its ad set rather than needing a separate daily series of its own. */
export interface DemoAudience {
  id: string;
  name: string;
  type: 'Custom Audience' | 'Lookalike Audience' | 'Saved Audience' | 'Dynamic (Catalog)';
  size: number;
  adSetId: string;
}

export const DEMO_AUDIENCES: DemoAudience[] = [
  { id: 'aud-1', name: 'Advantage+ audience - 18–34', type: 'Saved Audience', size: 4_200_000, adSetId: 'as-1' },
  { id: 'aud-2', name: 'Advantage+ audience - 35–54', type: 'Saved Audience', size: 3_100_000, adSetId: 'as-2' },
  { id: 'aud-3', name: 'Streetwear & sneakerhead interests', type: 'Saved Audience', size: 1_850_000, adSetId: 'as-3' },
  { id: 'aud-4', name: 'Fashion lookalike 3%', type: 'Lookalike Audience', size: 640_000, adSetId: 'as-4' },
  { id: 'aud-5', name: 'Cart abandoners - 7 day', type: 'Custom Audience', size: 18_400, adSetId: 'as-5' },
  { id: 'aud-6', name: 'IG engagers - 30 day', type: 'Custom Audience', size: 92_000, adSetId: 'as-6' },
  { id: 'aud-7', name: 'Video viewers 75%+ - 30 day', type: 'Custom Audience', size: 34_500, adSetId: 'as-7' },
  { id: 'aud-8', name: 'Viewed or added to cart', type: 'Dynamic (Catalog)', size: 61_200, adSetId: 'as-8' },
  { id: 'aud-9', name: 'Broad catalog audience', type: 'Dynamic (Catalog)', size: 410_000, adSetId: 'as-9' },
];

/**
 * Headline account figures. Spend/revenue/purchases are the campaign sums.
 *
 * CAC is cost per *new customer*, not per purchase: only 419 of the 1,426 purchases
 * were first-time buyers, so ₹3,42,000 ÷ 419 ≈ ₹817 while spend ÷ purchases is a much
 * flattering ₹240. Learners are meant to notice that gap, a brand that reports the
 * lower number is measuring repeat buyers it already owned.
 */
export const DEMO_TOTALS = {
  spend: DEMO_CAMPAIGNS.reduce((n, c) => n + c.spend, 0),
  revenue: DEMO_CAMPAIGNS.reduce((n, c) => n + c.revenue, 0),
  purchases: DEMO_CAMPAIGNS.reduce((n, c) => n + c.purchases, 0),
  newCustomers: 419,
};

export const DEMO_CAC = 817;
export const DEMO_ROAS = DEMO_TOTALS.revenue / DEMO_TOTALS.spend;
/** Share of purchases that are first-time buyers, held constant so the CAC-vs-cost-
 *  per-result gap the footnote teaches still holds at any date range, not just 30d. */
export const NEW_CUSTOMER_RATE = DEMO_TOTALS.newCustomers / DEMO_TOTALS.purchases;

/** Indian digit grouping (₹3,42,000), matches the account's currency. */
export function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

export interface SimEventOption {
  label: string;
  /** 'best' is the decision the curriculum teaches; the others are real mistakes. */
  verdict: 'best' | 'costly' | 'partial';
  outcome: string;
}

export interface SimEvent {
  day: number;
  title: string;
  signals: string[];
  prompt: string;
  options: SimEventOption[];
}

export const SIM_EVENTS: SimEvent[] = [
  {
    day: 7,
    title: 'Creative fatigue',
    signals: ['CTR ↓ 34%', 'Frequency ↑ 3.8', 'CAC ↑ 22%'],
    prompt: 'Your best ad set is decaying. What do you do?',
    options: [
      {
        label: 'Raise the budget - it was the winner',
        verdict: 'costly',
        outcome:
          'Frequency climbs faster and CAC keeps rising. More budget on a tiring creative buys more impressions of an ad people have already ignored.',
      },
      {
        label: 'Rotate in fresh creative on the same audience',
        verdict: 'best',
        outcome:
          'CTR recovers and frequency resets. The audience was never the problem. They were just done with that specific ad.',
      },
      {
        label: 'Kill the campaign and start over',
        verdict: 'partial',
        outcome:
          'CAC stops rising, but you also threw away a profitable audience and the learning phase that came with it. An overcorrection.',
      },
    ],
  },
  {
    day: 12,
    title: 'Audience saturation',
    signals: ['Reach plateaued', 'CPM ↑ 18%', 'Overlap 41%'],
    prompt: 'You have run out of people to show ads to. What do you do?',
    options: [
      {
        label: 'Narrow the targeting to the best segment',
        verdict: 'costly',
        outcome:
          'A smaller pool saturates faster. CPMs rise again within days. You tightened the constraint that was already binding.',
      },
      {
        label: 'Expand to broad and consolidate overlapping ad sets',
        verdict: 'best',
        outcome:
          'CPMs settle and the delivery system regains room to find buyers. Consolidating also stops your own ad sets from bidding against each other.',
      },
      {
        label: 'Hold and wait for performance to recover',
        verdict: 'partial',
        outcome:
          'Saturation does not resolve itself while spend continues. You keep paying rising CPMs for the same shrinking pool.',
      },
    ],
  },
  {
    day: 17,
    title: 'Conversion rate drops',
    signals: ['CVR ↓ 2.9% → 1.6%', 'CTR flat', 'Sessions steady'],
    prompt: 'Traffic is unchanged but sales fell. What do you check first?',
    options: [
      {
        label: 'Rewrite the ad copy and refresh creative',
        verdict: 'costly',
        outcome:
          'CTR was flat. The ads are still earning the click. You spent a cycle fixing the one part of the funnel the data said was working.',
      },
      {
        label: 'Audit the landing page and checkout flow',
        verdict: 'best',
        outcome:
          'A checkout script was failing on mobile. Same traffic, broken destination. The drop was downstream of everything you buy.',
      },
      {
        label: 'Raise bids to win higher-intent auctions',
        verdict: 'costly',
        outcome:
          'You now pay more per click for the same broken experience. CAC rises without touching the actual cause.',
      },
    ],
  },
  {
    day: 21,
    title: 'Meta and GA4 disagree',
    signals: ['Meta: 1,426', 'GA4: 1,088', 'Gap: 24%'],
    prompt: 'Two platforms report different conversion counts. Which is right?',
    options: [
      {
        label: 'Trust Meta - it owns the ad delivery',
        verdict: 'costly',
        outcome:
          'Meta credits view-through and cross-device conversions on its own attribution window. Taking it at face value overstates paid performance.',
      },
      {
        label: 'Reconcile both against order data and document the model',
        verdict: 'best',
        outcome:
          'Neither is lying, they answer different questions on different windows. Backend orders become the source of truth; platform numbers become directional.',
      },
      {
        label: 'Trust GA4 - it is the neutral third party',
        verdict: 'partial',
        outcome:
          'GA4 undercounts too, via consent mode and cookie loss. Closer to conservative, still not truth.',
      },
    ],
  },
  {
    day: 25,
    title: 'A new creative breaks out',
    signals: ['CTR 2.4x account avg', 'CAC ₹612', 'Only 4% of spend'],
    prompt: 'One new ad is dramatically outperforming. What do you do?',
    options: [
      {
        label: 'Move the full budget to it immediately',
        verdict: 'costly',
        outcome:
          'A step change that large resets the learning phase and inflates CAC before the winner ever stabilises. The signal was real; the execution wasted it.',
      },
      {
        label: 'Scale it ~20–30% at a time and keep the control running',
        verdict: 'best',
        outcome:
          'Delivery stays stable and the edge holds as spend grows. You also keep a baseline to measure the winner against.',
      },
      {
        label: 'Wait for more data before acting',
        verdict: 'partial',
        outcome:
          'Defensible, but creative edges decay. Waiting too long spends the advantage on the calendar instead of on revenue.',
      },
    ],
  },
];
