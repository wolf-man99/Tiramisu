'use client';

import { useEffect, useState } from 'react';
import { compactNumber, cn } from '@/lib/utils';

interface Row { id: string; displayName: string; xp: number; rank: number; isYou: boolean; }

export function LeaderboardPeek() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch('/api/leaderboard').then((r) => r.json()).then((d) => {
      const you = d.you as Row;
      const top = (d.board as Row[]).slice(0, 4);
      const near = you && you.rank > 5 ? [you] : [];
      setRows([...top, ...near]);
    }).catch(() => setRows([]));
  }, []);

  if (!rows) return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-8 rounded-lg bg-[var(--surface-2)] shimmer" />)}</div>;

  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.id} className={cn('flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm', r.isYou && 'bg-[var(--accent-soft)]')}>
          <span className={cn('w-5 text-center text-xs font-bold tabular-nums', r.rank <= 3 ? 'text-[var(--warn)]' : 'text-[var(--text-subtle)]')}>{r.rank}</span>
          <span className={cn('flex-1 truncate', r.isYou ? 'font-semibold text-[var(--accent-text)]' : 'text-[var(--text-muted)]')}>
            {r.isYou ? 'You' : r.displayName}
          </span>
          <span className="tabular-nums text-xs text-[var(--text-subtle)]">{compactNumber(r.xp)}</span>
        </div>
      ))}
    </div>
  );
}
