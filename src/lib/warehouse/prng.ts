/**
 * Deterministic pseudo-random number generation.
 *
 * The entire warehouse comes out of one mulberry32 stream seeded with a constant, so
 * every install produces byte-identical data and reference solutions stay valid
 * forever. See docs/ARCHITECTURE.md §7. The order of draws is load-bearing.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private r: () => number;

  constructor(seed: number) {
    this.r = mulberry32(seed);
  }

  /** Uniform float in [0, 1). */
  next(): number {
    return this.r();
  }

  /** Uniform float in [min, max). */
  float(min: number, max: number): number {
    return min + this.r() * (max - min);
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.r() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.r() * items.length)];
  }

  /** Weighted pick. `weights` need not sum to 1. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let x = this.r() * total;
    for (let i = 0; i < items.length; i++) {
      x -= weights[i];
      if (x <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /** Box–Muller normal, clamped to ±4σ so we never emit absurd outliers. */
  normal(mean: number, sd: number): number {
    const u = Math.max(this.r(), 1e-9);
    const v = this.r();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + sd * Math.max(-4, Math.min(4, z));
  }

  /** Log-normal: the right shape for order values, session durations and LTV. */
  logNormal(mu: number, sigma: number): number {
    return Math.exp(this.normal(mu, sigma));
  }

  /** Knuth's Poisson sampler; fine for the small λ we use. */
  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    if (lambda > 30) return Math.max(0, Math.round(this.normal(lambda, Math.sqrt(lambda))));
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.r();
    } while (p > L);
    return k - 1;
  }

  /** Fisher–Yates, in place. */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.r() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;
export const round4 = (n: number): number => Math.round(n * 10000) / 10000;
