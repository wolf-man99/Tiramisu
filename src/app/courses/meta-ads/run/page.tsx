import Link from 'next/link';
import { ArrowLeft, Lock, PartyPopper, Sparkles, Zap } from 'lucide-react';
import { META_LESSONS } from '@/lib/content/meta-ads';
import { prisma } from '@/lib/db';
import { requireProfileId } from '@/lib/auth/server';
import { isRunUnlocked } from '@/lib/progress/gating';
import { Card, Button, Progress } from '@/components/ui/primitives';
import { SimulatorDemo } from '@/components/marketing/SimulatorDemo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Run — Meta Ads Mastery — Tiramisu' };

export default async function MetaAdsRun() {
  const profileId = await requireProfileId('/courses/meta-ads/run');

  // Sequential, not Promise.all — see the same note in courses/meta-ads/page.tsx.
  const unlocked = await isRunUnlocked(profileId, 'meta-ads');

  if (!unlocked) {
    // Sequential, not Promise.all — Supabase's pooled connection can route concurrent
    // queries to different backend connections and break Prisma's prepared statements.
    const profile = await prisma.profile.findUniqueOrThrow({ where: { id: profileId } });
    const done = await prisma.attempt.findMany({
      where: { profileId, courseId: 'meta-ads', itemType: 'lesson', passed: true },
      select: { itemId: true },
    });
    return <LockedState completedCount={done.length} xp={profile.xp} level={profile.level} />;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-5 md:px-8">
          <Link href="/courses/meta-ads" className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)]">
            <ArrowLeft size={15} /> Meta Ads Mastery
          </Link>
          <span className="chip bg-[var(--green)] text-white"><Sparkles size={11} /> Run unlocked</span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-[var(--ink)] bg-[var(--green)] text-white shadow-[3px_3px_0_var(--ink)]">
            <PartyPopper size={22} />
          </span>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">You unlocked Run</h1>
            <p className="mt-1 max-w-xl text-[var(--text-muted)]">
              You&apos;ve finished every Learn lesson — the full account simulator is what we&apos;re
              building next. In the meantime, here&apos;s a preview account to get a feel for it.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <SimulatorDemo />
        </div>
      </div>
    </div>
  );
}

function LockedState({ completedCount, xp, level }: { completedCount: number; xp: number; level: number }) {
  const total = META_LESSONS.length;
  const pct = total ? completedCount / total : 0;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-5 md:px-8">
          <Link href="/courses/meta-ads" className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)]">
            <ArrowLeft size={15} /> Meta Ads Mastery
          </Link>
          <span className="flex items-center gap-1.5 rounded-full border-2 border-[var(--ink)] bg-[var(--blue)] px-3 py-1 text-[13px] font-bold text-white">
            <Zap size={13} /> {xp} XP · Lvl {level}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-5 py-16 text-center md:px-8">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface-3)] shadow-[3px_3px_0_var(--ink)]">
          <Lock size={26} className="text-[var(--text-muted)]" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Run is locked</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Finish every lesson in Learn to unlock the account simulator — this is where the
          decisions get real, so the theory needs to be solid first.
        </p>

        <Card className="mt-6 p-4 text-left">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-bold">Learn progress</span>
            <span className="font-bold tabular-nums text-[var(--text-muted)]">{completedCount} / {total} lessons</span>
          </div>
          <Progress value={pct} color="var(--blue)" />
        </Card>

        <Link href="/courses/meta-ads" className="mt-6 inline-block">
          <Button size="lg">Back to Learn</Button>
        </Link>
      </div>
    </div>
  );
}
