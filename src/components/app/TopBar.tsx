'use client';

import { useEffect, useState } from 'react';
import { Flame, Zap, Coins, Star } from 'lucide-react';
import { compactNumber } from '@/lib/utils';

interface ProfileHeader {
  displayName: string;
  level: number;
  title: string;
  xp: number;
  coins: number;
  currentStreak: number;
  levelProgress: number;
  streakAtRisk: boolean;
}

export function TopBar() {
  const [p, setP] = useState<ProfileHeader | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/progress')
      .then((r) => r.json())
      .then((d) => { if (alive) setP(d.profile); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] glass px-5">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <span className="md:hidden font-semibold text-[var(--text)]">GrowthSQL</span>
      </div>
      <div className="flex items-center gap-2">
        <Metric icon={<Flame size={15} />} value={p ? String(p.currentStreak) : '—'} label="day streak" tone={p?.streakAtRisk ? 'var(--warn)' : 'var(--warn)'} pulse={p?.streakAtRisk} />
        <Metric icon={<Coins size={15} />} value={p ? compactNumber(p.coins) : '—'} label="coins" tone="var(--warn)" />
        <Metric icon={<Zap size={15} />} value={p ? compactNumber(p.xp) : '—'} label="XP" tone="var(--accent-text)" />
        <div className="ml-1 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] py-1 pl-1 pr-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-text)]">
            <Star size={13} />
          </span>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">Lvl {p?.level ?? '—'}</div>
            <div className="text-[10px] text-[var(--text-subtle)]">{p?.title ?? ''}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Metric({ icon, value, label, tone, pulse }: { icon: React.ReactNode; value: string; label: string; tone: string; pulse?: boolean }) {
  return (
    <div className="hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 sm:flex" title={label}>
      <span style={{ color: tone }} className={pulse ? 'animate-pulse' : ''}>{icon}</span>
      <span className="text-[13px] font-semibold tabular-nums">{value}</span>
    </div>
  );
}
