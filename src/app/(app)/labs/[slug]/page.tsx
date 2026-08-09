import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Target, Gauge } from 'lucide-react';
import { labBySlug } from '@/lib/content/labs';
import { PageHeader } from '@/components/app/PageHeader';
import { Chip } from '@/components/ui/primitives';
import { RunnableSnippet } from '@/components/content/RunnableSnippet';
import { TaskSolver } from '@/components/workspace/TaskSolver';

export const runtime = 'nodejs';

export default async function LabPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lab = labBySlug(slug);
  if (!lab) notFound();

  const taskSteps = lab.steps.map((s, i) => ({ step: s, i })).filter((x) => x.step.task);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 md:px-8">
      <Link href="/labs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowLeft size={15} /> Labs</Link>
      <PageHeader title={lab.title} subtitle={lab.subtitle} />
      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4">
        <Target size={16} className="mt-0.5 shrink-0 text-[var(--accent-text)]" />
        <p className="text-sm text-[var(--text)]">{lab.objective}</p>
      </div>

      <div className="space-y-6">
        {lab.steps.map((s, i) => (
          <div key={i}>
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--surface-3)] text-xs font-bold">{i + 1}</span>
              <h3 className="font-semibold">{s.title}</h3>
              {s.measure && <Chip className="text-[var(--info)]"><Gauge size={11} /> measure bytes</Chip>}
            </div>
            <p className="mb-2 text-sm leading-relaxed text-[var(--text-muted)]">{s.body}</p>
            {s.sql && <RunnableSnippet code={s.sql} />}
          </div>
        ))}
      </div>

      {taskSteps.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Your turn</h2>
          <TaskSolver
            collection="lab"
            slug={lab.slug}
            tasks={taskSteps.map(({ step, i }) => ({ id: String(i), title: step.title, prompt: step.task!.prompt, difficulty: 'expert', concepts: lab.concepts, hints: step.task!.hints }))}
          />
        </div>
      )}
    </div>
  );
}
