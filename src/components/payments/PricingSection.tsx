import { Check, PartyPopper } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { CheckoutButton } from '@/components/payments/CheckoutButton';
import { META_ADS_PRICING, type Product } from '@/lib/payments/pricing';
import { cn } from '@/lib/utils';

/**
 * Which cards to show depends on what's already owned — Run is never a first
 * purchase (it's an upgrade once Learn is owned) and Bundle stops making sense once
 * Learn is already bought on its own (it'd just re-pay for Learn). See
 * isProductPurchasable in lib/payments/pricing.ts, which the create-order route
 * enforces server-side — this component only decides what to *show*.
 */
export function PricingSection({ hasLearn, hasRun }: { hasLearn: boolean; hasRun: boolean }) {
  if (hasLearn && hasRun) {
    return (
      <div id="pricing" className="mt-8 scroll-mt-20">
        <Card className="flex items-center gap-3 border-[var(--green)] bg-[color-mix(in_srgb,var(--green)_10%,white)] p-4">
          <PartyPopper size={20} className="shrink-0 text-[var(--green)]" />
          <div>
            <div className="font-extrabold">You have full access</div>
            <div className="text-sm text-[var(--text-muted)]">Learn and Run are both unlocked — nothing left to buy.</div>
          </div>
        </Card>
      </div>
    );
  }

  const savings = META_ADS_PRICING.learn + META_ADS_PRICING.run - META_ADS_PRICING.bundle;

  return (
    <div id="pricing" className="mt-8 scroll-mt-20">
      <div className="mb-3 flex items-center gap-2">
        <span className="chip bg-[var(--ink)] text-white">Pricing</span>
        <span className="text-xs text-[var(--text-faint)]">The first 2 modules are free — pay to unlock the rest.</span>
      </div>
      <div className={cn('grid gap-3', hasLearn ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
        {!hasLearn && (
          <PriceCard
            title="Learn" price={META_ADS_PRICING.learn} product="learn"
            blurb="All 7 modules, 23 lessons, unlimited XP."
          />
        )}
        <PriceCard
          title="Run" price={META_ADS_PRICING.run} product="run"
          owned={hasRun}
          locked={!hasLearn}
          blurb={hasLearn ? 'The hands-on account simulator.' : 'The hands-on account simulator — unlocks once you own Learn.'}
        />
        {!hasLearn && (
          <PriceCard
            title="Bundle" price={META_ADS_PRICING.bundle} product="bundle"
            blurb={`Learn + Run together — ₹${savings} less than buying separately.`}
            highlight
          />
        )}
        {hasLearn && (
          <Card className="flex items-center gap-2 p-4 text-sm text-[var(--text-muted)]">
            <Check size={14} className="shrink-0 text-[var(--green)]" /> Learn — purchased
          </Card>
        )}
      </div>
    </div>
  );
}

function PriceCard({
  title, price, blurb, owned, locked, product, highlight,
}: { title: string; price: number; blurb: string; owned?: boolean; locked?: boolean; product: Product; highlight?: boolean }) {
  return (
    <Card className={cn('p-4', highlight && 'border-[var(--blue)] shadow-[3px_3px_0_var(--blue)]')}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-extrabold">{title}</h3>
        {highlight && <span className="chip bg-[var(--blue)] text-white">Best value</span>}
      </div>
      <div className="mt-1 font-display text-2xl font-extrabold tabular-nums">₹{price.toLocaleString('en-IN')}</div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{blurb}</p>
      <div className="mt-3">
        {owned ? (
          <span className="chip bg-[var(--green)] text-white"><Check size={12} /> Purchased</span>
        ) : locked ? (
          <span className="chip">Buy Learn first</span>
        ) : (
          <CheckoutButton product={product} label={`Buy ${title}`} size="sm" className="w-full justify-center" />
        )}
      </div>
    </Card>
  );
}
