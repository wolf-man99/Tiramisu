import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Clock, Target, Lightbulb, Dumbbell, ClipboardCheck,
  Sparkles, MessageSquare, FolderKanban, PlayCircle,
} from 'lucide-react';
import { dayByNumber } from '@/lib/content/curriculum';
import { exerciseById } from '@/lib/content/exercises';
import { prisma, LOCAL_PROFILE_ID } from '@/lib/db';
import { ensureProfile } from '@/lib/progress/persist';
import { BlockRenderer } from '@/components/content/BlockRenderer';
import { RunnableSnippet } from '@/components/content/RunnableSnippet';
import { VisualPanel } from '@/components/content/VisualPanel';
import { Quiz } from '@/components/content/Quiz';
import { LessonComplete } from '@/components/content/LessonComplete';
import { Card, Chip, DifficultyPill } from '@/components/ui/primitives';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DayPage({ params }: { params: Promise<{ day: string }> }) {
  const { day: dayParam } = await params;
  const day = dayByNumber(Number(dayParam));
  if (!day) notFound();

  await ensureProfile();
  const lessons = await prisma.lessonProgress.findMany({ where: { profileId: LOCAL_PROFILE_ID, dayNumber: day.day, status: 'complete' }, select: { section: true } });
  const dayDone = lessons.length >= 10;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
      {/* Header */}
      <Link href="/learn" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
        <ArrowLeft size={15} /> Curriculum
      </Link>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Chip className="bg-[var(--accent-soft)] text-[var(--accent-text)]">Day {day.day}</Chip>
          <Chip>{day.moduleTitle}</Chip>
          <span className="flex items-center gap-1 text-xs text-[var(--text-subtle)]"><Clock size={12} /> ~{day.estimatedMinutes} min</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{day.title}</h1>
        <p className="mt-1.5 text-[var(--text-muted)]">{day.subtitle}</p>
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4">
          <Target size={17} className="mt-0.5 shrink-0 text-[var(--accent-text)]" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-text)]">Objective</div>
            <p className="mt-0.5 text-sm text-[var(--text)]">{day.objective}</p>
          </div>
        </div>
      </div>

      {/* Theory */}
      <Section icon={<Lightbulb size={16} />} title="Theory">
        <BlockRenderer blocks={day.theory} />
      </Section>

      {/* Visual */}
      <Section icon={<Sparkles size={16} />} title={day.visual.title}>
        <VisualPanel kind={day.visual.kind} title={day.visual.title} caption={day.visual.caption} />
      </Section>

      {/* Examples */}
      <Section icon={<PlayCircle size={16} />} title="Worked examples">
        <div className="space-y-5">
          {day.examples.map((ex, i) => (
            <div key={i}>
              <h4 className="text-sm font-semibold">{ex.title}</h4>
              <p className="mb-2 mt-0.5 text-sm text-[var(--text-muted)]">{ex.question}</p>
              <RunnableSnippet code={ex.sql} />
              <p className="mt-2 flex items-start gap-2 text-sm text-[var(--text-muted)]">
                <ArrowRight size={14} className="mt-0.5 shrink-0 text-[var(--success)]" /> {ex.takeaway}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Playground */}
      <Section icon={<PlayCircle size={16} />} title="Try it yourself">
        <p className="mb-2 text-sm text-[var(--text-muted)]">{day.playground.prompt}</p>
        <RunnableSnippet code={day.playground.starter} caption="Starter — edit and run in the playground" />
        <Link href="/playground" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-text)] hover:underline">
          Open the full playground <ArrowRight size={14} />
        </Link>
      </Section>

      {/* Practice */}
      <Section icon={<Dumbbell size={16} />} title="Practice">
        <div className="grid gap-2 sm:grid-cols-2">
          {day.practice.map((id) => {
            const ex = exerciseById(id);
            if (!ex) return null;
            return (
              <Link key={id} href={`/practice/${id}`}>
                <Card hover className="flex items-center gap-2.5 p-3">
                  <span className="mono text-xs text-[var(--text-faint)]">{id}</span>
                  <span className="flex-1 truncate text-sm">{ex.title}</span>
                  <DifficultyPill difficulty={ex.difficulty} />
                </Card>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* Quiz */}
      <Section icon={<ClipboardCheck size={16} />} title="Quick quiz">
        <Quiz questions={day.quiz} />
      </Section>

      {/* Assessment */}
      <Section icon={<ClipboardCheck size={16} />} title="Timed assessment">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
          <Chip>Pass ≥ {Math.round(day.assessment.passScore * 100)}%</Chip>
          <Chip><Clock size={12} /> {Math.round(day.assessment.timeLimitSec / 60)} min</Chip>
        </div>
        <Quiz questions={day.assessment.questions} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {day.assessment.exerciseIds.map((id) => {
            const ex = exerciseById(id);
            return ex ? (
              <Link key={id} href={`/practice/${id}`}>
                <Card hover className="flex items-center gap-2.5 p-3"><span className="mono text-xs text-[var(--text-faint)]">{id}</span><span className="flex-1 truncate text-sm">{ex.title}</span><DifficultyPill difficulty={ex.difficulty} /></Card>
              </Link>
            ) : null;
          })}
        </div>
      </Section>

      {/* Challenge */}
      {(() => {
        const ex = exerciseById(day.challenge);
        return ex ? (
          <Section icon={<Target size={16} />} title="Challenge">
            <Link href={`/practice/${day.challenge}`}>
              <Card hover className="flex items-center gap-3 border-[var(--accent-border)] bg-[var(--accent-soft)] p-4">
                <Target size={18} className="text-[var(--accent-text)]" />
                <div className="flex-1"><div className="font-medium">{ex.title}</div><p className="text-sm text-[var(--text-muted)] line-clamp-1">{ex.prompt}</p></div>
                <DifficultyPill difficulty={ex.difficulty} />
              </Card>
            </Link>
          </Section>
        ) : null;
      })()}

      {/* Reflection */}
      <Section icon={<MessageSquare size={16} />} title="Reflection">
        <ul className="space-y-2">
          {day.reflection.map((r, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-[var(--text-muted)]">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" /> {r}
            </li>
          ))}
        </ul>
      </Section>

      {/* Daily project */}
      <Section icon={<FolderKanban size={16} />} title={`Daily project: ${day.project.title}`}>
        <p className="mb-3 text-sm text-[var(--text-muted)]">{day.project.brief}</p>
        <div className="space-y-2">
          {day.project.tasks.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="text-sm font-semibold">{t.title}</div>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{t.brief}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Complete */}
      <div className="mt-10 flex items-center justify-between border-t border-[var(--border)] pt-6">
        <LessonComplete day={day.day} done={dayDone} />
        {day.day < 14 && (
          <Link href={`/learn/${day.day + 1}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent-text)] hover:underline">
            Day {day.day + 1} <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--surface-2)] text-[var(--accent-text)]">{icon}</span>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}
