'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shuffle, Search } from 'lucide-react';
import { Button } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

interface Item { id: string; title: string; difficulty: string; day: number; concepts: string[] }

/** Difficulty/search filter bar plus a random-exercise launcher. */
export function PracticeFilters({ items }: { items: Item[] }) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<string>('all');
  const [q, setQ] = useState('');

  const pool = useMemo(
    () => items.filter((i) => (difficulty === 'all' || i.difficulty === difficulty) && (!q || i.title.toLowerCase().includes(q.toLowerCase()) || i.concepts.some((c) => c.includes(q.toLowerCase())))),
    [items, difficulty, q],
  );

  const random = () => {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) router.push(`/practice/${pick.id}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
        {['all', 'easy', 'medium', 'hard', 'expert'].map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={cn('rounded-md px-3 py-1 text-[13px] font-medium capitalize transition-colors', difficulty === d ? 'bg-[var(--surface-3)] text-[var(--text)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)]')}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="relative flex-1 min-w-48">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search exercises or concepts…"
          className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent-border)]"
        />
      </div>
      <Button variant="secondary" size="md" onClick={random}><Shuffle size={15} /> Random ({pool.length})</Button>
    </div>
  );
}
