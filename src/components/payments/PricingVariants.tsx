'use client';

import { useState } from 'react';
import { Check, X, Lock, ShieldCheck, Zap, Infinity as InfinityIcon } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { CheckoutButton } from '@/components/payments/CheckoutButton';
import { META_ADS_PRICING, type Product } from '@/lib/payments/pricing';
import { cn } from '@/lib/utils';

/**
 * Three candidate layouts for the course pricing dialog, built as real components
 * so they can be compared at full fidelity before one is chosen. Once a direction
 * is picked the other two get deleted and the winner moves into PricingSection.
 *
 * All three read the same entitlement props and defer the actual buy to
 * CheckoutButton, so switching between them changes only presentation.
 */

const SEPARATE_TOTAL = META_ADS_PRICING.learn + META_ADS_PRICING.run;
const SAVINGS = SEPARATE_TOTAL - META_ADS_PRICING.bundle;
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export interface VariantProps {
  hasLearn: boolean;
  hasRun: boolean;
}

/* ─── Shared bits ──────────────────────────────────────────────────────── */

function TrustRow({ compact }: { compact?: boolean }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-[var(--text-subtle)]">
      <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Secure payment via Razorpay</span>
      <span className="inline-flex items-center gap-1.5"><Zap size={13} /> Instant access</span>
      <span className="inline-flex items-center gap-1.5"><InfinityIcon size={13} /> {compact ? 'Lifetime' : 'Lifetime, no subscription'}</span>
    </div>
  );
}

function Feature({ children, no }: { children: React.ReactNode; no?: boolean }) {
  return (
    <li className={cn('flex items-start gap-2 text-[12.5px] leading-snug', no ? 'text-[var(--text-faint)]' : 'text-[var(--text-muted)]')}>
      {no
        ? <X size={13} className="mt-0.5 shrink-0 text-[var(--text-faint)]" />
        : <Check size={13} className="mt-0.5 shrink-0 text-[var(--green)]" />}
      <span>{children}</span>
    </li>
  );
}

function OwnedCard({ label }: { label: string }) {
  return (
    <Card className="flex items-center gap-2 p-4 text-sm font-semibold text-[var(--text-muted)]">
      <Check size={14} className="shrink-0 text-[var(--green)]" /> {label} is yours
    </Card>
  );
}

/* ─── Variant A: anchored bundle cards ─────────────────────────────────── */

export function VariantAnchoredCards({ hasLearn, hasRun }: VariantProps) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="chip bg-[var(--ink)] text-white">Pricing</span>
        <span className="text-xs text-[var(--text-faint)]">First 2 modules are free. Pay once to unlock the rest, forever.</span>
      </div>

      <div className="grid gap-3 pt-3.5 sm:grid-cols-3 sm:items-start">
        {hasLearn ? <OwnedCard label="Learn" /> : (
          <Card className="flex min-h-[248px] flex-col p-4">
            <div className="text-[15px] font-extrabold">Learn</div>
            <div className="mt-0.5 font-display text-[30px] font-extrabold leading-none tracking-tight">{inr(META_ADS_PRICING.learn)}</div>
            <ul className="mt-3 space-y-1.5">
              <Feature>All 7 modules, 23 lessons</Feature>
              <Feature>Quizzes and calculators</Feature>
              <Feature>Unlimited XP and badges</Feature>
              <Feature no>No account simulator</Feature>
            </ul>
            <div className="mt-auto pt-3.5">
              <CheckoutButton product="learn" label="Buy Learn" variant="secondary" className="w-full justify-center" />
            </div>
          </Card>
        )}

        {!hasLearn && (
          <Card
            className="relative flex min-h-[262px] -translate-y-3.5 flex-col border-[var(--blue)] p-4 pt-6"
            style={{ boxShadow: '4px 4px 0 var(--blue)', background: 'linear-gradient(180deg,#f2f7fc 0%,#fff 60%)' }}
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[var(--ink)] bg-[var(--blue)] px-3 py-1 text-[10.5px] font-extrabold uppercase tracking-wider text-white shadow-[2px_2px_0_var(--ink)]">
              Most popular
            </span>
            <div className="text-[15px] font-extrabold">Bundle</div>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="font-display text-[30px] font-extrabold leading-none tracking-tight">{inr(META_ADS_PRICING.bundle)}</span>
              <span className="text-sm font-semibold text-[var(--text-faint)] line-through">{inr(SEPARATE_TOTAL)}</span>
            </div>
            <span className="mt-2 w-fit rounded-full border-2 border-[var(--ink)] bg-[var(--green)] px-2.5 py-0.5 text-[10.5px] font-extrabold tracking-wide text-white">
              You save {inr(SAVINGS)}
            </span>
            <ul className="mt-3 space-y-1.5">
              <Feature>Everything in Learn</Feature>
              <Feature>The hands-on Run simulator</Feature>
              <Feature>Both tiers, one payment</Feature>
            </ul>
            <div className="mt-auto pt-3.5">
              <CheckoutButton product="bundle" label="Get the bundle" className="w-full justify-center" />
            </div>
          </Card>
        )}

        {hasRun ? <OwnedCard label="Run" /> : (
          <Card className="flex min-h-[248px] flex-col p-4">
            <div className="text-[15px] font-extrabold">Run</div>
            <div className="mt-0.5 font-display text-[30px] font-extrabold leading-none tracking-tight">{inr(META_ADS_PRICING.run)}</div>
            <ul className="mt-3 space-y-1.5">
              <Feature>Full Meta Ads Manager clone</Feature>
              <Feature>Build and scale real campaigns</Feature>
              {!hasLearn && <Feature no>Requires Learn first</Feature>}
            </ul>
            <div className="mt-auto pt-3.5">
              {hasLearn
                ? <CheckoutButton product="run" label="Buy Run" variant="secondary" className="w-full justify-center" />
                : <p className="py-2 text-center text-[11.5px] font-semibold text-[var(--text-faint)]">Add on after you own Learn</p>}
            </div>
          </Card>
        )}
      </div>

      <TrustRow />
    </div>
  );
}

/* ─── Variant B: selectable rows, one CTA ──────────────────────────────── */

export function VariantSelectableRows({ hasLearn, hasRun }: VariantProps) {
  const canBundle = !hasLearn;
  const canRun = hasLearn && !hasRun;
  const [selected, setSelected] = useState<Product>(canBundle ? 'bundle' : 'run');

  const price = META_ADS_PRICING[selected];
  const label = { learn: 'Learn', run: 'Run', bundle: 'Bundle' }[selected];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="chip bg-[var(--ink)] text-white">Pricing</span>
        <span className="text-xs text-[var(--text-faint)]">First 2 modules are free. Pay once, keep it forever.</span>
      </div>

      <div className="grid gap-2.5">
        {canBundle && (
          <Row
            selected={selected === 'bundle'} onSelect={() => setSelected('bundle')}
            name="Bundle" desc="All 23 lessons plus the hands-on Run simulator."
            price={META_ADS_PRICING.bundle} anchor={SEPARATE_TOTAL}
            pills={<>
              <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--blue)] px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-white">Best value</span>
              <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--green)] px-2 py-0.5 text-[9.5px] font-extrabold tracking-wide text-white">Save {inr(SAVINGS)}</span>
            </>}
          />
        )}

        {hasLearn ? <OwnedCard label="Learn" /> : (
          <Row
            selected={selected === 'learn'} onSelect={() => setSelected('learn')}
            name="Learn" desc="All 7 modules, 23 lessons, unlimited XP."
            price={META_ADS_PRICING.learn}
          />
        )}

        {hasRun ? <OwnedCard label="Run" /> : (
          <Row
            selected={selected === 'run'} onSelect={canRun ? () => setSelected('run') : undefined}
            disabled={!canRun}
            name="Run" desc={canRun ? 'The hands-on account simulator.' : 'The account simulator. Unlocks once you own Learn.'}
            price={META_ADS_PRICING.run}
            pills={!canRun ? <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--surface-3)] px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-[var(--text-muted)]">Needs Learn</span> : undefined}
          />
        )}
      </div>

      <div className="mt-4">
        <CheckoutButton
          product={selected}
          label={`Continue to payment · ${inr(price)}`}
          size="lg"
          className="w-full justify-center"
          key={selected}
        />
        <p className="mt-1.5 text-center text-[11px] font-semibold text-[var(--text-faint)]">You are buying {label}. No subscription.</p>
      </div>

      <TrustRow compact />
    </div>
  );
}

function Row({
  selected, onSelect, disabled, name, desc, price, anchor, pills,
}: {
  selected: boolean; onSelect?: () => void; disabled?: boolean;
  name: string; desc: string; price: number; anchor?: number; pills?: React.ReactNode;
}) {
  return (
    <button
      type="button" onClick={onSelect} disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3 rounded-[14px] border-2 border-[var(--ink)] bg-white p-3.5 text-left transition-all',
        selected && 'border-[var(--blue)] bg-[#f2f7fc] shadow-[3px_3px_0_var(--blue)]',
        disabled && 'cursor-not-allowed bg-[var(--surface-2)] opacity-55',
      )}
      aria-pressed={selected}
    >
      <span className={cn('grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-white', selected && 'border-[var(--blue)]')}>
        {selected && <span className="h-[9px] w-[9px] rounded-full bg-[var(--blue)]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-[14.5px] font-extrabold">{name}{pills}</span>
        <span className="mt-0.5 block text-xs leading-snug text-[var(--text-muted)]">{desc}</span>
      </span>
      <span className="shrink-0 text-right">
        {anchor && <span className="block text-[11.5px] font-semibold text-[var(--text-faint)] line-through">{inr(anchor)}</span>}
        <span className="block font-display text-xl font-extrabold leading-tight tracking-tight">{inr(price)}</span>
      </span>
    </button>
  );
}

/* ─── Variant C: comparison table ──────────────────────────────────────── */

const MATRIX: { feature: string; free: React.ReactNode; learn: React.ReactNode; bundle: React.ReactNode }[] = [
  { feature: 'Modules 1 and 2', free: true, learn: true, bundle: true },
  { feature: 'All 7 modules, 23 lessons', free: false, learn: true, bundle: true },
  { feature: 'Quizzes, calculators, XP', free: 'Modules 1 to 2', learn: true, bundle: true },
  { feature: 'Run: the account simulator', free: false, learn: false, bundle: true },
  { feature: 'Lifetime access', free: true, learn: true, bundle: true },
];

function Cell({ v }: { v: React.ReactNode }) {
  if (v === true) return <Check size={15} className="mx-auto text-[var(--green)]" />;
  if (v === false) return <X size={15} className="mx-auto text-[var(--text-faint)]" />;
  return <span className="text-[11.5px] font-semibold text-[var(--text-muted)]">{v}</span>;
}

export function VariantComparisonTable({ hasLearn, hasRun }: VariantProps) {
  if (hasLearn) {
    // The matrix compares Free/Learn/Bundle, none of which are purchasable once
    // Learn is owned, so fall back to the row layout for the Run upsell.
    return <VariantSelectableRows hasLearn={hasLearn} hasRun={hasRun} />;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="chip bg-[var(--ink)] text-white">Pricing</span>
        <span className="text-xs text-[var(--text-faint)]">Compare what you get. Pay once, keep it forever.</span>
      </div>

      <div className="overflow-x-auto rounded-[14px] border-2 border-[var(--ink)]">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="bg-[var(--surface-3)]">
              <th className="p-2.5 text-left text-[11px] font-extrabold uppercase tracking-wider">What you get</th>
              <th className="w-[92px] p-2.5 text-[11px] font-extrabold uppercase tracking-wider">Free</th>
              <th className="w-[92px] p-2.5 text-[11px] font-extrabold uppercase tracking-wider">Learn</th>
              <th className="w-[104px] border-x-2 border-[var(--blue)] bg-[#dceaf6] p-2.5 text-[11px] font-extrabold uppercase tracking-wider">Bundle</th>
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((r) => (
              <tr key={r.feature} className="border-t border-[var(--border-soft)]">
                <td className="p-2.5 font-semibold">{r.feature}</td>
                <td className="p-2.5 text-center"><Cell v={r.free} /></td>
                <td className="p-2.5 text-center"><Cell v={r.learn} /></td>
                <td className="border-x-2 border-[var(--blue)] bg-[#f2f7fc] p-2.5 text-center"><Cell v={r.bundle} /></td>
              </tr>
            ))}
            <tr className="border-t border-[var(--border-soft)] bg-[var(--surface-2)]">
              <td className="p-3" />
              <td className="p-3 text-center align-top">
                <div className="font-display text-lg font-extrabold tracking-tight">₹0</div>
                <p className="mt-1 text-[11px] font-semibold text-[var(--text-faint)]">You are here</p>
              </td>
              <td className="p-3 text-center align-top">
                <div className="font-display text-lg font-extrabold tracking-tight">{inr(META_ADS_PRICING.learn)}</div>
                <div className="mt-1.5"><CheckoutButton product="learn" label="Buy" variant="secondary" size="sm" className="w-full justify-center" /></div>
              </td>
              <td className="border-x-2 border-b-2 border-[var(--blue)] bg-[#e8f1f9] p-3 text-center align-top">
                <div className="text-[11px] font-semibold text-[var(--text-faint)] line-through">{inr(SEPARATE_TOTAL)}</div>
                <div className="font-display text-lg font-extrabold tracking-tight">{inr(META_ADS_PRICING.bundle)}</div>
                <div className="mt-1.5"><CheckoutButton product="bundle" label="Get bundle" size="sm" className="w-full justify-center" /></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-center text-xs text-[var(--text-faint)]">
        <Lock size={11} className="mb-0.5 mr-1 inline" />
        Run can be added on its own for {inr(META_ADS_PRICING.run)} once you own Learn.
      </p>
      <TrustRow />
    </div>
  );
}
