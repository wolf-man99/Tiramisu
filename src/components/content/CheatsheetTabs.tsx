'use client';

import { useState } from 'react';
import type { Cheatsheet } from '@/lib/content/types';
import { RunnableSnippet } from './RunnableSnippet';
import { Chip } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

/** Tabbed cheatsheet browser — one sheet visible at a time, each idiom runnable. */
export function CheatsheetTabs({ sheets }: { sheets: Cheatsheet[] }) {
  const [active, setActive] = useState(0);
  const sheet = sheets[active];

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-[var(--border)] pb-2">
        {sheets.map((s, i) => (
          <button
            key={s.slug}
            onClick={() => setActive(i)}
            className={cn('rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors', i === active ? 'bg-[var(--accent-soft)] text-[var(--accent-text)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]')}
          >
            {s.title}
          </button>
        ))}
      </div>

      <p className="mb-6 text-sm text-[var(--text-muted)]">{sheet.subtitle}</p>

      <div className="space-y-8">
        {sheet.groups.map((g) => (
          <div key={g.name}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">{g.name}</h2>
            <div className="space-y-4">
              {g.entries.map((e) => (
                <div key={e.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold mono text-[var(--accent-text)]">{e.name}</h3>
                    {e.concepts.slice(0, 2).map((c) => <Chip key={c} className="py-0 text-[10px]">{c.replace(/-/g, ' ')}</Chip>)}
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">{e.description}</p>
                  <div className="mt-1 text-xs text-[var(--text-subtle)]"><span className="text-[var(--text-faint)]">syntax:</span> <code className="mono">{e.syntax}</code></div>
                  <p className="mt-2 mb-2 text-xs italic text-[var(--text-subtle)]">↳ {e.useCase}</p>
                  <RunnableSnippet code={e.example} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
