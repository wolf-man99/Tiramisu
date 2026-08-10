import Link from 'next/link';
import { ArrowLeft, Check, Lock, Play, Zap, Clock, Sparkles } from 'lucide-react';
import { META_MODULES, META_LESSONS, META_AVAILABLE_LESSONS, META_TOTAL_XP } from '@/lib/content/meta-ads';
import { prisma } from '@/lib/db';
import { requireProfileId } from '@/lib/auth/server';
import { ensureEnrollment } from '@/lib/progress/persist';
import { Card, Progress } from '@/components/ui/primitives';
import { CourseLogo } from '@/components/app/CourseLogo';
import { cn } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meta Ads Mastery — Tiramisu' };

export default async function MetaAdsHome() {
  const profileId = await requireProfileId('/courses/meta-ads');
  await ensureEnrollment(profileId, 'meta-ads');
  // Sequential, not Promise.all: Supabase's pooled connection (pgbouncer, transaction
  // mode) can route concurrent queries from one client to different backend
  // connections, which breaks Prisma's prepared-statement reuse and throws.
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: profileId } });
  const done = await prisma.attempt.findMany({ where: { profileId, courseId: 'meta-ads', itemType: 'lesson', passed: true }, select: { itemId: true } });
  const completed = new Set(done.map((d) => d.itemId));
  const isDone = (moduleSlug: string, slug: string) => completed.has(`${moduleSlug}/${slug}`);
  const completedCount = META_LESSONS.filter((l) => isDone(l.moduleSlug, l.slug)).length;

  const nextLesson = META_LESSONS.find((l) => !isDone(l.moduleSlug, l.slug));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-5 md:px-8">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowLeft size={15} /> Platform</Link>
          <span className="flex items-center gap-1.5 rounded-full border-2 border-[var(--ink)] bg-[var(--blue)] px-3 py-1 text-[13px] font-bold text-white"><Zap size={13} /> {profile.xp} XP · Lvl {profile.level}</span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
        {/* Hero */}
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--blue)]" style={{ background: 'color-mix(in srgb, var(--blue) 18%, white)' }}>
              <CourseLogo courseId="meta-ads" emoji="📘" size={64} />
            </span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Meta Ads Mastery</h1>
              <p className="mt-0.5 text-[var(--text-muted)]">Run Facebook &amp; Instagram ads that actually convert.</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-subtle)]">
                <span className="chip" style={{ background: 'var(--amber)' }}><Sparkles size={11} /> Full course · 7 modules</span>
                <span className="flex items-center gap-1 font-semibold"><Clock size={12} /> {META_AVAILABLE_LESSONS} lessons live</span>
                <span className="flex items-center gap-1 font-semibold"><Zap size={12} /> {META_TOTAL_XP} XP available</span>
              </div>
            </div>
          </div>
          {nextLesson && (
            <Link href={`/courses/meta-ads/${nextLesson.slug}`}>
              <span className="inline-flex items-center gap-2 rounded-[10px] border-2 border-[var(--ink)] bg-[var(--ink)] px-5 py-3 font-bold text-white shadow-[3px_3px_0_var(--blue)] transition-all hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
                <Play size={16} /> {completedCount === 0 ? 'Start course' : 'Continue'}
              </span>
            </Link>
          )}
        </div>

        {/* Progress */}
        <Card className="mt-6 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold">Your progress</span>
            <span className="font-bold tabular-nums text-[var(--text-muted)]">{completedCount} / {META_AVAILABLE_LESSONS} lessons</span>
          </div>
          <Progress value={META_AVAILABLE_LESSONS ? completedCount / META_AVAILABLE_LESSONS : 0} color="var(--blue)" />
        </Card>

        {/* Modules */}
        <div className="mt-8 space-y-4">
          {META_MODULES.map((m) => (
            <div key={m.slug}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">{m.emoji}</span>
                <h2 className="text-sm font-extrabold uppercase tracking-wide">Module {m.index}: {m.title}</h2>
                {m.status === 'coming-soon' && <span className="chip"><Lock size={10} /> Coming soon</span>}
                <span className="text-xs text-[var(--text-faint)]">{m.tagline}</span>
              </div>
              {m.status === 'available' ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {m.lessons.map((l) => {
                    const complete = isDone(l.moduleSlug, l.slug);
                    return (
                      <Link key={l.slug} href={`/courses/meta-ads/${l.slug}`}>
                        <Card hover className="flex items-center gap-3 p-3.5">
                          <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-[var(--ink)] text-xs font-bold', complete ? 'bg-[var(--green)] text-white' : 'bg-white text-[var(--ink)]')}>
                            {complete ? <Check size={16} /> : <Play size={13} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold">{l.title}</div>
                            <div className="truncate text-xs text-[var(--text-subtle)]">{l.subtitle}</div>
                          </div>
                          <span className="flex items-center gap-1 text-xs text-[var(--text-faint)]"><Zap size={11} /> {l.xp}</span>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <Card className="flex items-center gap-2 border-dashed p-3.5 text-sm text-[var(--text-subtle)]">
                  <Lock size={14} /> Being authored — you’ll earn XP here soon.
                </Card>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
