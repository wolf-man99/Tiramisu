/**
 * The homepage simulator demo: a fictional D2C brand, a fictional ad account.
 *
 * EVERY NUMBER HERE IS INVENTED for teaching. Nothing is sampled from a real Meta
 * account and nothing should be presented as a real-world benchmark — the UI labels
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
 * for Indian D2C paid social — prospecting around 1.0–1.5% CTR and 3% conversion,
 * warm retargeting much higher on both, catalog/DPA in between. Frequency (derived
 * as impressions÷reach) is deliberately low for broad prospecting and high for the
 * small warm retargeting pools, matching how those audiences actually behave.
 */
export const DEMO_CAMPAIGNS: DemoCampaign[] = [
  {
    name: 'Prospecting — Advantage+ Broad', type: 'Prospecting', spend: 118_000, revenue: 401_200, purchases: 452,
    impressions: 1_086_000, linkClicks: 14_120, reach: 603_000,
    bidStrategy: 'Highest volume', dailyBudget: 4_000, delivery: 'Active',
  },
  {
    name: 'Prospecting — Interest Stack', type: 'Prospecting', spend: 74_000, revenue: 233_000, purchases: 268,
    impressions: 638_000, linkClicks: 8_930, reach: 304_000,
    bidStrategy: 'Highest volume', dailyBudget: 2_500, delivery: 'Active',
  },
  {
    name: 'Retargeting — Add-to-Cart 7D', type: 'Retargeting', spend: 52_000, revenue: 302_000, purchases: 331,
    impressions: 108_800, linkClicks: 3_480, reach: 22_700,
    bidStrategy: 'Cost per result goal', costPerResultGoal: 850, dailyBudget: 1_800, delivery: 'Active',
  },
  {
    name: 'Retargeting — IG Engagers 30D', type: 'Retargeting', spend: 38_000, revenue: 158_400, purchases: 178,
    impressions: 94_100, linkClicks: 2_540, reach: 24_100,
    bidStrategy: 'Cost per result goal', costPerResultGoal: 900, dailyBudget: 1_300, delivery: 'Active',
  },
  {
    name: 'Catalog Sales — DPA', type: 'Catalog', spend: 60_000, revenue: 189_400, purchases: 197,
    impressions: 162_700, linkClicks: 3_580, reach: 50_800,
    bidStrategy: 'Highest volume', dailyBudget: 2_000, delivery: 'Active',
  },
];

/** CPM: cost per 1,000 impressions. */
export const cpm = (c: DemoCampaign): number => (c.spend / c.impressions) * 1000;
/** CPC: cost per link click. */
export const cpc = (c: DemoCampaign): number => c.spend / c.linkClicks;
/** CTR: link clicks ÷ impressions, as a percentage. */
export const ctr = (c: DemoCampaign): number => (c.linkClicks / c.impressions) * 100;
/** Frequency: average number of times a person saw this campaign. */
export const frequency = (c: DemoCampaign): number => c.impressions / c.reach;
/** Cost per result — Meta's term for cost per purchase on a sales campaign. */
export const costPerResult = (c: DemoCampaign): number => c.spend / c.purchases;
/** Purchase ROAS for a single campaign. */
export const campaignRoas = (c: DemoCampaign): number => c.revenue / c.spend;

/**
 * Headline account figures. Spend/revenue/purchases are the campaign sums.
 *
 * CAC is cost per *new customer*, not per purchase: only 419 of the 1,426 purchases
 * were first-time buyers, so ₹3,42,000 ÷ 419 ≈ ₹817 while spend ÷ purchases is a much
 * flattering ₹240. Learners are meant to notice that gap — a brand that reports the
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

/** Indian digit grouping (₹3,42,000) — matches the account's currency. */
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
        label: 'Raise the budget — it was the winner',
        verdict: 'costly',
        outcome:
          'Frequency climbs faster and CAC keeps rising. More budget on a tiring creative buys more impressions of an ad people have already ignored.',
      },
      {
        label: 'Rotate in fresh creative on the same audience',
        verdict: 'best',
        outcome:
          'CTR recovers and frequency resets. The audience was never the problem — they were just done with that specific ad.',
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
          'A smaller pool saturates faster. CPMs rise again within days — you tightened the constraint that was already binding.',
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
          'CTR was flat — the ads are still earning the click. You spent a cycle fixing the one part of the funnel the data said was working.',
      },
      {
        label: 'Audit the landing page and checkout flow',
        verdict: 'best',
        outcome:
          'A checkout script was failing on mobile. Same traffic, broken destination — the drop was downstream of everything you buy.',
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
        label: 'Trust Meta — it owns the ad delivery',
        verdict: 'costly',
        outcome:
          'Meta credits view-through and cross-device conversions on its own attribution window. Taking it at face value overstates paid performance.',
      },
      {
        label: 'Reconcile both against order data and document the model',
        verdict: 'best',
        outcome:
          'Neither is lying — they answer different questions on different windows. Backend orders become the source of truth; platform numbers become directional.',
      },
      {
        label: 'Trust GA4 — it is the neutral third party',
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
