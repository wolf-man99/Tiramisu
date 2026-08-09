'use client';

import { useState } from 'react';
import type { CalcVariant } from '@/lib/content/meta-ads/types';

/** Small interactive calculators the learner can play with inside a lesson. */
export function MetaCalculator({ variant }: { variant: CalcVariant }) {
  if (variant === 'roas') return <RoasCalc />;
  if (variant === 'breakeven-roas') return <BreakevenCalc />;
  if (variant === 'cpa') return <CpaCalc />;
  return <BudgetSplit />;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      {children}
    </label>
  );
}

function Num({ value, onChange, prefix, suffix, step = 1 }: { value: number; onChange: (n: number) => void; prefix?: string; suffix?: string; step?: number }) {
  return (
    <span className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-2 py-1">
      {prefix && <span className="text-xs text-[var(--text-faint)]">{prefix}</span>}
      <input type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 bg-transparent text-right text-sm outline-none tabular-nums" />
      {suffix && <span className="text-xs text-[var(--text-faint)]">{suffix}</span>}
    </span>
  );
}

function Result({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-center">
      <div className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums" style={{ color: tone }}>{value}</div>
    </div>
  );
}

function Shell({ children, results }: { children: React.ReactNode; results: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="divide-y divide-[var(--border)]">{children}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">{results}</div>
    </div>
  );
}

function RoasCalc() {
  const [spend, setSpend] = useState(1000);
  const [revenue, setRevenue] = useState(3000);
  const roas = spend > 0 ? revenue / spend : 0;
  const profit = revenue - spend;
  return (
    <Shell results={<>
      <Result label="ROAS" value={`${roas.toFixed(2)}×`} tone={roas >= 2 ? 'var(--success)' : 'var(--warn)'} />
      <Result label="Gross profit*" value={`$${profit.toLocaleString()}`} tone={profit >= 0 ? 'var(--success)' : 'var(--danger)'} />
    </>}>
      <Row label="Ad spend"><Num value={spend} onChange={setSpend} prefix="$" step={100} /></Row>
      <Row label="Revenue from ads"><Num value={revenue} onChange={setRevenue} prefix="$" step={100} /></Row>
      <p className="pt-2 text-[11px] text-[var(--text-faint)]">*Revenue minus spend only — before product cost. See break-even ROAS next.</p>
    </Shell>
  );
}

function BreakevenCalc() {
  const [margin, setMargin] = useState(40);
  const [roas, setRoas] = useState(3);
  const breakeven = margin > 0 ? 1 / (margin / 100) : 0;
  const profitable = roas >= breakeven;
  return (
    <Shell results={<>
      <Result label="Break-even ROAS" value={`${breakeven.toFixed(2)}×`} tone="var(--accent-text)" />
      <Result label="Your ROAS" value={profitable ? 'Profitable ✓' : 'Losing money ✕'} tone={profitable ? 'var(--success)' : 'var(--danger)'} />
    </>}>
      <Row label="Gross margin"><Num value={margin} onChange={setMargin} suffix="%" /></Row>
      <Row label="Your current ROAS"><Num value={roas} onChange={setRoas} suffix="×" step={0.1} /></Row>
      <p className="pt-2 text-[11px] text-[var(--text-faint)]">Break-even ROAS = 1 ÷ margin. Below it, positive ROAS still loses money.</p>
    </Shell>
  );
}

function CpaCalc() {
  const [spend, setSpend] = useState(1000);
  const [conversions, setConversions] = useState(25);
  const cpa = conversions > 0 ? spend / conversions : 0;
  return (
    <Shell results={<Result label="Cost per acquisition" value={`$${cpa.toFixed(2)}`} tone="var(--accent-text)" />}>
      <Row label="Ad spend"><Num value={spend} onChange={setSpend} prefix="$" step={100} /></Row>
      <Row label="Conversions"><Num value={conversions} onChange={setConversions} /></Row>
    </Shell>
  );
}

function BudgetSplit() {
  const [budget, setBudget] = useState(3000);
  return (
    <Shell results={<>
      <Result label="Prospecting (70%)" value={`$${Math.round(budget * 0.7).toLocaleString()}`} tone="var(--info)" />
      <Result label="Retargeting (30%)" value={`$${Math.round(budget * 0.3).toLocaleString()}`} tone="var(--warn)" />
    </>}>
      <Row label="Monthly budget"><Num value={budget} onChange={setBudget} prefix="$" step={500} /></Row>
    </Shell>
  );
}
