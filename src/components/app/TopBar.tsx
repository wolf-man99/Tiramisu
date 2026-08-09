'use client';

import { useEffect, useState } from 'react';
import { Flame, Zap, Coins } from 'lucide-react';
import { compactNumber } from '@/lib/utils';
import { UserMenu } from './UserMenu';
import { ShareButton } from './ShareButton';

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
        <Metric icon={<Flame size={15} />} value={p ? String(p.currentStreak) : '—'} label="day streak" tone="var(--warn)" pulse={p?.streakAtRisk} />
        <Metric icon={<Coins size={15} />} value={p ? compactNumber(p.coins) : '—'} label="coins" tone="var(--warn)" />
        <Metric icon={<Zap size={15} />} value={p ? compactNumber(p.xp) : '—'} label="XP" tone="var(--accent-text)" />
        <span className="hidden items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--accent-text)] sm:flex" title={p?.title ?? ''}>
          Lvl {p?.level ?? '—'}
        </span>
        <ShareButton />
        <UserMenu />
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
