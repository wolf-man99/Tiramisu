import { Check } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { CheckoutButton } from '@/components/payments/CheckoutButton';
import { META_ADS_PRICING, type Product } from '@/lib/payments/pricing';
import { cn } from '@/lib/utils';

export function PricingSection({ hasLearn, hasRun }: { hasLearn: boolean; hasRun: boolean }) {
  return (
    <div id="pricing" className="mt-8 scroll-mt-20">
      <div className="mb-3 flex items-center gap-2">
        <span className="chip bg-[var(--ink)] text-white">Pricing</span>
        <span className="text-xs text-[var(--text-faint)]">The first 2 modules are free — pay to unlock the rest.</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <PriceCard
          title="Learn" price={META_ADS_PRICING.learn} product="learn" owned={hasLearn}
          blurb="All 7 modules, 23 lessons, unlimited XP."
        />
        <PriceCard
          title="Run" price={META_ADS_PRICING.run} product="run" owned={hasRun}
          blurb="The hands-on account simulator, once Learn is finished."
        />
        <PriceCard
          title="Bundle" price={META_ADS_PRICING.bundle} product="bundle" owned={hasLearn && hasRun}
          blurb={`Learn + Run together — ₹${(META_ADS_PRICING.learn + META_ADS_PRICING.run - META_ADS_PRICING.bundle)} less than buying separately.`}
          highlight
        />
      </div>
    </div>
  );
}

function PriceCard({
  title, price, blurb, owned, product, highlight,
}: { title: string; price: number; blurb: string; owned: boolean; product: Product; highlight?: boolean }) {
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
        ) : (
          <CheckoutButton product={product} label={`Buy ${title}`} size="sm" className="w-full justify-center" />
        )}
      </div>
    </Card>
  );
}
