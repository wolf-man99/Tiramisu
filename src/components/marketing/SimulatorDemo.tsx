'use client';

import { useState } from 'react';
import { Target, Wallet, TrendingUp, FlaskConical } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import {
  DEMO_BRAND, DEMO_CAMPAIGNS, DEMO_TOTALS, DEMO_CAC, DEMO_ROAS, inr,
  type DemoCampaign,
} from '@/lib/simulator/demo-account';
import { cn } from '@/lib/utils';

const FILTERS = ['All', 'Prospecting', 'Retargeting', 'Catalog'] as const;
type Filter = (typeof FILTERS)[number];

function matches(c: DemoCampaign, f: Filter) {
  return f === 'All' || c.type === f;
}

/** The simulation banner. Deliberately repeated at the top and inside the table. */
function SimBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="chip border-[var(--ink)] bg-[var(--amber)] text-[var(--ink)]">
      <FlaskConical size={11} /> {children}
    </span>
  );
}

export function SimulatorDemo() {
  const [filter, setFilter] = useState<Filter>('All');
  const rows = DEMO_CAMPAIGNS.filter((c) => matches(c, filter));

  const shown = {
    spend: rows.reduce((n, c) => n + c.spend, 0),
    revenue: rows.reduce((n, c) => n + c.revenue, 0),
    purchases: rows.reduce((n, c) => n + c.purchases, 0),
  };

  const metrics = [
    { label: 'Spend', value: inr(DEMO_TOTALS.spend), tint: 'var(--blue)' },
    { label: 'Revenue', value: inr(DEMO_TOTALS.revenue), tint: 'var(--green)' },
    { label: 'Purchases', value: DEMO_TOTALS.purchases.toLocaleString('en-IN'), tint: 'var(--purple)' },
    { label: 'CAC', value: inr(DEMO_CAC), tint: 'var(--teal)' },
    { label: 'ROAS', value: `${DEMO_ROAS.toFixed(2)}x`, tint: 'var(--amber)' },
  ];

  return (
    <Card className="overflow-hidden p-0">
      {/* Account header */}
      <div className="border-b-2 border-[var(--ink)] bg-[var(--bg-subtle)] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-2xl font-extrabold tracking-tight">{DEMO_BRAND.name}</h3>
              <span className="chip">{DEMO_BRAND.category}</span>
            </div>
            <p className="mt-1 text-sm font-bold text-[var(--text-muted)]">
              Your role: {DEMO_BRAND.role}
            </p>
          </div>
          <SimBadge>Educational simulation</SimBadge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { icon: <Wallet size={14} />, label: 'Monthly ad budget', value: inr(DEMO_BRAND.budget) },
            { icon: <TrendingUp size={14} />, label: 'Revenue target', value: inr(DEMO_BRAND.revenueTarget) },
            { icon: <Target size={14} />, label: 'Target CAC', value: `${inr(DEMO_BRAND.targetCacLow)}–${inr(DEMO_BRAND.targetCacHigh)}` },
          ].map((b) => (
            <div key={b.label} className="rounded-[10px] border-2 border-[var(--ink)] bg-white p-3">
              <div className="eyebrow flex items-center gap-1.5">{b.icon} {b.label}</div>
              <div className="mt-1 font-display text-lg font-extrabold tabular-nums">{b.value}</div>
            </div>
          ))}
        </div>

        <p className="mt-3 text-sm text-[var(--text-muted)]">
          <span className="font-bold text-[var(--text)]">Mission:</span> {DEMO_BRAND.mission}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 border-b-2 border-[var(--ink)] md:grid-cols-5">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={cn(
              'border-[var(--ink)] p-4',
              i < metrics.length - 1 && 'border-b-2 md:border-b-0 md:border-r-2',
              i % 2 === 0 && i < metrics.length - 1 && 'border-r-2',
            )}
          >
            <div className="eyebrow">{m.label}</div>
            <div className="mt-1 font-display text-2xl font-extrabold tabular-nums" style={{ color: m.tint }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Campaign table */}
      <div className="p-5 md:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-extrabold uppercase tracking-wide">Campaigns</h4>
          <SimBadge>Simulated data</SimBadge>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                'rounded-[10px] border-2 border-[var(--ink)] px-3 py-1.5 text-[13px] font-bold transition-all focus-ring',
                'hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                filter === f
                  ? 'bg-[var(--ink)] text-white shadow-[3px_3px_0_var(--blue)]'
                  : 'bg-white text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]',
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-[10px] border-2 border-[var(--ink)]">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--ink)] bg-[var(--surface-3)] text-left">
                <th className="p-3 font-extrabold">Campaign</th>
                <th className="p-3 text-right font-extrabold">Spend</th>
                <th className="p-3 text-right font-extrabold">Revenue</th>
                <th className="p-3 text-right font-extrabold">Purchases</th>
                <th className="p-3 text-right font-extrabold">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const roas = c.revenue / c.spend;
                return (
                  <tr key={c.name} className="border-b border-[var(--border-soft)] last:border-0">
                    <td className="p-3 font-bold">{c.name}</td>
                    <td className="p-3 text-right tabular-nums">{inr(c.spend)}</td>
                    <td className="p-3 text-right tabular-nums">{inr(c.revenue)}</td>
                    <td className="p-3 text-right tabular-nums">{c.purchases.toLocaleString('en-IN')}</td>
                    <td
                      className="p-3 text-right font-extrabold tabular-nums"
                      style={{ color: roas >= 3.75 ? 'var(--green)' : 'var(--warn)' }}
                    >
                      {roas.toFixed(2)}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--ink)] bg-[var(--surface-2)] font-extrabold">
                <td className="p-3">{filter === 'All' ? 'Account total' : `${filter} subtotal`}</td>
                <td className="p-3 text-right tabular-nums">{inr(shown.spend)}</td>
                <td className="p-3 text-right tabular-nums">{inr(shown.revenue)}</td>
                <td className="p-3 text-right tabular-nums">{shown.purchases.toLocaleString('en-IN')}</td>
                <td className="p-3 text-right tabular-nums">{(shown.revenue / shown.spend).toFixed(2)}x</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-3 text-xs text-[var(--text-subtle)]">
          A fictional account built for teaching. These are not real Meta results and not
          performance benchmarks. CAC here is cost per <em>new customer</em>, which is why it
          runs above spend ÷ purchases — {DEMO_TOTALS.newCustomers.toLocaleString('en-IN')} of the{' '}
          {DEMO_TOTALS.purchases.toLocaleString('en-IN')} purchases were first-time buyers.
        </p>
      </div>
    </Card>
  );
}
