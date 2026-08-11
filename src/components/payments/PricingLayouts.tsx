'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { CheckoutButton } from '@/components/payments/CheckoutButton';
import { META_ADS_PRICING, type Product } from '@/lib/payments/pricing';
import { cn } from '@/lib/utils';

/**
 * The two pricing layouts, chosen by viewport in PricingSection: cards on
 * desktop, selectable rows on mobile.
 *
 * They are not A/B variants. Each is the better shape for its width. Three
 * columns need room to breathe, and stacking them on a phone buries the bundle
 * below the fold, so small screens get one scannable list with a single call to
 * action instead. Both read the same entitlement props and defer the actual
 * purchase to CheckoutButton, so the two stay in step by construction.
 */

const SEPARATE_TOTAL = META_ADS_PRICING.learn + META_ADS_PRICING.run;
export const BUNDLE_SAVINGS = SEPARATE_TOTAL - META_ADS_PRICING.bundle;
export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export interface LayoutProps {
  hasLearn: boolean;
  hasRun: boolean;
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

/* ─── Desktop: anchored bundle cards ───────────────────────────────────── */

export function PricingCards({ hasLearn, hasRun }: LayoutProps) {
  return (
    <div className="grid grid-cols-3 gap-3 pt-3.5 items-start">
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
            You save {inr(BUNDLE_SAVINGS)}
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
  );
}

/* ─── Mobile: selectable rows, one call to action ──────────────────────── */

export function PricingRows({ hasLearn, hasRun }: LayoutProps) {
  const canBundle = !hasLearn;
  const [selected, setSelected] = useState<Product>(canBundle ? 'bundle' : 'run');
  const canRun = hasLearn && !hasRun;

  return (
    <div className="pt-1">
      <div className="grid gap-2.5">
        {canBundle && (
          <Row
            selected={selected === 'bundle'} onSelect={() => setSelected('bundle')}
            name="Bundle" desc="All 23 lessons plus the hands-on Run simulator."
            price={META_ADS_PRICING.bundle} anchor={SEPARATE_TOTAL}
            pills={<>
              <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--blue)] px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-white">Best value</span>
              <span className="rounded-full border-2 border-[var(--ink)] bg-[var(--green)] px-2 py-0.5 text-[9.5px] font-extrabold tracking-wide text-white">Save {inr(BUNDLE_SAVINGS)}</span>
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
        {/* Remounted per selection so the button never carries a stale product. */}
        <CheckoutButton
          key={selected}
          product={selected}
          label={`Continue to payment · ${inr(META_ADS_PRICING[selected])}`}
          size="lg"
          className="w-full justify-center"
        />
      </div>
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
        <span className="flex flex-wrap items-center gap-1.5 text-[14.5px] font-extrabold">{name}{pills}</span>
        <span className="mt-0.5 block text-xs leading-snug text-[var(--text-muted)]">{desc}</span>
      </span>
      <span className="shrink-0 text-right">
        {anchor && <span className="block text-[11.5px] font-semibold text-[var(--text-faint)] line-through">{inr(anchor)}</span>}
        <span className="block font-display text-xl font-extrabold leading-tight tracking-tight">{inr(price)}</span>
      </span>
    </button>
  );
}
