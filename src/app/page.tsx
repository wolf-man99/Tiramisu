import Link from 'next/link';
import {
  Flame, Zap, Target, TrendingUp, BarChart3, Award, ArrowRight,
  Lightbulb, CircleCheck, Trophy,
} from 'lucide-react';
import { dashboardSummary } from '@/lib/progress/summary';
import { challengeForDate } from '@/lib/content/exercises';
import { DAYS } from '@/lib/content/curriculum';
import { Card, Ring, Progress, Stat, DifficultyPill, SectionTitle, Chip } from '@/components/ui/primitives';
import { compactNumber, formatMs, cn } from '@/lib/utils';
import { ActivityChart } from '@/components/viz/ActivityChart';
import { LeaderboardPeek } from '@/components/app/LeaderboardPeek';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const s = await dashboardSummary();
  const today = new Date().toISOString().slice(0, 10);
  const challenge = challengeForDate(today);
  const p = s.profile;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      {/* Hero */}
      <div className="animate-fade-up mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-[var(--text-muted)]">Welcome back, {p.displayName}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            You&apos;re on <span className="gradient-text">Day {s.stats.currentDay}</span> of 14
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--text-muted)]">
            {DAYS.find((d) => d.day === s.stats.currentDay)?.title ?? 'Keep going.'} — {p.title} · Level {p.level}
          </p>
        </div>
        <Card className="flex items-center gap-5 p-5 glow-accent">
          <Ring value={p.levelProgress} size={84} stroke={7}>
            <div className="text-center">
              <div className="text-xl font-bold leading-none">{p.level}</div>
              <div className="text-[10px] text-[var(--text-subtle)]">level</div>
            </div>
          </Ring>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Zap size={15} className="text-[var(--accent-text)]" />
              <span className="font-semibold tabular-nums">{compactNumber(p.xp)} XP</span>
            </div>
            <div className="text-xs text-[var(--text-muted)]">{compactNumber(p.xpForNext)} XP to level {p.level + 1}</div>
            <div className="flex items-center gap-2 text-sm">
              <Flame size={15} className={p.streakAtRisk ? 'text-[var(--warn)] animate-pulse' : 'text-[var(--warn)]'} />
              <span className="font-semibold">{p.currentStreak}-day streak</span>
              {p.streakAtRisk && <span className="text-[11px] text-[var(--warn)]">practice today!</span>}
            </div>
          </div>
        </Card>
      </div>

      {/* Stat tiles */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Exercises" value={`${s.stats.completedExercises}`} hint={`of ${s.stats.totalExercises} solved`} accent="var(--success)" />
        <Stat label="SQL accuracy" value={`${s.stats.accuracy}%`} hint={`avg ${formatMs(s.stats.avgMs)} / query`} accent="var(--accent-text)" />
        <Stat label="Projects" value={`${s.stats.projectsCompleted}/${s.stats.totalProjects}`} hint="shipped" accent="var(--info)" />
        <Stat label="Badges" value={`${s.stats.badgesEarned}/${s.stats.totalBadges}`} hint="earned" accent="var(--warn)" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: roadmap + today */}
        <div className="space-y-6 lg:col-span-2">
          {/* Today's challenge */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Target size={16} className="text-[var(--accent-text)]" /> Today&apos;s Challenge
              </div>
              <DifficultyPill difficulty={challenge.difficulty} />
            </div>
            <div className="p-5">
              <h3 className="font-medium">{challenge.title}</h3>
              <p className="mt-1.5 line-clamp-2 text-sm text-[var(--text-muted)]">{challenge.prompt}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {challenge.concepts.slice(0, 3).map((c) => <Chip key={c}>{c.replace(/-/g, ' ')}</Chip>)}
                </div>
                <Link href={`/practice/${challenge.id}?daily=1`} className="flex items-center gap-1 text-sm font-medium text-[var(--accent-text)] hover:underline">
                  Solve it <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </Card>

          {/* Roadmap */}
          <div>
            <SectionTitle sub="Fourteen days, twelve modules, one query at a time.">Learning roadmap</SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              {DAYS.map((d) => {
                const done = s.stats.completedDays.includes(d.day);
                const current = d.day === s.stats.currentDay;
                const locked = d.day > s.stats.currentDay;
                return (
                  <Link
                    key={d.day}
                    href={locked ? '#' : `/learn/${d.day}`}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl border p-3 transition-all',
                      done && 'border-[var(--border)] bg-[var(--surface)]',
                      current && 'border-[var(--accent-border)] bg-[var(--accent-soft)]',
                      locked && 'border-dashed border-[var(--border)] opacity-55',
                      !locked && 'hover:border-[var(--border-strong)]',
                    )}
                    aria-disabled={locked}
                  >
                    <span className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold',
                      done ? 'bg-[var(--success-soft)] text-[var(--success)]' : current ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-3)] text-[var(--text-subtle)]',
                    )}>
                      {done ? <CircleCheck size={16} /> : d.day}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{d.title}</div>
                      <div className="truncate text-xs text-[var(--text-subtle)]">{d.moduleTitle}</div>
                    </div>
                    {!locked && <ArrowRight size={15} className="shrink-0 text-[var(--text-faint)] transition-transform group-hover:translate-x-0.5" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          {/* Activity */}
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp size={16} className="text-[var(--success)]" /> Last 14 days
            </div>
            <ActivityChart data={s.activity} goal={p.dailyGoalXp} />
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Today: <span className="font-semibold text-[var(--text)]">{s.todayXp} XP</span></span>
              <span>Goal: {p.dailyGoalXp} XP</span>
            </div>
          </Card>

          {/* AI recommendations */}
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Lightbulb size={16} className="text-[var(--warn)]" /> Recommended for you
            </div>
            <div className="space-y-2">
              {s.recommendations.map((r) => (
                <Link key={r.exerciseId} href={`/practice/${r.exerciseId}`} className="block rounded-lg border border-[var(--border)] p-3 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{r.title}</span>
                    <DifficultyPill difficulty={r.difficulty} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-subtle)]">{r.reason}</p>
                </Link>
              ))}
            </div>
          </Card>

          {/* Weak areas */}
          {s.weakAreas.length > 0 && (
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <BarChart3 size={16} className="text-[var(--danger)]" /> Focus areas
              </div>
              <div className="space-y-2.5">
                {s.weakAreas.map((w) => (
                  <div key={w.concept}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="capitalize text-[var(--text-muted)]">{w.concept.replace(/-/g, ' ')}</span>
                      <span className="tabular-nums text-[var(--text-subtle)]">{Math.round(w.mastery * 100)}%</span>
                    </div>
                    <Progress value={w.mastery} color={w.mastery < 0.4 ? 'var(--danger)' : 'var(--warn)'} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Leaderboard peek */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Trophy size={16} className="text-[var(--warn)]" /> Leaderboard
              </div>
              <Link href="/leaderboard" className="text-xs text-[var(--accent-text)] hover:underline">View all</Link>
            </div>
            <LeaderboardPeek />
          </Card>

          {/* Badges */}
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Award size={16} className="text-[var(--warn)]" /> Recent badges
            </div>
            <div className="flex flex-wrap gap-2">
              {s.badges.filter((b) => b.earned).slice(0, 8).map((b) => (
                <div key={b.id} title={b.name} className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] text-lg" style={{ boxShadow: `0 0 0 1px ${tierColor(b.tier)}22` }}>
                  <span style={{ filter: 'saturate(1.2)' }}>{tierEmoji(b.tier)}</span>
                </div>
              ))}
              {s.badges.filter((b) => b.earned).length === 0 && (
                <p className="text-xs text-[var(--text-subtle)]">Solve your first exercise to earn a badge.</p>
              )}
            </div>
            <Link href="/badges" className="mt-3 flex items-center gap-1 text-xs text-[var(--accent-text)] hover:underline">
              See all {s.stats.totalBadges} badges <ArrowRight size={12} />
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

function tierColor(tier: string): string {
  return { bronze: '#cd7f32', silver: '#c0c0c8', gold: '#f5c542', platinum: '#7dd3fc' }[tier] ?? '#888';
}
function tierEmoji(tier: string): string {
  return { bronze: '🥉', silver: '🥈', gold: '🥇', platinum: '💎' }[tier] ?? '🏅';
}
