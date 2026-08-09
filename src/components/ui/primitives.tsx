import * as React from 'react';
import { cn, DIFFICULTY_COLOR } from '@/lib/utils';

/* ─── Button ──────────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

/*
  Buttons are ink-bordered blocks that sit on a coloured hard shadow and press
  into the page on click — the signature interaction of this design system.
*/
const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--ink)] text-white shadow-[3px_3px_0_var(--blue)]',
  secondary: 'bg-white text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]',
  ghost: 'border-transparent shadow-none text-[var(--text-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-3)]',
  danger: 'bg-[var(--red)] text-white shadow-[3px_3px_0_var(--ink)]',
  success: 'bg-[var(--teal)] text-white shadow-[3px_3px_0_var(--ink)]',
};
const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-[15px] gap-2',
  icon: 'h-10 w-10 justify-center',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-[10px] border-2 border-[var(--ink)] font-bold transition-all focus-ring select-none',
        'hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        'disabled:opacity-40 disabled:pointer-events-none',
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

/* ─── Card ────────────────────────────────────────────────────────────────── */

export function Card({ className, hover, ...props }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return <div className={cn('card', hover && 'card-hover', className)} {...props} />;
}

/* ─── Chip / Badge ────────────────────────────────────────────────────────── */

export function Chip({ className, style, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('chip', className)} style={style} {...props} />;
}

export function DifficultyPill({ difficulty, className }: { difficulty: string; className?: string }) {
  const color = DIFFICULTY_COLOR[difficulty] ?? 'var(--text-muted)';
  return (
    <span
      className={cn('chip capitalize', className)}
      style={{ color, borderColor: `${color}44`, background: `${color}14` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {difficulty}
    </span>
  );
}

/* ─── Progress ────────────────────────────────────────────────────────────── */

export function Progress({ value, className, barClassName, color }: { value: number; className?: string; barClassName?: string; color?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className={cn('h-3 w-full overflow-hidden rounded-full border-2 border-[var(--ink)] bg-white', className)}>
      <div
        className={cn('h-full transition-[width] duration-500', barClassName)}
        style={{ width: `${pct}%`, background: color ?? 'var(--blue)' }}
      />
    </div>
  );
}

/* ─── Ring (radial progress) ──────────────────────────────────────────────── */

export function Ring({ value, size = 72, stroke = 6, children, color = 'var(--accent)' }: { value: number; size?: number; stroke?: number; children?: React.ReactNode; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r + stroke / 2} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.2,.7,.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* ─── Section heading ─────────────────────────────────────────────────────── */

export function SectionTitle({ children, sub, className }: { children: React.ReactNode; sub?: string; className?: string }) {
  return (
    <div className={cn('mb-4', className)}>
      <h2 className="text-xl font-extrabold tracking-tight">{children}</h2>
      {sub && <p className="mt-0.5 text-sm text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
}

/* ─── Stat tile ───────────────────────────────────────────────────────────── */

export function Stat({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-1.5 font-display text-3xl font-extrabold tabular-nums" style={accent ? { color: accent } : undefined}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-[var(--text-muted)]">{hint}</div>}
    </Card>
  );
}

/* ─── Empty state ─────────────────────────────────────────────────────────── */

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-[var(--ink)] bg-[var(--surface-2)] py-12 text-center">
      <p className="text-sm font-bold text-[var(--text-muted)]">{title}</p>
      {hint && <p className="mt-1 text-xs text-[var(--text-subtle)]">{hint}</p>}
    </div>
  );
}
