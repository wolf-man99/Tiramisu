import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { Sparkles, ArrowLeft, Check, Clock, Bell, Bot, Zap, Trophy, Share2 } from 'lucide-react';
import { courseBySlug, STATUS_LABEL } from '@/lib/courses/registry';
import { getProfileId } from '@/lib/auth/server';
import { Button, Card, Chip } from '@/components/ui/primitives';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Preview / waitlist page for courses that aren't live yet (Meta Ads is next up). */
export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = courseBySlug(slug);
  if (!course) notFound();
  if (course.status === 'live') redirect(course.href);

  const authed = Boolean(await getProfileId());
  const meta = slug === 'meta-ads';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 md:px-8">
          <Link href="/courses" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg border-2 border-[var(--ink)] bg-[var(--purple)]"><Sparkles size={17} className="text-white" /></span>
            <span className="text-[15px] font-semibold tracking-tight">Growth<span className="text-[var(--accent-text)]">SQL</span> Academy</span>
          </Link>
          {authed ? <Link href="/dashboard"><Button size="sm">Dashboard</Button></Link> : <Link href="/signup"><Button size="sm">Get started</Button></Link>}
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <Link href="/courses" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowLeft size={15} /> All courses</Link>

        <div className="flex items-start gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-3xl" style={{ background: `${course.accent}1a`, border: `1px solid ${course.accent}33` }}>{course.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{course.title}</h1>
              <Chip style={{ color: course.accent, borderColor: `${course.accent}55` }}>{STATUS_LABEL[course.status]}</Chip>
            </div>
            <p className="mt-1 text-lg" style={{ color: course.accent }}>{course.tagline}</p>
          </div>
        </div>

        <p className="mt-5 text-[var(--text-muted)]">{course.description}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {authed ? (
            <Button size="lg"><Bell size={16} /> {meta ? 'You’re on the early-access list' : 'Notify me when it launches'}</Button>
          ) : (
            <Link href="/signup"><Button size="lg"><Bell size={16} /> Join the waitlist</Button></Link>
          )}
          <Button size="lg" variant="secondary"><Share2 size={16} /> Share</Button>
        </div>

        {/* What you'll learn */}
        <Card className="mt-8 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">What you&apos;ll learn</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {course.highlights.map((h) => (
              <div key={h} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Check size={15} style={{ color: course.accent }} /> {h}
              </div>
            ))}
          </div>
        </Card>

        {meta && (
          <Card className="mt-4 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">The Meta Ads syllabus (dropping soon)</h2>
            <ol className="mt-3 space-y-2">
              {[
                'The account structure: Business Manager, ad accounts, the pixel & CAPI',
                'Campaign objectives and how Meta’s auction actually works',
                'Audiences: core, custom, lookalikes — and Advantage+ targeting',
                'Campaign Budget Optimization (CBO) vs ad-set budgets',
                'Creative that stops the thumb: hooks, formats, UGC frameworks',
                'The testing method: isolating variables without starving learning',
                'Reading the numbers: CPM, CTR, CPA, ROAS, frequency & fatigue',
                'Scaling: horizontal vs vertical, and when to duplicate',
              ].map((t, i) => (
                <li key={i} className="flex gap-3 text-sm text-[var(--text-muted)]">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[var(--surface-3)] text-xs font-bold">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm text-[var(--text-subtle)]">
              Every lesson is interactive and gamified — simulated campaign decisions, budget calculators, metric quizzes, and instant feedback. Built to keep you engaged, not bored.
            </p>
          </Card>
        )}

        {/* Why this platform */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: <Bot size={17} />, t: 'AI coach', d: 'Feedback and hints on every task.' },
            { icon: <Zap size={17} />, t: 'Gamified', d: 'XP, streaks, levels and badges.' },
            { icon: <Trophy size={17} />, t: 'Competitive', d: 'Climb the platform leaderboard.' },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <span className="text-[var(--accent-text)]">{f.icon}</span>
              <div className="mt-2 text-sm font-semibold">{f.t}</div>
              <p className="text-xs text-[var(--text-muted)]">{f.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-2 text-sm text-[var(--text-subtle)]">
          <Clock size={15} /> {course.duration}. Meanwhile, the <Link href="/dashboard" className="font-medium text-[var(--accent-text)] hover:underline">SQL for Marketers</Link> course is live now.
        </div>
      </div>
    </div>
  );
}
