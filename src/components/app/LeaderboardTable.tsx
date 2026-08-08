'use client';

import { useEffect, useState } from 'react';
import { Crown, Flame } from 'lucide-react';
import { compactNumber, cn } from '@/lib/utils';

interface Row { id: string; displayName: string; country: string; xp: number; level: number; title: string; streak: number; rank: number; isYou: boolean }

export function LeaderboardTable() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => { fetch('/api/leaderboard').then((r) => r.json()).then((d) => setRows(d.board)).catch(() => setRows([])); }, []);

  if (!rows) return <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-[var(--surface)] shimmer" />)}</div>;

  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div
          key={r.id}
          className={cn('flex items-center gap-4 rounded-xl border p-3.5 transition-colors', r.isYou ? 'border-[var(--accent-border)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface)]')}
        >
          <div className="flex w-8 items-center justify-center">
            {r.rank <= 3 ? <Crown size={20} style={{ color: ['#f5c542', '#c0c0c8', '#cd7f32'][r.rank - 1] }} /> : <span className="text-sm font-bold tabular-nums text-[var(--text-subtle)]">{r.rank}</span>}
          </div>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-3)] text-sm font-bold text-[var(--accent-text)]">
            {(r.isYou ? 'You' : r.displayName).charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn('truncate text-sm font-medium', r.isYou && 'text-[var(--accent-text)]')}>{r.isYou ? 'You' : r.displayName} {r.country && <span className="text-xs text-[var(--text-faint)]">· {r.country}</span>}</div>
            <div className="text-xs text-[var(--text-subtle)]">Lvl {r.level} · {r.title}</div>
          </div>
          {r.streak > 0 && <span className="hidden items-center gap-1 text-xs text-[var(--warn)] sm:flex"><Flame size={13} /> {r.streak}</span>}
          <span className="w-20 text-right text-sm font-semibold tabular-nums">{compactNumber(r.xp)} XP</span>
        </div>
      ))}
    </div>
  );
}
