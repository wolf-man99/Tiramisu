'use client';

import { useState } from 'react';
import {
  DEMO_BRAND, DEMO_CAMPAIGNS, DEMO_TOTALS, DEMO_CAC, DEMO_ROAS, inr,
  cpm, cpc, ctr, costPerResult, campaignRoas,
  type DemoCampaign,
} from '@/lib/simulator/demo-account';

/**
 * The Run dashboard: a deliberate, literal recreation of Meta Ads Manager's own
 * chrome (grey ground, hairline borders, Meta blue, dense small-type table) rather
 * than Tiramisu's neo-brutalist system used everywhere else in the app. That break
 * is intentional — see the Phase 2 design review — so the learner builds real
 * muscle memory for the tool they'll actually use, inside a page that never claims
 * to be the genuine Meta product (see the "Educational simulation" badge below).
 *
 * Every number renders from DEMO_CAMPAIGNS' raw counts via the cpm/cpc/ctr/... derivations
 * in demo-account.ts — nothing here is a separately-typed, driftable duplicate.
 */

const NAV = ['Campaigns', 'Ad sets', 'Ads', 'Audiences', 'Creative', 'Reporting'] as const;
const FILTERS = ['All', 'Prospecting', 'Retargeting', 'Catalog'] as const;
type Filter = (typeof FILTERS)[number];

function pct(n: number, digits = 2): string {
  return `${n.toFixed(digits)}%`;
}
function num(n: number): string {
  return n.toLocaleString('en-IN');
}

export function RunDashboard() {
  const [filter, setFilter] = useState<Filter>('All');
  const rows = DEMO_CAMPAIGNS.filter((c) => filter === 'All' || c.type === filter);

  return (
    <div className="mb-shell">
      <aside className="mb-side">
        <div className="mb-logo">
          <span className="mb-logo-mark" aria-hidden />
          {DEMO_BRAND.name}
        </div>
        <nav>
          {NAV.map((item) => (
            <a key={item} className={item === 'Campaigns' ? 'mb-nav-item mb-nav-on' : 'mb-nav-item'} aria-current={item === 'Campaigns' ? 'page' : undefined}>
              <span className="mb-nav-dot" aria-hidden />
              {item}
            </a>
          ))}
        </nav>
      </aside>

      <div className="mb-main">
        <div className="mb-topbar">
          <div>
            <h1>Campaigns</h1>
            <p className="mb-breadcrumb">{DEMO_BRAND.name} · {DEMO_BRAND.category}</p>
          </div>
          <div className="mb-topbar-right">
            <span className="mb-sim-badge">Educational simulation</span>
            <span className="mb-range">Last 30 days</span>
          </div>
        </div>

        <div className="mb-kpis">
          <Kpi label="Amount spent" value={inr(DEMO_TOTALS.spend)} />
          <Kpi label="Purchase value" value={inr(DEMO_TOTALS.revenue)} />
          <Kpi label="Results" value={num(DEMO_TOTALS.purchases)} />
          <Kpi label="Cost per result" value={inr(DEMO_CAC)} />
          <Kpi label="Purchase ROAS" value={`${DEMO_ROAS.toFixed(2)}x`} />
        </div>

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

        <div className="mb-table-wrap">
          <table className="mb-table">
            <thead>
              <tr>
                <th className="mb-col-toggle" aria-label="Delivery on/off" />
                <th>Campaign</th>
                <th>Delivery</th>
                <th>Bid strategy</th>
                <th className="num">Budget</th>
                <th className="num">Results</th>
                <th className="num">Reach</th>
                <th className="num">Impressions</th>
                <th className="num">CPM</th>
                <th className="num">CPC</th>
                <th className="num">CTR</th>
                <th className="num">Cost / result</th>
                <th className="num">Amount spent</th>
                <th className="num">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => <CampaignRow key={c.name} c={c} />)}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>{filter === 'All' ? 'All campaigns' : `${filter} campaigns`}</td>
                <td colSpan={3} />
                <td className="num">{num(rows.reduce((n, c) => n + c.purchases, 0))}</td>
                <td className="num">{num(rows.reduce((n, c) => n + c.reach, 0))}</td>
                <td className="num">{num(rows.reduce((n, c) => n + c.impressions, 0))}</td>
                <td colSpan={2} />
                <td className="num">
                  {pct((rows.reduce((n, c) => n + c.linkClicks, 0) / rows.reduce((n, c) => n + c.impressions, 0)) * 100)}
                </td>
                <td className="num">{inr(Math.round(rows.reduce((n, c) => n + c.spend, 0) / rows.reduce((n, c) => n + c.purchases, 0)))}</td>
                <td className="num">{inr(rows.reduce((n, c) => n + c.spend, 0))}</td>
                <td className="num">
                  {(rows.reduce((n, c) => n + c.revenue, 0) / rows.reduce((n, c) => n + c.spend, 0)).toFixed(2)}x
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mb-footnote">
          A fictional account built for teaching. These are not real Meta results and not
          performance benchmarks. Cost per result above is spend ÷ purchases; the account-level
          Cost per result KPI at the top is cost per <em>new customer</em> instead, which is why
          the two numbers don&apos;t match — the same gap the SQL course teaches you to notice.
        </p>
      </div>

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

        .mb-side { background: var(--m-card); border-right: 1px solid var(--m-line); padding: 18px 12px; }
        .mb-logo { display: flex; align-items: center; gap: 9px; padding: 4px 8px 18px; font-weight: 700; font-size: 15px; }
        .mb-logo-mark { width: 24px; height: 24px; border-radius: 6px; background: var(--m-blue); display: inline-block; }
        .mb-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 6px; font-size: 13.5px; font-weight: 500;
          color: var(--m-muted); margin-bottom: 2px; cursor: default;
        }
        .mb-nav-dot { width: 16px; height: 16px; border-radius: 4px; background: var(--m-line); flex-shrink: 0; }
        .mb-nav-on { background: var(--m-blue-soft); color: var(--m-blue); font-weight: 700; }
        .mb-nav-on .mb-nav-dot { background: var(--m-blue); }

        .mb-main { padding: 22px 26px 28px; min-width: 0; }
        .mb-topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
        .mb-topbar h1 { font-size: 19px; font-weight: 700; margin: 0; }
        .mb-breadcrumb { font-size: 12.5px; color: var(--m-muted); margin: 2px 0 0; }
        .mb-topbar-right { display: flex; align-items: center; gap: 8px; }
        .mb-sim-badge {
          font-size: 11px; font-weight: 700; color: #7a5b00; background: #fff4d6;
          border: 1px solid #f0d98c; border-radius: 999px; padding: 5px 10px;
        }
        .mb-range { font-size: 12.5px; color: var(--m-muted); border: 1px solid var(--m-line); background: var(--m-card); padding: 7px 13px; border-radius: 6px; }

        .mb-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 16px; }
        .mb-kpi { background: var(--m-card); border: 1px solid var(--m-line); border-radius: 8px; padding: 13px 14px; }
        .mb-kpi-l { font-size: 11.5px; color: var(--m-muted); font-weight: 500; }
        .mb-kpi-v { font-size: 19px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }

        .mb-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
        .mb-filter {
          font: 500 12.5px/1 inherit; padding: 7px 13px; border-radius: 6px;
          border: 1px solid var(--m-line); background: var(--m-card); color: var(--m-muted); cursor: pointer;
        }
        .mb-filter-on { background: var(--m-blue-soft); border-color: var(--m-blue); color: var(--m-blue); font-weight: 700; }

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

        .mb-campaign-name { color: var(--m-blue); font-weight: 500; }
        .mb-campaign-type { display: block; font-size: 11px; color: var(--m-faint); font-weight: 400; margin-top: 1px; }

        .mb-toggle { width: 30px; height: 17px; border-radius: 999px; background: var(--m-green); position: relative; display: inline-block; }
        .mb-toggle::after { content: ""; width: 13px; height: 13px; border-radius: 50%; background: #fff; position: absolute; right: 2px; top: 2px; }

        .mb-delivery { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
        .mb-delivery::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--m-green); }

        .mb-table tfoot td { padding: 11px 13px; font-weight: 700; background: #fafbfc; border-top: 1px solid var(--m-line); border-bottom: none; }
        .mb-table tfoot td.num { text-align: right; font-variant-numeric: tabular-nums; }

        .mb-footnote { margin-top: 14px; font-size: 12px; color: var(--m-faint); max-width: 74ch; }

        @media (max-width: 760px) {
          .mb-shell { grid-template-columns: 1fr; }
          .mb-side { display: none; }
          .mb-kpis { grid-template-columns: repeat(2, 1fr); }
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

function CampaignRow({ c }: { c: DemoCampaign }) {
  return (
    <tr>
      <td><span className="mb-toggle" role="img" aria-label="Delivery on" /></td>
      <td>
        <span className="mb-campaign-name">{c.name}</span>
        <span className="mb-campaign-type">{c.type}</span>
      </td>
      <td><span className="mb-delivery">{c.delivery}</span></td>
      <td>{c.bidStrategy === 'Cost per result goal' ? `Cost per result goal · ${inr(c.costPerResultGoal!)}` : c.bidStrategy}</td>
      <td className="num">Daily · {inr(c.dailyBudget)}</td>
      <td className="num">{num(c.purchases)}</td>
      <td className="num">{num(c.reach)}</td>
      <td className="num">{num(c.impressions)}</td>
      <td className="num">{inr(Math.round(cpm(c)))}</td>
      <td className="num">{inr(Math.round(cpc(c)))}</td>
      <td className="num">{pct(ctr(c))}</td>
      <td className="num">{inr(Math.round(costPerResult(c)))}</td>
      <td className="num">{inr(c.spend)}</td>
      <td className="num">{campaignRoas(c).toFixed(2)}x</td>
    </tr>
  );
}
