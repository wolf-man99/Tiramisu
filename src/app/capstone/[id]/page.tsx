import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lightbulb } from 'lucide-react';
import { CAPSTONE } from '@/lib/content/capstone';
import { DifficultyPill, Chip } from '@/components/ui/primitives';
import { TaskSolver } from '@/components/workspace/TaskSolver';

export const runtime = 'nodejs';

export default async function CapstoneQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = CAPSTONE.find((x) => x.id === id);
  if (!q) notFound();

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
      <Link href="/capstone" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowLeft size={15} /> Capstone</Link>
      <div className="mb-4 flex items-center gap-2">
        <Chip>{q.section}</Chip>
        <Chip className="mono">{q.id}</Chip>
        <DifficultyPill difficulty={q.difficulty} />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{q.prompt}</h1>
      <div className="mt-3 mb-6 flex items-start gap-2.5 rounded-xl border border-[var(--warn-soft)] bg-[var(--warn-soft)] p-4">
        <Lightbulb size={16} className="mt-0.5 shrink-0 text-[var(--warn)]" />
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--warn)]">So what?</div>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{q.soWhat}</p>
        </div>
      </div>

      <TaskSolver
        collection="capstone"
        slug={q.id}
        tasks={[{ id: q.id, title: 'Answer', prompt: q.prompt, difficulty: q.difficulty, hints: q.hints }]}
      />
    </div>
  );
}
