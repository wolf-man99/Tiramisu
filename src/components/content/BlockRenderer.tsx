import { Lightbulb, AlertTriangle, TriangleAlert, Cpu, DollarSign, KeyRound, type LucideIcon } from 'lucide-react';
import type { Block, CalloutTone } from '@/lib/content/types';
import { cn } from '@/lib/utils';

/** Renders a single content Block from the curriculum/cheatsheet DSL. */
export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => <One key={i} b={b} />)}
    </div>
  );
}

function One({ b }: { b: Block }) {
  switch (b.kind) {
    case 'h':
      return <h3 className="pt-2 text-[15px] font-semibold tracking-tight text-[var(--text)]">{b.text}</h3>;
    case 'p':
      return <p className="text-[14.5px] leading-relaxed text-[var(--text-muted)]" dangerouslySetInnerHTML={{ __html: mdInline(b.text) }} />;
    case 'keyidea':
      return (
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4">
          <KeyRound size={16} className="mt-0.5 shrink-0 text-[var(--accent-text)]" />
          <p className="text-sm font-medium leading-relaxed text-[var(--text)]" dangerouslySetInnerHTML={{ __html: mdInline(b.text) }} />
        </div>
      );
    case 'list':
      return b.ordered ? (
        <ol className="ml-5 list-decimal space-y-1.5 text-[14.5px] text-[var(--text-muted)] marker:text-[var(--text-faint)]">
          {b.items.map((it, i) => <li key={i} dangerouslySetInnerHTML={{ __html: mdInline(it) }} />)}
        </ol>
      ) : (
        <ul className="ml-1 space-y-1.5 text-[14.5px] text-[var(--text-muted)]">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
              <span dangerouslySetInnerHTML={{ __html: mdInline(it) }} />
            </li>
          ))}
        </ul>
      );
    case 'callout':
      return <Callout tone={b.tone} title={b.title} text={b.text} />;
    case 'sql':
      return <CodeBlock code={b.code} caption={b.caption} />;
    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                {b.headers.map((h, i) => <th key={i} className="px-3 py-2 text-left font-semibold text-[var(--text-muted)]">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r} className="border-b border-[var(--border)] last:border-0">
                  {row.map((cell, c) => <td key={c} className="px-3 py-2 text-[var(--text-muted)]" dangerouslySetInnerHTML={{ __html: mdInline(cell) }} />)}
                </tr>
              ))}
            </tbody>
          </table>
          {b.caption && <p className="border-t border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-subtle)]">{b.caption}</p>}
        </div>
      );
    case 'compare':
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--danger-soft)] bg-[var(--danger-soft)]/30 p-1">
            <div className="px-3 py-1.5 text-xs font-semibold text-[var(--danger)]">{b.left.title}</div>
            <CodeBlock code={b.left.code} bare />
          </div>
          <div className="rounded-xl border border-[var(--success-soft)] bg-[var(--success-soft)]/30 p-1">
            <div className="px-3 py-1.5 text-xs font-semibold text-[var(--success)]">{b.right.title}</div>
            <CodeBlock code={b.right.code} bare />
          </div>
          <p className="md:col-span-2 text-sm text-[var(--text-muted)]">{b.verdict}</p>
        </div>
      );
    default:
      return null;
  }
}

const TONE: Record<CalloutTone, { icon: LucideIcon; color: string }> = {
  info: { icon: Lightbulb, color: 'var(--info)' },
  warn: { icon: AlertTriangle, color: 'var(--warn)' },
  trap: { icon: TriangleAlert, color: 'var(--danger)' },
  engine: { icon: Cpu, color: 'var(--accent-text)' },
  money: { icon: DollarSign, color: 'var(--success)' },
  key: { icon: KeyRound, color: 'var(--accent-text)' },
};

function Callout({ tone, title, text }: { tone: CalloutTone; title: string; text: string }) {
  const { icon: Icon, color } = TONE[tone] ?? TONE.info;
  return (
    <div className="flex items-start gap-3 rounded-xl border p-4" style={{ borderColor: `${color}33`, background: `${color}0d` }}>
      <Icon size={16} className="mt-0.5 shrink-0" style={{ color }} />
      <div>
        <div className="text-[13.5px] font-semibold" style={{ color }}>{title}</div>
        <p className="mt-0.5 text-[14px] leading-relaxed text-[var(--text-muted)]" dangerouslySetInnerHTML={{ __html: mdInline(text) }} />
      </div>
    </div>
  );
}

export function CodeBlock({ code, caption, bare }: { code: string; caption?: string; bare?: boolean }) {
  return (
    <figure className={cn(!bare && 'overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]')}>
      <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-relaxed"><code className="mono text-[var(--text)]">{code}</code></pre>
      {caption && <figcaption className="border-t border-[var(--border)] px-4 py-1.5 text-xs text-[var(--text-subtle)]">{caption}</figcaption>}
    </figure>
  );
}

/** Minimal inline markdown: `code`, **bold**, *italic*. Content is trusted (authored in-repo). */
function mdInline(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="mono rounded bg-[var(--surface-3)] px-1 py-0.5 text-[0.85em] text-[var(--accent-text)]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-[var(--text)]">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
