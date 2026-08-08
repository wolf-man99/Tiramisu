import Link from 'next/link';
import { GraduationCap, Clock, ArrowRight, CircleCheck } from 'lucide-react';
import { DAYS } from '@/lib/content/curriculum';
import { prisma, LOCAL_PROFILE_ID } from '@/lib/db';
import { ensureProfile } from '@/lib/progress/persist';
import { PageHeader } from '@/components/app/PageHeader';
import { Card, Chip } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function LearnPage() {
  await ensureProfile();
  const lessons = await prisma.lessonProgress.findMany({ where: { profileId: LOCAL_PROFILE_ID, status: 'complete' }, select: { dayNumber: true, section: true } });
  const perDay = new Map<number, Set<string>>();
  for (const l of lessons) { if (!perDay.has(l.dayNumber)) perDay.set(l.dayNumber, new Set()); perDay.get(l.dayNumber)!.add(l.section); }
  const doneDays = new Set([...perDay.entries()].filter(([, s]) => s.size >= 10).map(([d]) => d));
  const currentDay = Math.min(14, (doneDays.size ? Math.max(...doneDays) : 0) + 1);

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
      <PageHeader
        title="The 14-day curriculum"
        subtitle="Every day: theory, a visual, worked examples, a playground, graded practice, a quiz, a timed assessment, a challenge, reflection, and a daily project."
        icon={<GraduationCap size={20} />}
      />
      <div className="space-y-2.5">
        {DAYS.map((d) => {
          const done = doneDays.has(d.day);
          const locked = d.day > currentDay;
          return (
            <Link key={d.day} href={locked ? '#' : `/learn/${d.day}`} aria-disabled={locked}>
              <Card hover className={cn('flex items-center gap-4 p-4', locked && 'opacity-55')}>
                <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold',
                  done ? 'bg-[var(--success-soft)] text-[var(--success)]' : d.day === currentDay ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-3)] text-[var(--text-subtle)]')}>
                  {done ? <CircleCheck size={20} /> : `D${d.day}`}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-semibold">{d.title}</h2>
                    <Chip>{d.moduleTitle}</Chip>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-[var(--text-muted)]">{d.subtitle} — {d.objective}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--text-subtle)]">
                    <span className="flex items-center gap-1"><Clock size={12} /> ~{d.estimatedMinutes} min</span>
                    <span>{d.practice.length} exercises</span>
                    <span>{d.concepts.length} concepts</span>
                  </div>
                </div>
                {!locked && <ArrowRight size={18} className="shrink-0 text-[var(--text-faint)]" />}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
