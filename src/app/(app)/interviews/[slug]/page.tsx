import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { interviewBySlug } from '@/lib/content/interviews';
import { PageHeader } from '@/components/app/PageHeader';
import { DifficultyPill } from '@/components/ui/primitives';
import { TaskSolver } from '@/components/workspace/TaskSolver';

export const runtime = 'nodejs';

export default async function InterviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = interviewBySlug(slug);
  if (!s) notFound();

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
      <Link href="/interviews" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowLeft size={15} /> Mock interviews</Link>
      <PageHeader title={`${s.company} - ${s.role}`} subtitle={s.blurb}>
        <DifficultyPill difficulty={s.difficulty} />
      </PageHeader>

      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <MessageSquare size={16} className="mt-0.5 shrink-0 text-[var(--accent-text)]" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">What this round optimises for</div>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{s.style}</p>
        </div>
      </div>

      <div className="mb-6 space-y-2">
        {s.questions.map((q, i) => (
          <details key={q.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--surface-3)] text-xs">{i + 1}</span>
              <span className="flex-1">{q.prompt}</span>
              <DifficultyPill difficulty={q.difficulty} />
            </summary>
            <p className="mt-3 rounded-lg bg-[var(--accent-soft)] p-3 text-sm text-[var(--text-muted)]"><span className="font-medium text-[var(--accent-text)]">Say this: </span>{q.interviewerNote}</p>
            {q.followUp && <p className="mt-2 text-sm text-[var(--text-subtle)]"><span className="font-medium">Follow-up: </span>{q.followUp}</p>}
          </details>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-semibold">Solve the round</h2>
      <TaskSolver
        collection="interview"
        slug={s.slug}
        tasks={s.questions.map((q) => ({ id: q.id, title: `Q${s.questions.indexOf(q) + 1}`, prompt: q.prompt, difficulty: q.difficulty, hints: q.hints }))}
      />
    </div>
  );
}
