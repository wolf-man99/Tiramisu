import Link from 'next/link';
import { ArrowRight, Sparkles, TrendingDown, Layers, Gamepad2 } from 'lucide-react';
import { getProfileId } from '@/lib/auth/server';
import { STACK } from '@/lib/courses/stack';
import { Button, Card } from '@/components/ui/primitives';
import { SiteHeader, SiteFooter } from '@/components/marketing/SiteChrome';
import { MethodStack } from '@/components/marketing/MethodStack';
import { StackCard } from '@/components/marketing/StackCard';
import { SimulatorDemo } from '@/components/marketing/SimulatorDemo';
import { RealityEvents } from '@/components/marketing/RealityEvents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The symptoms every performance marketer eventually meets in a live account. */
const SYMPTOMS = ['CPL increases', 'CPM spikes', 'Creative fatigue sets in', 'Audiences saturate', 'Tracking breaks', 'Conversion rates drop'];

/** The loop the simulator teaches. */
const LOOP = ['Learn', 'Measure', 'Diagnose', 'Decide', 'See what happens'];

const LAYER_TRUTHS = [
  ['Ads without tracking', 'are guesswork.'],
  ['Tracking without analytics', 'is just data.'],
  ['Analytics without strategy', 'is just reporting.'],
  ['Traffic without conversion', 'is wasted opportunity.'],
];

export default async function LandingPage() {
  const authed = Boolean(await getProfileId());
  const startHref = authed ? '/dashboard' : '/signup';
  const startLabel = authed ? 'Continue learning' : 'Start Learning';

  return (
    <div className="min-h-screen">
      <SiteHeader authed={authed} />

      {/* ─── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16 text-center md:px-8 md:py-24">
        <div className="animate-fade-up">
          <span className="chip mx-auto mb-5 w-fit" style={{ background: 'var(--amber)' }}>
            <Sparkles size={12} /> The Performance Marketing Lab
          </span>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">
            Performance Marketing,{' '}
            <span className="inline-block -rotate-1 rounded-xl border-2 border-[var(--ink)] bg-[var(--amber)] px-3 py-0.5 shadow-[4px_4px_0_var(--ink)]">
              One Skill at a Time
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-bold text-[var(--text)]">
            Learn the skills. Run the campaigns. Make the decisions.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-[var(--text-muted)]">
            Tiramisu is a hands-on learning platform for performance marketers covering paid
            acquisition, tracking, analytics, CRO, experimentation and growth.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={startHref}><Button size="lg">{startLabel} <ArrowRight size={16} /></Button></Link>
            <Link href="/courses"><Button size="lg" variant="secondary">Explore Courses</Button></Link>
          </div>
          <p className="mt-6 text-sm font-bold text-[var(--text-subtle)]">
            Learn the theory. Practice the skills. Run the account.
          </p>
        </div>
      </section>

      {/* ─── 2. The problem ──────────────────────────────────────────────── */}
      <section className="border-y-2 border-[var(--ink)] bg-[var(--bg-subtle)] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="eyebrow mb-2 flex items-center gap-1.5"><TrendingDown size={13} /> The problem</div>
              <h2 className="max-w-xl text-3xl font-extrabold tracking-tight md:text-4xl">
                Watching someone run ads isn&apos;t the same as running ads.
              </h2>
              <p className="mt-4 max-w-xl text-[var(--text-muted)]">
                You can finish hours of Meta Ads or Google Ads tutorials and still freeze when
                performance suddenly changes.
              </p>
              <p className="mt-4 max-w-xl font-bold">
                Real performance marketing is about making decisions when the data changes.
                That&apos;s what Tiramisu is built for.
              </p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {SYMPTOMS.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2.5 rounded-[10px] border-2 border-[var(--ink)] bg-white p-3.5 text-sm font-bold shadow-[3px_3px_0_var(--red)]"
                >
                  <TrendingDown size={15} className="shrink-0 text-[var(--red)]" />
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. The method ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="eyebrow mb-2 flex items-center gap-1.5"><Layers size={13} /> The Tiramisu method</div>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Learn the layers. Master the whole.
            </h2>
            <p className="mt-4 max-w-lg text-[var(--text-muted)]">
              A performance marketer isn&apos;t built from one skill. They are built from
              acquisition, creative, tracking, analytics, conversion, optimization, automation
              and growth.
            </p>
            <p className="mt-4 max-w-lg font-bold">
              Each skill makes you better. Together, they make you a complete performance marketer.
            </p>
          </div>
          <MethodStack />
        </div>
      </section>

      {/* ─── 4. Simulator ────────────────────────────────────────────────── */}
      <section id="simulator" className="scroll-mt-20 border-y-2 border-[var(--ink)] bg-[var(--bg-subtle)] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="eyebrow mb-2 flex items-center justify-center gap-1.5"><Gamepad2 size={13} /> The simulator</div>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              What if your course gave you ₹5 lakh?
            </h2>
            <p className="mt-4 text-[var(--text-muted)]">
              Instead of watching another tutorial, step into a simulated marketing account.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {['A virtual business', 'A virtual ad budget', 'Virtual campaigns', 'Realistic performance data', 'Real marketing problems'].map((x) => (
              <div key={x} className="rounded-[10px] border-2 border-[var(--ink)] bg-white p-3.5 text-center text-sm font-bold shadow-[3px_3px_0_var(--ink)]">
                {x}
              </div>
            ))}
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-center text-lg font-extrabold">
            Then you make the decisions. And the simulation responds.
          </p>

          <div className="mt-8 flex justify-center">
            <Link href="#account"><Button size="lg">Explore the Simulator <ArrowRight size={16} /></Button></Link>
          </div>
        </div>
      </section>

      {/* ─── 5. Virtual Meta Ads account ─────────────────────────────────── */}
      <section id="account" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 md:px-8 md:py-20">
        <div className="mb-6">
          <div className="eyebrow mb-1">Inside the simulator</div>
          <h2 className="text-3xl font-extrabold tracking-tight">A virtual Meta Ads account</h2>
          <p className="mt-1 max-w-2xl text-[var(--text-muted)]">
            You are handed a brand, a budget and a target. Everything below is a teaching
            simulation — invented data, not real Meta results.
          </p>
        </div>
        <SimulatorDemo />
      </section>

      {/* ─── 6. Then reality hits ────────────────────────────────────────── */}
      <section className="border-y-2 border-[var(--ink)] bg-[var(--bg-subtle)] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <div className="mb-6">
            <div className="eyebrow mb-1">Then reality hits</div>
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              The account doesn&apos;t stay perfect.
            </h2>
            <p className="mt-1 text-lg font-bold">That&apos;s the point.</p>
            <p className="mt-3 max-w-2xl text-[var(--text-muted)]">
              Pick a decision on any card below and see what the simulation does next.
            </p>
          </div>

          <RealityEvents />

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {LOOP.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="chip bg-white">{step}</span>
                {i < LOOP.length - 1 && <ArrowRight size={14} className="text-[var(--text-faint)]" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. Courses ──────────────────────────────────────────────────── */}
      <section id="courses" className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="mb-6">
          <div className="eyebrow mb-1">The curriculum</div>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Build your performance marketing stack.
          </h2>
          <p className="mt-1 text-[var(--text-muted)]">Four layers. One complete skill stack.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {STACK.map((layer) => <StackCard key={layer.slug} layer={layer} />)}
        </div>

        <div className="mt-8 flex justify-center">
          <Link href="/courses">
            <Button size="lg" variant="secondary">Explore all courses <ArrowRight size={16} /></Button>
          </Link>
        </div>
      </section>

      {/* ─── 8. Why Tiramisu ─────────────────────────────────────────────── */}
      <section className="border-y-2 border-[var(--ink)] bg-[var(--bg-subtle)] py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-5 text-center md:px-8">
          <div className="eyebrow mb-2">Why Tiramisu?</div>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Tiramisu has layers. So does great marketing.
          </h2>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {LAYER_TRUTHS.map(([head, tail]) => (
              <Card key={head} className="p-4 text-left">
                <p className="text-sm">
                  <span className="font-extrabold">{head}</span>{' '}
                  <span className="text-[var(--text-muted)]">{tail}</span>
                </p>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-lg font-bold">
            The magic happens when the layers work together.
          </p>
          <p className="mt-4 font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Learn the layers.
            <br />
            Master the whole.
          </p>
        </div>
      </section>

      {/* ─── 9. Final CTA ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <Card className="p-8 text-center md:p-12" style={{ boxShadow: '5px 5px 0 var(--blue)' }}>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Ready to run your first account?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[var(--text-muted)]">
            Stop watching marketers do the work. Start doing it yourself.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {['Learn the skills', 'Run the simulations', 'Make the decisions', 'Build the marketer'].map((s) => (
              <span key={s} className="chip bg-white">{s}</span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={startHref}><Button size="lg">{startLabel} <ArrowRight size={16} /></Button></Link>
            <Link href="/courses"><Button size="lg" variant="secondary">Explore Courses</Button></Link>
          </div>
        </Card>
      </section>

      <SiteFooter />
    </div>
  );
}
