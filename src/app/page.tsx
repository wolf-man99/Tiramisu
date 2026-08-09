import Link from 'next/link';
import { Sparkles, ArrowRight, Terminal, Trophy, Bot, Zap } from 'lucide-react';
import { COURSES } from '@/lib/courses/registry';
import { getProfileId } from '@/lib/auth/server';
import { CourseCard } from '@/components/app/CourseCard';
import { Button } from '@/components/ui/primitives';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const authed = Boolean(await getProfileId());

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] shadow-[0_4px_20px_-6px_var(--accent)]"><Sparkles size={17} className="text-white" /></span>
            <span className="text-[15px] font-semibold tracking-tight">Growth<span className="text-[var(--accent-text)]">SQL</span> Academy</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/courses" className="hidden rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] sm:block">Courses</Link>
            {authed ? (
              <Link href="/dashboard"><Button size="sm">Go to dashboard <ArrowRight size={14} /></Button></Link>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">Sign in</Link>
                <Link href="/signup"><Button size="sm">Get started</Button></Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 py-16 text-center md:px-8 md:py-24">
        <div className="animate-fade-up">
          <span className="chip mx-auto mb-5 w-fit border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-text)]">
            <Sparkles size={12} /> Interactive · hands-on · gamified
          </span>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
            Master the tools that <span className="gradient-text">grow companies</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--text-muted)]">
            Practical courses for growth &amp; performance marketers — SQL, Meta Ads, Google Ads and more. Real tools, an AI coach, and practice that keeps you hooked.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href={authed ? '/dashboard' : '/signup'}><Button size="lg">{authed ? 'Continue learning' : 'Start free'} <ArrowRight size={16} /></Button></Link>
            <Link href="/courses"><Button size="lg" variant="secondary">Browse courses</Button></Link>
          </div>
        </div>
        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: <Terminal size={18} />, label: 'Real tools, in-browser' },
            { icon: <Bot size={18} />, label: 'AI coach on every task' },
            { icon: <Zap size={18} />, label: 'XP, streaks & levels' },
            { icon: <Trophy size={18} />, label: 'Compete on leaderboards' },
          ].map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <span className="text-[var(--accent-text)]">{f.icon}</span>
              <span className="text-xs text-[var(--text-muted)]">{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Catalog */}
      <section id="courses" className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Courses</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Start with what&apos;s live. More platforms are launching soon.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {COURSES.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="mx-auto max-w-6xl px-5 text-sm text-[var(--text-subtle)] md:px-8">
          © {new Date().getFullYear()} GrowthSQL Academy — learn the craft of growth.
        </div>
      </footer>
    </div>
  );
}
