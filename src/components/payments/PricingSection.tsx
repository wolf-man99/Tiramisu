import { PartyPopper, ShieldCheck, Zap, Infinity as InfinityIcon } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { PricingCards, PricingRows } from '@/components/payments/PricingLayouts';

/**
 * The pricing block, used both inside the course-card dialog and inline on the
 * course page itself, so the two can never quote different prices.
 *
 * Layout switches on viewport rather than being one grid that reflows: cards at
 * md and up, selectable rows below. See PricingLayouts for why. The switch is
 * pure CSS with both trees rendered, which costs a little duplicate DOM but
 * avoids the flash a JS media query would cause on a paywall.
 *
 * Which offers appear depends on what is already owned. Run is never a first
 * purchase (it is an upgrade once Learn is owned) and Bundle stops making sense
 * after Learn is bought alone, since it would re-charge for Learn. See
 * isProductPurchasable in lib/payments/pricing.ts, which the create-order route
 * enforces server-side. This component only decides what to show.
 */
export function PricingSection({ hasLearn, hasRun }: { hasLearn: boolean; hasRun: boolean }) {
  if (hasLearn && hasRun) {
    return (
      <div id="pricing" className="mt-8 scroll-mt-20">
        <Card className="flex items-center gap-3 border-[var(--green)] bg-[color-mix(in_srgb,var(--green)_10%,white)] p-4">
          <PartyPopper size={20} className="shrink-0 text-[var(--green)]" />
          <div>
            <div className="font-extrabold">You have full access</div>
            <div className="text-sm text-[var(--text-muted)]">Learn and Run are both unlocked. Nothing left to buy.</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div id="pricing" className="mt-8 scroll-mt-20">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="chip bg-[var(--ink)] text-white">Pricing</span>
        <span className="text-xs text-[var(--text-faint)]">First 2 modules are free. Pay once to unlock the rest, forever.</span>
      </div>

      <div className="hidden md:block"><PricingCards hasLearn={hasLearn} hasRun={hasRun} /></div>
      <div className="md:hidden"><PricingRows hasLearn={hasLearn} hasRun={hasRun} /></div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-[var(--text-subtle)]">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Secure payment via Razorpay</span>
        <span className="inline-flex items-center gap-1.5"><Zap size={13} /> Instant access</span>
        <span className="inline-flex items-center gap-1.5"><InfinityIcon size={13} /> Lifetime, no subscription</span>
      </div>
    </div>
  );
}
