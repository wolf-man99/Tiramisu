import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Target, Table2 } from 'lucide-react';
import { projectBySlug } from '@/lib/content/projects';
import { PageHeader } from '@/components/app/PageHeader';
import { Chip, DifficultyPill } from '@/components/ui/primitives';
import { TaskSolver } from '@/components/workspace/TaskSolver';

export const runtime = 'nodejs';

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = projectBySlug(slug);
  if (!p) notFound();

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowLeft size={15} /> Projects</Link>
      <PageHeader title={p.title} subtitle={p.subtitle}>
        <DifficultyPill difficulty={p.difficulty} />
      </PageHeader>

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-faint)]">Scenario</div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{p.scenario}</p>
        </div>
        <div className="rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--accent-text)]"><Target size={13} /> Deliverable</div>
          <p className="mt-1 text-sm text-[var(--text)]">{p.deliverable}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1 text-xs text-[var(--text-subtle)]"><Table2 size={13} /> Tables:</span>
        {p.tables.map((t) => <Chip key={t}>{t}</Chip>)}
      </div>

      <TaskSolver
        collection="project"
        slug={p.slug}
        tasks={p.tasks.map((t) => ({ id: t.id, title: t.title, prompt: t.brief, difficulty: p.difficulty, tables: p.tables, hints: t.hints }))}
      />
    </div>
  );
}
