/**
 * Meta Ads Mastery pricing. One course, three purchasable products — a shape the
 * single `Course.price` field in the registry can't hold, so it lives here instead.
 * The server is always the source of truth for amount: routes look prices up from
 * this table by `product`, never trust a client-supplied number.
 */

export type Product = 'learn' | 'run' | 'bundle';

/** Rupees, not paise — convert at the Razorpay API boundary (see toPaise). */
export const META_ADS_PRICING: Record<Product, number> = {
  learn: 499,
  run: 999,
  bundle: 1199,
};

/** Modules 1..FREE_MODULE_COUNT are playable without paying; the rest need `learn`
 *  or `bundle`. Matches MetaModule.index (1-based), from src/lib/content/meta-ads. */
export const FREE_MODULE_COUNT = 2;

export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function isProduct(value: unknown): value is Product {
  return value === 'learn' || value === 'run' || value === 'bundle';
}
