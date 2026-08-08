'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { GlossaryTerm } from '@/lib/content/types';
import { cn } from '@/lib/utils';

const CAT_COLOR: Record<string, string> = { SQL: 'var(--accent-text)', BigQuery: 'var(--info)', Marketing: 'var(--success)' };

/** Searchable glossary with a category filter. */
export function GlossaryView({ terms }: { terms: GlossaryTerm[] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');

  const filtered = useMemo(
    () => terms.filter((t) => (cat === 'all' || t.category === cat) && (!q || t.term.toLowerCase().includes(q.toLowerCase()) || t.short.toLowerCase().includes(q.toLowerCase()))),
    [terms, q, cat],
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-56">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms…" className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent-border)]" />
        </div>
        <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
          {['all', 'SQL', 'BigQuery', 'Marketing'].map((c) => (
            <button key={c} onClick={() => setCat(c)} className={cn('rounded-md px-3 py-1 text-[13px] font-medium transition-colors', cat === c ? 'bg-[var(--surface-3)] text-[var(--text)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)]')}>{c}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((t) => (
          <div key={t.term} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{t.term}</h3>
              <span className="chip py-0 text-[10px]" style={{ color: CAT_COLOR[t.category], borderColor: `${CAT_COLOR[t.category]}44` }}>{t.category}</span>
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{t.short}</p>
            {t.formula && <div className="mt-2 rounded-lg bg-[var(--bg-subtle)] px-3 py-1.5 text-xs mono text-[var(--accent-text)]">{t.formula}</div>}
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-subtle)]">{t.long}</p>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="py-12 text-center text-sm text-[var(--text-subtle)]">No terms match “{q}”.</p>}
    </div>
  );
}
