import posthog from '@/lib/posthog/client';

/**
 * Client-side conversion events for the checkout funnel.
 *
 * Each event goes to two places: PostHog for product analytics, and the GTM
 * dataLayer so Meta Pixel / Google Ads conversions can be configured in Tag
 * Manager without shipping more code. Both are best-effort. Analytics must
 * never be able to break a purchase, so every call is swallowed on failure and
 * a missing PostHog key is a silent no-op rather than an error.
 *
 * The dialog also puts `?pricing=<courseId>` in the URL while it is open, so
 * URL-triggered conversion setups work alongside these events.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type CheckoutEvent =
  | 'pricing_viewed'
  | 'checkout_started'
  | 'checkout_dismissed'
  | 'purchase_completed'
  | 'purchase_failed';

export function track(event: CheckoutEvent, properties: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;

  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    try {
      posthog.capture(event, properties);
    } catch {
      // ignored: analytics is never allowed to interrupt checkout
    }
  }

  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event, ...properties });
  } catch {
    // ignored: same reason
  }
}
