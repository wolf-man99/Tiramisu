import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class names, resolving Tailwind conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Compact number formatting: 12400 → "12.4k". */
export function compactNumber(n: number): string {
  if (Math.abs(n) < 1000) return String(n);
  const units = ['k', 'M', 'B'];
  let u = -1;
  let v = n;
  while (Math.abs(v) >= 1000 && u < units.length - 1) { v /= 1000; u++; }
  return `${v.toFixed(v < 10 && v % 1 !== 0 ? 1 : 0)}${units[u]}`;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export const DIFFICULTY_COLOR: Record<string, string> = {
  easy: 'var(--easy)',
  medium: 'var(--medium)',
  hard: 'var(--hard)',
  expert: 'var(--expert)',
};
