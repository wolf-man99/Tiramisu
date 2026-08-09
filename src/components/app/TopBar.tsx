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
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b-2 border-[var(--ink)] bg-[var(--cream)] px-5">
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <span className="font-display text-[17px] font-extrabold text-[var(--text)] md:hidden">Tiramisu</span>
      </div>
      <div className="flex items-center gap-2">
        <Metric icon={<Flame size={15} />} value={p ? String(p.currentStreak) : '—'} label="day streak" tone="var(--red)" pulse={p?.streakAtRisk} />
        <Metric icon={<Coins size={15} />} value={p ? compactNumber(p.coins) : '—'} label="coins" tone="var(--amber)" />
        <Metric icon={<Zap size={15} />} value={p ? compactNumber(p.xp) : '—'} label="XP" tone="var(--blue)" />
        <span className="hidden items-center rounded-full border-2 border-[var(--ink)] bg-[var(--purple)] px-2.5 py-1 text-[12px] font-bold text-white sm:flex" title={p?.title ?? ''}>
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
    <div className="hidden items-center gap-1.5 rounded-full border-2 border-[var(--ink)] bg-white px-3 py-1 sm:flex" title={label}>
      <span style={{ color: tone }} className={pulse ? 'animate-pulse' : ''}>{icon}</span>
      <span className="text-[13px] font-bold tabular-nums">{value}</span>
    </div>
  );
}
