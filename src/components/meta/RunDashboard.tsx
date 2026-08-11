'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, GalleryHorizontal, Image as ImageIcon, LayoutGrid, Plus, SlidersHorizontal, Video, X } from 'lucide-react';
import {
  DEMO_BRAND, DEMO_CAMPAIGNS, DEMO_TOTALS, DEMO_ADSETS, DEMO_ADS, DEMO_AUDIENCES, NEW_CUSTOMER_RATE, inr,
  cpm, cpc, ctr, costPerResult, campaignRoas, estimateReach, funnelFor, scaleTotals,
  aggregateRange, rangeDayCount, DEMO_DAILY, LATEST_DATE, EARLIEST_DATE, isoDaysBefore,
  type DemoCampaign, type MetricTotals, type FunnelCounts, type DemoAd,
} from '@/lib/simulator/demo-account';

/**
 * The Run dashboard: a deliberate, literal recreation of Meta Ads Manager's own
 * chrome (grey ground, hairline borders, Meta blue, dense small-type table) rather
 * than Tiramisu's neo-brutalist system used everywhere else in the app. That break
 * is intentional, see the Phase 2 design review, so the learner builds real
 * muscle memory for the tool they'll actually use, inside a page that never claims
 * to be the genuine Meta product (see the "Educational simulation" badge below).
 *
 * Reused on the marketing homepage as the "try it before you sign up" preview,
 * `storageScope` namespaces localStorage so a visitor's play-around campaigns/
 * columns there never bleed into their real signed-in Run dashboard state.
 */

const NAV_ITEMS = [
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'adsets', label: 'Ad sets' },
  { key: 'ads', label: 'Ads' },
  { key: 'audiences', label: 'Audiences' },
  { key: 'creative', label: 'Creative' },
  { key: 'reporting', label: 'Reporting' },
] as const;
type NavKey = (typeof NAV_ITEMS)[number]['key'];
const DATA_LEVELS = new Set<NavKey>(['campaigns', 'adsets', 'ads']);
const LEVEL_TITLE: Record<NavKey, string> = {
  campaigns: 'Campaigns', adsets: 'Ad sets', ads: 'Ads',
  audiences: 'Audiences', creative: 'Creative', reporting: 'Reporting',
};
const LEVEL_NAME_HEADER: Record<string, string> = { campaigns: 'Campaign', adsets: 'Ad set', ads: 'Ad' };

const FORMAT_META: Record<DemoAd['format'], { icon: typeof ImageIcon; color: string }> = {
  Image: { icon: ImageIcon, color: '#f0a20d' },
  Video: { icon: Video, color: '#e0245e' },
  Carousel: { icon: GalleryHorizontal, color: '#1877f2' },
  Collection: { icon: LayoutGrid, color: '#31a24c' },
};

function compactNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return num(n);
}

const EMPTY_TOTALS: MetricTotals = { spend: 0, revenue: 0, purchases: 0, impressions: 0, linkClicks: 0 };

/** Groups already range-aggregated rows into buckets, used by the Reporting tab's
 *  breakdown selector. Reuses each row's own totals rather than recomputing, so a
 *  breakdown always matches the account totals for the active date range exactly. */
function groupRows(rows: DisplayRow[], keyFn: (r: DisplayRow) => string): { key: string; t: MetricTotals; reach: number }[] {
  const map = new Map<string, { t: MetricTotals; reach: number }>();
  for (const r of rows) {
    const k = keyFn(r);
    const cur = map.get(k) ?? { t: { ...EMPTY_TOTALS }, reach: 0 };
    cur.t = {
      spend: cur.t.spend + r.t.spend, revenue: cur.t.revenue + r.t.revenue, purchases: cur.t.purchases + r.t.purchases,
      impressions: cur.t.impressions + r.t.impressions, linkClicks: cur.t.linkClicks + r.t.linkClicks,
    };
    cur.reach += r.reach;
    map.set(k, cur);
  }
  return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
}

const FILTERS = ['All', 'Prospecting', 'Retargeting', 'Catalog'] as const;
type Filter = (typeof FILTERS)[number];

function pct(n: number, digits = 2): string {
  return `${n.toFixed(digits)}%`;
}
function num(n: number): string {
  return n.toLocaleString('en-IN');
}
function formatShort(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// ────────────────────────────────────────────────────────────── date ranges ──

type RangeKey = 'today' | '7d' | '14d' | '30d' | '90d' | 'custom';
const RANGE_PRESETS: { key: RangeKey; label: string; days: number }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '14d', label: 'Last 14 days', days: 14 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: 'custom', label: 'Custom', days: 0 },
];

/** A campaign's totals for [from, to]. Base campaigns resum their daily series;
 *  campaigns created in-session only "exist" on LATEST_DATE (the account's frozen
 *  "now"), so a range that doesn't include today correctly shows them at zero,
 *  they hadn't launched yet. */
function rangeTotals(c: DemoCampaign, from: string, to: string): MetricTotals {
  if (DEMO_DAILY[c.name]) return aggregateRange(c.name, from, to);
  if (from <= LATEST_DATE && LATEST_DATE <= to) {
    return { spend: c.spend, revenue: c.revenue, purchases: c.purchases, impressions: c.impressions, linkClicks: c.linkClicks };
  }
  return { spend: 0, revenue: 0, purchases: 0, impressions: 0, linkClicks: 0 };
}
function rangeReach(c: DemoCampaign, from: string, to: string, t: MetricTotals, days: number): number {
  if (DEMO_DAILY[c.name]) return t.impressions > 0 ? Math.round(estimateReach(c, t.impressions, days)) : 0;
  if (from <= LATEST_DATE && LATEST_DATE <= to) return c.reach;
  return 0;
}

// ──────────────────────────────────────────────────────────────── columns ──

/** A campaign-level row: the raw campaign plus its range totals. */
interface Row {
  c: DemoCampaign;
  t: MetricTotals;
  reach: number;
  funnel: FunnelCounts;
}

/** A table row at whichever level is on screen (Campaign / Ad set / Ad), the
 *  campaign-only fields (delivery, bid strategy, budget) are pre-rendered to text
 *  here so the same column renderers work at every level. */
interface DisplayRow {
  id: string;
  name: string;
  subtitle: string;
  filterType: DemoCampaign['type'];
  delivery: DemoCampaign['delivery'];
  bidStrategyText: string;
  budgetText: string;
  t: MetricTotals;
  reach: number;
  funnel: FunnelCounts;
  highlight?: boolean;
}

interface ColumnDef {
  id: string;
  label: string;
  group: 'Performance' | 'Funnel';
  defaultOn: boolean;
  numeric: boolean;
  render: (r: DisplayRow) => string;
}

const COLUMNS: ColumnDef[] = [
  { id: 'delivery', label: 'Delivery', group: 'Performance', defaultOn: true, numeric: false, render: (r) => r.delivery },
  { id: 'bidStrategy', label: 'Bid strategy', group: 'Performance', defaultOn: true, numeric: false, render: (r) => r.bidStrategyText },
  { id: 'budget', label: 'Budget', group: 'Performance', defaultOn: true, numeric: true, render: (r) => r.budgetText },
  { id: 'results', label: 'Results', group: 'Performance', defaultOn: true, numeric: true, render: (r) => num(r.t.purchases) },
  { id: 'reach', label: 'Reach', group: 'Performance', defaultOn: true, numeric: true, render: (r) => num(r.reach) },
  { id: 'impressions', label: 'Impressions', group: 'Performance', defaultOn: true, numeric: true, render: (r) => num(r.t.impressions) },
  { id: 'frequency', label: 'Frequency', group: 'Performance', defaultOn: false, numeric: true, render: (r) => (r.reach > 0 ? (r.t.impressions / r.reach).toFixed(2) : '–') },
  { id: 'cpm', label: 'CPM', group: 'Performance', defaultOn: true, numeric: true, render: (r) => (r.t.impressions > 0 ? inr(Math.round(cpm(r.t))) : '–') },
  { id: 'cpc', label: 'CPC (link)', group: 'Performance', defaultOn: true, numeric: true, render: (r) => (r.t.linkClicks > 0 ? inr(Math.round(cpc(r.t))) : '–') },
  { id: 'ctr', label: 'CTR (link)', group: 'Performance', defaultOn: true, numeric: true, render: (r) => (r.t.impressions > 0 ? pct(ctr(r.t)) : '–') },
  { id: 'linkClicks', label: 'Link clicks', group: 'Performance', defaultOn: false, numeric: true, render: (r) => num(r.t.linkClicks) },
  { id: 'costPerResult', label: 'Cost / result', group: 'Performance', defaultOn: true, numeric: true, render: (r) => (r.t.purchases > 0 ? inr(Math.round(costPerResult(r.t))) : '–') },
  { id: 'amountSpent', label: 'Amount spent', group: 'Performance', defaultOn: true, numeric: true, render: (r) => inr(r.t.spend) },
  { id: 'purchaseValue', label: 'Purchase value', group: 'Performance', defaultOn: false, numeric: true, render: (r) => inr(r.t.revenue) },
  { id: 'roas', label: 'Purchase ROAS', group: 'Performance', defaultOn: true, numeric: true, render: (r) => (r.t.spend > 0 && r.t.revenue > 0 ? `${campaignRoas(r.t).toFixed(2)}x` : '–') },
  { id: 'lpv', label: 'Landing page views', group: 'Funnel', defaultOn: false, numeric: true, render: (r) => num(r.funnel.landingPageViews) },
  { id: 'costPerLpv', label: 'Cost / landing page view', group: 'Funnel', defaultOn: false, numeric: true, render: (r) => (r.funnel.landingPageViews > 0 ? inr(Math.round(r.t.spend / r.funnel.landingPageViews)) : '–') },
  { id: 'atc', label: 'Adds to cart', group: 'Funnel', defaultOn: false, numeric: true, render: (r) => num(r.funnel.addToCart) },
  { id: 'costPerAtc', label: 'Cost / add to cart', group: 'Funnel', defaultOn: false, numeric: true, render: (r) => (r.funnel.addToCart > 0 ? inr(Math.round(r.t.spend / r.funnel.addToCart)) : '–') },
  { id: 'checkout', label: 'Checkouts initiated', group: 'Funnel', defaultOn: false, numeric: true, render: (r) => num(r.funnel.checkoutInitiated) },
  { id: 'costPerCheckout', label: 'Cost / checkout', group: 'Funnel', defaultOn: false, numeric: true, render: (r) => (r.funnel.checkoutInitiated > 0 ? inr(Math.round(r.t.spend / r.funnel.checkoutInitiated)) : '–') },
];
const DEFAULT_COLUMNS = COLUMNS.filter((c) => c.defaultOn).map((c) => c.id);
const FOOTER_SKIP = new Set(['delivery', 'bidStrategy', 'budget']);

function campaignRowToDisplay(r: Row): DisplayRow {
  return {
    id: r.c.name, name: r.c.name, subtitle: r.c.type, filterType: r.c.type,
    delivery: r.c.delivery,
    bidStrategyText: r.c.bidStrategy === 'Cost per result goal' ? `Cost per result goal · ${inr(r.c.costPerResultGoal ?? 0)}` : r.c.bidStrategy,
    budgetText: `Daily · ${inr(r.c.dailyBudget)}`,
    t: r.t, reach: r.reach, funnel: r.funnel,
    highlight: r.c.delivery === 'Learning',
  };
}

// ─────────────────────────────────────────────────────── create campaign ──

interface CreateCampaignInput {
  name: string;
  type: DemoCampaign['type'];
  bidStrategy: DemoCampaign['bidStrategy'];
  costPerResultGoal?: number;
  dailyBudget: number;
}

const ACCOUNT_AOV = DEMO_TOTALS.revenue / DEMO_TOTALS.purchases;
const CTR_BAND: Record<DemoCampaign['type'], number> = { Prospecting: 1.15, Retargeting: 2.6, Catalog: 1.9 };

/** A brand-new campaign's first-day numbers: small, noisy, and delivery still
 *  "Learning". That's realistic, not a placeholder. Randomised (not seeded) since
 *  this is a live user action, not a fixed case-study figure. */
function buildDayOneCampaign(input: CreateCampaignInput): DemoCampaign {
  const spend = Math.round(input.dailyBudget * (0.25 + Math.random() * 0.45));
  const cpmGuess = 90 + Math.random() * 55;
  const impressions = Math.max(1, Math.round((spend / cpmGuess) * 1000));
  const ctrGuess = CTR_BAND[input.type] * (0.8 + Math.random() * 0.4);
  const linkClicks = Math.max(0, Math.round(impressions * (ctrGuess / 100)));
  const purchases = spend > input.dailyBudget * 0.45 && Math.random() < 0.4 ? 1 : 0;
  const revenue = purchases > 0 ? Math.round(ACCOUNT_AOV * (0.8 + Math.random() * 0.5)) : 0;
  const reach = Math.max(1, Math.round(impressions / (1 + Math.random() * 0.15)));
  return {
    name: input.name, type: input.type,
    spend, revenue, purchases, impressions, linkClicks, reach,
    bidStrategy: input.bidStrategy,
    costPerResultGoal: input.bidStrategy === 'Cost per result goal' ? input.costPerResultGoal : undefined,
    dailyBudget: input.dailyBudget,
    delivery: 'Learning',
  };
}

// ──────────────────────────────────────────────────────────────── component ──

export function RunDashboard({ storageScope = 'run' }: { storageScope?: string } = {}) {
  const campaignsKey = `tiramisu:meta-${storageScope}:campaigns:v1`;
  const columnsKey = `tiramisu:meta-${storageScope}:columns:v1`;

  const [nav, setNav] = useState<NavKey>('campaigns');
  const [filter, setFilter] = useState<Filter>('All');

  const [rangeKey, setRangeKey] = useState<RangeKey>('30d');
  const [customFrom, setCustomFrom] = useState<string>(isoDaysBefore(LATEST_DATE, 29));
  const [customTo, setCustomTo] = useState<string>(LATEST_DATE);
  const [rangeOpen, setRangeOpen] = useState(false);

  const [enabledColumns, setEnabledColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [columnsOpen, setColumnsOpen] = useState(false);

  const [customCampaigns, setCustomCampaigns] = useState<DemoCampaign[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [reportBy, setReportBy] = useState<'type' | 'delivery'>('type');

  useEffect(() => {
    try {
      const rawCols = localStorage.getItem(columnsKey);
      if (rawCols) setEnabledColumns(JSON.parse(rawCols));
      const rawCamp = localStorage.getItem(campaignsKey);
      if (rawCamp) setCustomCampaigns(JSON.parse(rawCamp));
    } catch {
      // localStorage unavailable or corrupt: fall back to defaults, no need to surface an error
    }
    setHydrated(true);
    // storageScope is fixed for the lifetime of a given mount (campaigns vs. marketing preview)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(columnsKey, JSON.stringify(enabledColumns));
  }, [enabledColumns, hydrated, columnsKey]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(campaignsKey, JSON.stringify(customCampaigns));
  }, [customCampaigns, hydrated, campaignsKey]);

  const { from, to } = useMemo(() => {
    if (rangeKey === 'custom') return { from: customFrom, to: customTo };
    const days = RANGE_PRESETS.find((p) => p.key === rangeKey)!.days;
    return { from: isoDaysBefore(LATEST_DATE, days - 1), to: LATEST_DATE };
  }, [rangeKey, customFrom, customTo]);
  const rangeDays = rangeDayCount(from, to);
  const rangeLabel = rangeKey === 'custom' ? `${formatShort(from)} – ${formatShort(to)}` : RANGE_PRESETS.find((p) => p.key === rangeKey)!.label;

  const allRows: Row[] = useMemo(() => {
    return [...DEMO_CAMPAIGNS, ...customCampaigns].map((c) => {
      const t = rangeTotals(c, from, to);
      const reach = rangeReach(c, from, to, t, rangeDays);
      const funnel = funnelFor(c.type, t.purchases, t.linkClicks);
      return { c, t, reach, funnel };
    });
  }, [customCampaigns, from, to, rangeDays]);

  const campaignDisplayRows = useMemo(() => allRows.map(campaignRowToDisplay), [allRows]);
  const adSetDisplayRows = useMemo<DisplayRow[]>(() => {
    return DEMO_ADSETS.flatMap((as) => {
      const parent = campaignDisplayRows.find((r) => r.id === as.campaignName);
      if (!parent) return [];
      const t = scaleTotals(parent.t, as.share);
      const reach = Math.round(parent.reach * as.share);
      const funnel = funnelFor(parent.filterType, t.purchases, t.linkClicks);
      return [{
        id: as.id, name: as.name, subtitle: as.campaignName, filterType: parent.filterType,
        delivery: as.delivery, bidStrategyText: parent.bidStrategyText, budgetText: 'Uses campaign budget',
        t, reach, funnel,
      }];
    });
  }, [campaignDisplayRows]);
  const adDisplayRows = useMemo<DisplayRow[]>(() => {
    return DEMO_ADS.flatMap((ad) => {
      const parent = adSetDisplayRows.find((r) => r.id === ad.adSetId);
      if (!parent) return [];
      const t = scaleTotals(parent.t, ad.share);
      const reach = Math.round(parent.reach * ad.share);
      const funnel = funnelFor(parent.filterType, t.purchases, t.linkClicks);
      return [{
        id: ad.id, name: ad.name, subtitle: ad.format, filterType: parent.filterType,
        delivery: ad.delivery, bidStrategyText: parent.bidStrategyText, budgetText: 'Uses campaign budget',
        t, reach, funnel,
      }];
    });
  }, [adSetDisplayRows]);

  const levelRows = nav === 'campaigns' ? campaignDisplayRows : nav === 'adsets' ? adSetDisplayRows : nav === 'ads' ? adDisplayRows : [];
  const rows = levelRows.filter((r) => filter === 'All' || r.filterType === filter);
  const visibleColumns = COLUMNS.filter((col) => enabledColumns.includes(col.id));

  const audienceRows = useMemo(() => DEMO_AUDIENCES.map((aud) => {
    const adSet = adSetDisplayRows.find((r) => r.id === aud.adSetId);
    return {
      id: aud.id, name: aud.name, type: aud.type, size: aud.size,
      adSetName: adSet?.name ?? '', campaignName: adSet?.subtitle ?? '',
      t: adSet?.t ?? EMPTY_TOTALS,
    };
  }), [adSetDisplayRows]);

  const creativeCards = useMemo(() => DEMO_ADS.map((ad) => {
    const row = adDisplayRows.find((r) => r.id === ad.id);
    const adSet = adSetDisplayRows.find((r) => r.id === ad.adSetId);
    return row ? { ad, row, adSetName: adSet?.name ?? '' } : null;
  }).filter((x): x is { ad: DemoAd; row: DisplayRow; adSetName: string } => x !== null), [adDisplayRows, adSetDisplayRows]);

  const reportGroups = useMemo(
    () => groupRows(campaignDisplayRows, reportBy === 'type' ? (r) => r.filterType : (r) => r.delivery),
    [campaignDisplayRows, reportBy],
  );

  const kpiSpend = allRows.reduce((n, r) => n + r.t.spend, 0);
  const kpiRevenue = allRows.reduce((n, r) => n + r.t.revenue, 0);
  const kpiPurchases = allRows.reduce((n, r) => n + r.t.purchases, 0);
  const kpiNewCustomers = Math.round(kpiPurchases * NEW_CUSTOMER_RATE);
  const kpiCac = kpiNewCustomers > 0 ? Math.round(kpiSpend / kpiNewCustomers) : 0;
  const kpiRoas = kpiSpend > 0 ? kpiRevenue / kpiSpend : 0;

  const footerTotals = rows.reduce<MetricTotals>((a, r) => ({
    spend: a.spend + r.t.spend, revenue: a.revenue + r.t.revenue, purchases: a.purchases + r.t.purchases,
    impressions: a.impressions + r.t.impressions, linkClicks: a.linkClicks + r.t.linkClicks,
  }), { spend: 0, revenue: 0, purchases: 0, impressions: 0, linkClicks: 0 });
  const footerReach = rows.reduce((n, r) => n + r.reach, 0);
  const footerFunnel = rows.reduce<FunnelCounts>((a, r) => ({
    landingPageViews: a.landingPageViews + r.funnel.landingPageViews,
    addToCart: a.addToCart + r.funnel.addToCart,
    checkoutInitiated: a.checkoutInitiated + r.funnel.checkoutInitiated,
  }), { landingPageViews: 0, addToCart: 0, checkoutInitiated: 0 });
  const footerRow: DisplayRow = {
    id: 'footer', name: '', subtitle: '', filterType: 'Prospecting', delivery: 'Active',
    bidStrategyText: '', budgetText: '', t: footerTotals, reach: footerReach, funnel: footerFunnel,
  };

  function toggleColumn(id: string) {
    setEnabledColumns((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="mb-shell">
      {(rangeOpen || columnsOpen) && <div className="mb-backdrop" onClick={() => { setRangeOpen(false); setColumnsOpen(false); }} />}

      <aside className="mb-side">
        <div className="mb-logo">
          <span className="mb-logo-mark" aria-hidden />
          {DEMO_BRAND.name}
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === nav ? 'mb-nav-item mb-nav-on' : 'mb-nav-item'}
              aria-current={item.key === nav ? 'page' : undefined}
              onClick={() => setNav(item.key)}
            >
              <span className="mb-nav-dot" aria-hidden />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="mb-main">
        <div className="mb-topbar">
          <div>
            <h1>{LEVEL_TITLE[nav]}</h1>
            <p className="mb-breadcrumb">{DEMO_BRAND.name} · {DEMO_BRAND.category}</p>
          </div>
          <div className="mb-topbar-right">
            <span className="mb-sim-badge">Educational simulation</span>
            <div className="mb-range-wrap">
              <button type="button" className="mb-range" onClick={() => { setColumnsOpen(false); setRangeOpen((o) => !o); }}>
                {rangeLabel} <ChevronDown size={13} />
              </button>
              {rangeOpen && (
                <div className="mb-range-panel">
                  {RANGE_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      className={rangeKey === p.key ? 'mb-range-opt mb-range-opt-on' : 'mb-range-opt'}
                      onClick={() => { setRangeKey(p.key); if (p.key !== 'custom') setRangeOpen(false); }}
                    >
                      {p.label}
                    </button>
                  ))}
                  {rangeKey === 'custom' && (
                    <div className="mb-range-custom">
                      <label>From
                        <input type="date" value={customFrom} min={EARLIEST_DATE} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
                      </label>
                      <label>To
                        <input type="date" value={customTo} min={customFrom} max={LATEST_DATE} onChange={(e) => setCustomTo(e.target.value)} />
                      </label>
                      <button type="button" className="mb-btn-primary" onClick={() => setRangeOpen(false)}>Apply</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-kpis">
          <Kpi label="Amount spent" value={inr(kpiSpend)} />
          <Kpi label="Purchase value" value={inr(kpiRevenue)} />
          <Kpi label="Results" value={num(kpiPurchases)} />
          <Kpi label="Cost per result" value={kpiNewCustomers > 0 ? inr(kpiCac) : '–'} />
          <Kpi label="Purchase ROAS" value={kpiSpend > 0 ? `${kpiRoas.toFixed(2)}x` : '–'} />
        </div>

        {DATA_LEVELS.has(nav) ? (
          <>
            <div className="mb-toolbar">
              <div className="mb-filters">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                    className={filter === f ? 'mb-filter mb-filter-on' : 'mb-filter'}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="mb-actions">
                <div className="mb-cols-wrap">
                  <button type="button" className="mb-toolbtn" onClick={() => { setRangeOpen(false); setColumnsOpen((o) => !o); }}>
                    <SlidersHorizontal size={13} /> Columns
                  </button>
                  {columnsOpen && (
                    <div className="mb-cols-panel">
                      <div className="mb-cols-head">
                        <span>Customize columns</span>
                        <button type="button" className="mb-cols-reset" onClick={() => setEnabledColumns(DEFAULT_COLUMNS)}>Reset to default</button>
                      </div>
                      {(['Performance', 'Funnel'] as const).map((group) => (
                        <div key={group} className="mb-cols-group">
                          <div className="mb-cols-group-label">{group}</div>
                          {COLUMNS.filter((c) => c.group === group).map((c) => (
                            <label key={c.id} className="mb-cols-item">
                              <input type="checkbox" checked={enabledColumns.includes(c.id)} onChange={() => toggleColumn(c.id)} />
                              {c.label}
                            </label>
                          ))}
                        </div>
                      ))}
                      <button type="button" className="mb-btn-primary mb-cols-done" onClick={() => setColumnsOpen(false)}>Done</button>
                    </div>
                  )}
                </div>
                {nav === 'campaigns' && (
                  <button type="button" className="mb-btn-primary" onClick={() => setCreateOpen(true)}>
                    <Plus size={14} /> Create
                  </button>
                )}
              </div>
            </div>

            <div className="mb-table-wrap">
              <table className="mb-table">
                <thead>
                  <tr>
                    <th className="mb-col-toggle" aria-label="Delivery on/off" />
                    <th>{LEVEL_NAME_HEADER[nav]}</th>
                    {visibleColumns.map((col) => (
                      <th key={col.id} className={col.numeric ? 'num' : undefined}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => <TableRow key={r.id} row={r} columns={visibleColumns} />)}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>{filter === 'All' ? `All ${LEVEL_TITLE[nav].toLowerCase()}` : `${filter} ${LEVEL_TITLE[nav].toLowerCase()}`}</td>
                    {visibleColumns.map((col) => (
                      <td key={col.id} className={col.numeric ? 'num' : undefined}>
                        {FOOTER_SKIP.has(col.id) ? '' : col.render(footerRow)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="mb-footnote">
              A fictional account built for teaching. These are not real Meta results and not
              performance benchmarks. Cost per result in the table is spend ÷ purchases; the
              account-level Cost per result KPI at the top is cost per <em>new customer</em> instead,
              which is why the two numbers don&apos;t match, the same gap the SQL course teaches you
              to notice, holding across whatever date range or level (campaign, ad set, ad) you view.
            </p>
          </>
        ) : nav === 'audiences' ? (
          <AudiencesPanel rows={audienceRows} />
        ) : nav === 'creative' ? (
          <CreativePanel cards={creativeCards} />
        ) : (
          <ReportingPanel groups={reportGroups} breakdown={reportBy} onBreakdown={setReportBy} />
        )}
      </div>

      {createOpen && <CreateCampaignModal onClose={() => setCreateOpen(false)} onCreate={(input) => { setCustomCampaigns((prev) => [buildDayOneCampaign(input), ...prev]); setCreateOpen(false); }} />}

      <style>{`
        .mb-shell {
          --m-bg: #f0f2f5;
          --m-card: #ffffff;
          --m-line: #dadde1;
          --m-ink: #1c1e21;
          --m-muted: #65676b;
          --m-faint: #8a8d91;
          --m-blue: #1877f2;
          --m-blue-soft: #e7f0ff;
          --m-green: #31a24c;
          --m-amber: #f0a20d;
          position: relative;
          background: var(--m-bg);
          color: var(--m-ink);
          font-family: "Segoe UI", -apple-system, Roboto, Helvetica, Arial, sans-serif;
          display: grid;
          grid-template-columns: 220px 1fr;
          min-height: 640px;
          border: 1px solid var(--m-line);
          border-radius: 12px;
          overflow: hidden;
        }
        .mb-shell * { box-sizing: border-box; }

        .mb-backdrop { position: fixed; inset: 0; z-index: 40; background: transparent; }

        .mb-side { background: var(--m-card); border-right: 1px solid var(--m-line); padding: 18px 12px; }
        .mb-logo { display: flex; align-items: center; gap: 9px; padding: 4px 8px 18px; font-weight: 700; font-size: 15px; }
        .mb-logo-mark { width: 24px; height: 24px; border-radius: 6px; background: var(--m-blue); display: inline-block; }
        .mb-nav-item {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 9px 10px; border-radius: 6px; font: 500 13.5px/1 inherit;
          color: var(--m-muted); margin-bottom: 2px; cursor: pointer;
          background: none; border: none; text-align: left;
        }
        .mb-nav-item:hover { background: #f2f3f5; }
        .mb-nav-dot { width: 16px; height: 16px; border-radius: 4px; background: var(--m-line); flex-shrink: 0; }
        .mb-nav-on { background: var(--m-blue-soft); color: var(--m-blue); font-weight: 700; }
        .mb-nav-on:hover { background: var(--m-blue-soft); }
        .mb-nav-on .mb-nav-dot { background: var(--m-blue); }

        .mb-main { padding: 22px 26px 28px; min-width: 0; position: relative; }
        .mb-topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
        .mb-topbar h1 { font-size: 19px; font-weight: 700; margin: 0; }
        .mb-breadcrumb { font-size: 12.5px; color: var(--m-muted); margin: 2px 0 0; }
        .mb-topbar-right { display: flex; align-items: center; gap: 8px; }
        .mb-sim-badge {
          font-size: 11px; font-weight: 700; color: #7a5b00; background: #fff4d6;
          border: 1px solid #f0d98c; border-radius: 999px; padding: 5px 10px;
        }

        .mb-range-wrap, .mb-cols-wrap { position: relative; }
        .mb-range {
          display: inline-flex; align-items: center; gap: 6px;
          font: 500 12.5px/1 inherit; color: var(--m-muted);
          border: 1px solid var(--m-line); background: var(--m-card); padding: 7px 13px; border-radius: 6px; cursor: pointer;
        }
        .mb-range-panel, .mb-cols-panel {
          position: absolute; top: calc(100% + 6px); right: 0; z-index: 50;
          background: var(--m-card); border: 1px solid var(--m-line); border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,.12); padding: 8px; min-width: 200px;
        }
        .mb-range-opt {
          display: block; width: 100%; text-align: left; font: 500 13px/1 inherit;
          padding: 8px 10px; border-radius: 6px; border: none; background: none; color: var(--m-ink); cursor: pointer;
        }
        .mb-range-opt:hover { background: #f2f3f5; }
        .mb-range-opt-on { background: var(--m-blue-soft); color: var(--m-blue); font-weight: 700; }
        .mb-range-custom { padding: 8px 6px 4px; border-top: 1px solid var(--m-line); margin-top: 4px; display: flex; flex-direction: column; gap: 8px; }
        .mb-range-custom label { display: flex; flex-direction: column; gap: 3px; font-size: 11.5px; color: var(--m-muted); font-weight: 600; }
        .mb-range-custom input[type="date"] { font: 500 12.5px inherit; padding: 6px 8px; border: 1px solid var(--m-line); border-radius: 6px; }

        .mb-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 16px; }
        .mb-kpi { background: var(--m-card); border: 1px solid var(--m-line); border-radius: 8px; padding: 13px 14px; }
        .mb-kpi-l { font-size: 11.5px; color: var(--m-muted); font-weight: 500; }
        .mb-kpi-v { font-size: 19px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }

        .mb-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
        .mb-filters { display: flex; flex-wrap: wrap; gap: 6px; }
        .mb-filter {
          font: 500 12.5px/1 inherit; padding: 7px 13px; border-radius: 6px;
          border: 1px solid var(--m-line); background: var(--m-card); color: var(--m-muted); cursor: pointer;
        }
        .mb-filter-on { background: var(--m-blue-soft); border-color: var(--m-blue); color: var(--m-blue); font-weight: 700; }

        .mb-actions { display: flex; align-items: center; gap: 8px; }
        .mb-toolbtn {
          display: inline-flex; align-items: center; gap: 6px;
          font: 600 12.5px/1 inherit; padding: 7px 13px; border-radius: 6px;
          border: 1px solid var(--m-line); background: var(--m-card); color: var(--m-muted); cursor: pointer;
        }
        .mb-toolbtn:hover { background: #f2f3f5; }
        .mb-btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          font: 700 12.5px/1 inherit; padding: 8px 14px; border-radius: 6px;
          border: 1px solid var(--m-blue); background: var(--m-blue); color: #fff; cursor: pointer;
        }
        .mb-btn-primary:hover { background: #166fe0; }
        .mb-btn-secondary {
          font: 600 12.5px/1 inherit; padding: 8px 14px; border-radius: 6px;
          border: 1px solid var(--m-line); background: var(--m-card); color: var(--m-ink); cursor: pointer;
        }

        .mb-cols-panel { min-width: 240px; max-height: 380px; overflow-y: auto; }
        .mb-cols-head { display: flex; align-items: center; justify-content: space-between; padding: 4px 6px 8px; font-size: 12.5px; font-weight: 700; border-bottom: 1px solid var(--m-line); margin-bottom: 4px; }
        .mb-cols-reset { font: 600 11px/1 inherit; color: var(--m-blue); background: none; border: none; cursor: pointer; }
        .mb-cols-group-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; color: var(--m-faint); padding: 8px 8px 4px; }
        .mb-cols-item { display: flex; align-items: center; gap: 8px; font-size: 12.5px; padding: 6px 8px; border-radius: 6px; cursor: pointer; }
        .mb-cols-item:hover { background: #f2f3f5; }
        .mb-cols-done { width: 100%; justify-content: center; margin-top: 6px; }

        .mb-table-wrap { overflow-x: auto; background: var(--m-card); border: 1px solid var(--m-line); border-radius: 8px; }
        .mb-table { width: 100%; min-width: 980px; border-collapse: collapse; }
        .mb-table th {
          text-align: left; font-size: 11.5px; color: var(--m-muted); font-weight: 600;
          padding: 10px 13px; border-bottom: 1px solid var(--m-line); background: #fafbfc; white-space: nowrap;
        }
        .mb-table td { padding: 11px 13px; border-bottom: 1px solid var(--m-line); font-size: 12.5px; white-space: nowrap; }
        .mb-table tbody tr:hover { background: #fafbfc; }
        .mb-table tbody tr:last-child td { border-bottom: 1px solid var(--m-line); }
        .mb-table th.num, .mb-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .mb-col-toggle { width: 44px; }
        .mb-row-new td { background: #f4faf6; }

        .mb-campaign-name { color: var(--m-blue); font-weight: 500; }
        .mb-campaign-type { display: block; font-size: 11px; color: var(--m-faint); font-weight: 400; margin-top: 1px; }

        .mb-toggle { width: 30px; height: 17px; border-radius: 999px; background: var(--m-green); position: relative; display: inline-block; }
        .mb-toggle::after { content: ""; width: 13px; height: 13px; border-radius: 50%; background: #fff; position: absolute; right: 2px; top: 2px; }

        .mb-delivery { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
        .mb-delivery::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--m-green); }

        .mb-table tfoot td { padding: 11px 13px; font-weight: 700; background: #fafbfc; border-top: 1px solid var(--m-line); border-bottom: none; }
        .mb-table tfoot td.num { text-align: right; font-variant-numeric: tabular-nums; }

        .mb-footnote { margin-top: 14px; font-size: 12px; color: var(--m-faint); max-width: 74ch; }

        .mb-creative-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .mb-creative-card { background: var(--m-card); border: 1px solid var(--m-line); border-radius: 8px; overflow: hidden; }
        .mb-creative-thumb { height: 110px; display: flex; align-items: center; justify-content: center; }
        .mb-creative-body { padding: 11px 12px 13px; }
        .mb-creative-name { font-size: 12.5px; font-weight: 600; color: var(--m-ink); line-height: 1.35; }
        .mb-creative-meta { font-size: 11px; color: var(--m-faint); margin-top: 3px; }
        .mb-creative-stats { display: flex; gap: 14px; margin-top: 9px; padding-top: 9px; border-top: 1px solid var(--m-line); font-size: 11px; color: var(--m-muted); }
        .mb-creative-stats b { font-size: 12.5px; color: var(--m-ink); font-variant-numeric: tabular-nums; display: block; }

        .mb-modal-backdrop { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .mb-modal { width: 100%; max-width: 420px; background: var(--m-card); border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,.3); max-height: 90vh; overflow-y: auto; }
        .mb-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--m-line); }
        .mb-modal-head h2 { font-size: 16px; font-weight: 700; margin: 0; }
        .mb-modal-close { border: none; background: none; color: var(--m-muted); cursor: pointer; padding: 4px; display: flex; }
        .mb-modal-body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 12px; }
        .mb-field { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; font-weight: 600; color: var(--m-muted); }
        .mb-field input, .mb-field select {
          font: 500 13.5px inherit; color: var(--m-ink); padding: 9px 10px;
          border: 1px solid var(--m-line); border-radius: 6px; background: var(--m-card);
        }
        .mb-modal-error { font-size: 12.5px; font-weight: 600; color: #d32f2f; margin: 0; }
        .mb-modal-hint { font-size: 11.5px; color: var(--m-faint); margin: 0; line-height: 1.5; }
        .mb-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }

        @media (max-width: 760px) {
          .mb-shell { grid-template-columns: 1fr; }
          .mb-side { display: none; }
          .mb-kpis { grid-template-columns: repeat(2, 1fr); }
          .mb-range-panel, .mb-cols-panel { right: auto; left: 0; }
        }
      `}</style>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-kpi">
      <div className="mb-kpi-l">{label}</div>
      <div className="mb-kpi-v">{value}</div>
    </div>
  );
}

function TableRow({ row, columns }: { row: DisplayRow; columns: ColumnDef[] }) {
  return (
    <tr className={row.highlight ? 'mb-row-new' : undefined}>
      <td><span className="mb-toggle" role="img" aria-label="Delivery on" /></td>
      <td>
        <span className="mb-campaign-name">{row.name}</span>
        <span className="mb-campaign-type">{row.subtitle}</span>
      </td>
      {columns.map((col) => (
        <td key={col.id} className={col.numeric ? 'num' : undefined}>{col.render(row)}</td>
      ))}
    </tr>
  );
}

interface AudienceDisplay {
  id: string; name: string; type: string; size: number; adSetName: string; campaignName: string; t: MetricTotals;
}

function AudiencesPanel({ rows }: { rows: AudienceDisplay[] }) {
  return (
    <>
      <div className="mb-table-wrap">
        <table className="mb-table">
          <thead>
            <tr>
              <th>Audience</th>
              <th>Type</th>
              <th className="num">Estimated size</th>
              <th>Used in</th>
              <th className="num">Results</th>
              <th className="num">Amount spent</th>
              <th className="num">Cost / result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td><span className="mb-campaign-name">{a.name}</span></td>
                <td>{a.type}</td>
                <td className="num">{compactNum(a.size)} people</td>
                <td>
                  <span className="mb-campaign-name" style={{ color: 'var(--m-ink)', fontWeight: 400 }}>{a.adSetName}</span>
                  <span className="mb-campaign-type">{a.campaignName}</span>
                </td>
                <td className="num">{num(a.t.purchases)}</td>
                <td className="num">{inr(a.t.spend)}</td>
                <td className="num">{a.t.purchases > 0 ? inr(Math.round(costPerResult(a.t))) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mb-footnote">
        Audience sizes are invented estimates for teaching, not real reach figures. Results and
        spend per audience are pulled live from that audience&apos;s ad set, for whichever date
        range you&apos;ve selected above.
      </p>
    </>
  );
}

function CreativePanel({ cards }: { cards: { ad: DemoAd; row: DisplayRow; adSetName: string }[] }) {
  return (
    <>
      <div className="mb-creative-grid">
        {cards.map(({ ad, row, adSetName }) => {
          const meta = FORMAT_META[ad.format];
          const Icon = meta.icon;
          return (
            <div key={ad.id} className="mb-creative-card">
              <div className="mb-creative-thumb" style={{ background: meta.color }}>
                <Icon size={26} color="#fff" strokeWidth={1.75} />
              </div>
              <div className="mb-creative-body">
                <div className="mb-creative-name">{row.name}</div>
                <div className="mb-creative-meta">{ad.format} · {adSetName}</div>
                <div className="mb-creative-stats">
                  <span><b>{row.t.impressions > 0 ? pct(ctr(row.t)) : '–'}</b> CTR</span>
                  <span><b>{row.t.spend > 0 && row.t.revenue > 0 ? `${campaignRoas(row.t).toFixed(2)}x` : '–'}</b> ROAS</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mb-footnote">
        Thumbnails are format placeholders, not real creative, this simulator doesn&apos;t model
        an asset library. Stats per ad are live for whichever date range you&apos;ve selected above.
      </p>
    </>
  );
}

function ReportingPanel({
  groups, breakdown, onBreakdown,
}: {
  groups: { key: string; t: MetricTotals; reach: number }[];
  breakdown: 'type' | 'delivery';
  onBreakdown: (b: 'type' | 'delivery') => void;
}) {
  return (
    <>
      <div className="mb-toolbar">
        <div className="mb-filters">
          <button type="button" className={breakdown === 'type' ? 'mb-filter mb-filter-on' : 'mb-filter'} onClick={() => onBreakdown('type')}>By campaign type</button>
          <button type="button" className={breakdown === 'delivery' ? 'mb-filter mb-filter-on' : 'mb-filter'} onClick={() => onBreakdown('delivery')}>By delivery status</button>
        </div>
      </div>
      <div className="mb-table-wrap">
        <table className="mb-table">
          <thead>
            <tr>
              <th>{breakdown === 'type' ? 'Campaign type' : 'Delivery status'}</th>
              <th className="num">Results</th>
              <th className="num">Amount spent</th>
              <th className="num">CPM</th>
              <th className="num">CTR</th>
              <th className="num">Cost / result</th>
              <th className="num">Purchase ROAS</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.key}>
                <td><span className="mb-campaign-name" style={{ color: 'var(--m-ink)' }}>{g.key}</span></td>
                <td className="num">{num(g.t.purchases)}</td>
                <td className="num">{inr(g.t.spend)}</td>
                <td className="num">{g.t.impressions > 0 ? inr(Math.round(cpm(g.t))) : '–'}</td>
                <td className="num">{g.t.impressions > 0 ? pct(ctr(g.t)) : '–'}</td>
                <td className="num">{g.t.purchases > 0 ? inr(Math.round(costPerResult(g.t))) : '–'}</td>
                <td className="num">{g.t.spend > 0 && g.t.revenue > 0 ? `${campaignRoas(g.t).toFixed(2)}x` : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mb-footnote">
        A live breakdown of the account for whichever date range you&apos;ve selected above, this
        simulator doesn&apos;t model saved/exported custom reports beyond that.
      </p>
    </>
  );
}

function CreateCampaignModal({ onClose, onCreate }: { onClose: () => void; onCreate: (input: CreateCampaignInput) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<DemoCampaign['type']>('Prospecting');
  const [bidStrategy, setBidStrategy] = useState<DemoCampaign['bidStrategy']>('Highest volume');
  const [costGoal, setCostGoal] = useState('850');
  const [dailyBudget, setDailyBudget] = useState('2000');
  const [error, setError] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    const budget = Number(dailyBudget);
    if (!trimmed) { setError('Campaign name is required.'); return; }
    if (!Number.isFinite(budget) || budget < 100) { setError('Enter a daily budget of at least ₹100.'); return; }
    onCreate({
      name: trimmed, type, bidStrategy,
      costPerResultGoal: bidStrategy === 'Cost per result goal' ? (Number(costGoal) || undefined) : undefined,
      dailyBudget: Math.round(budget),
    });
  }

  return (
    <div className="mb-modal-backdrop" onClick={onClose}>
      <div className="mb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mb-modal-head">
          <h2>Create new campaign</h2>
          <button type="button" className="mb-modal-close" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="mb-modal-body">
          <label className="mb-field">
            <span>Campaign name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Prospecting - Reels Broad" autoFocus />
          </label>
          <label className="mb-field">
            <span>Objective</span>
            <select defaultValue="Sales" disabled>
              <option>Sales</option>
            </select>
          </label>
          <label className="mb-field">
            <span>Audience type</span>
            <select value={type} onChange={(e) => setType(e.target.value as DemoCampaign['type'])}>
              <option value="Prospecting">Prospecting (new audience)</option>
              <option value="Retargeting">Retargeting (warm audience)</option>
              <option value="Catalog">Catalog (dynamic ads)</option>
            </select>
          </label>
          <label className="mb-field">
            <span>Bid strategy</span>
            <select value={bidStrategy} onChange={(e) => setBidStrategy(e.target.value as DemoCampaign['bidStrategy'])}>
              <option value="Highest volume">Highest volume</option>
              <option value="Cost per result goal">Cost per result goal</option>
            </select>
          </label>
          {bidStrategy === 'Cost per result goal' && (
            <label className="mb-field">
              <span>Cost per result goal (₹)</span>
              <input type="number" min={1} value={costGoal} onChange={(e) => setCostGoal(e.target.value)} />
            </label>
          )}
          <label className="mb-field">
            <span>Daily budget (₹)</span>
            <input type="number" min={100} step={100} value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} />
          </label>
          {error && <p className="mb-modal-error">{error}</p>}
          <p className="mb-modal-hint">
            New campaigns launch in the Learning phase. Delivery is still stabilizing, so Day 1
            numbers are small and noisy. That&apos;s expected, not a bug.
          </p>
          <div className="mb-modal-actions">
            <button type="button" className="mb-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="mb-btn-primary">Publish campaign</button>
          </div>
        </form>
      </div>
    </div>
  );
}
