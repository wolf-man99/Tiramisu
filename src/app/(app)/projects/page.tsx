import Link from 'next/link';
import { FolderKanban, ArrowRight, Table2 } from 'lucide-react';
import { PROJECTS } from '@/lib/content/projects';
import { PageHeader } from '@/components/app/PageHeader';
import { Card, DifficultyPill } from '@/components/ui/primitives';

export const metadata = { title: 'Projects - Tiramisu' };

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
      <PageHeader title="Projects" subtitle="Ten end-to-end analyses on the Northbeam warehouse, the portfolio you talk about in interviews." icon={<FolderKanban size={20} />} />
      <div className="grid gap-3 md:grid-cols-2">
        {PROJECTS.map((p) => (
          <Link key={p.slug} href={`/projects/${p.slug}`}>
            <Card hover className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-faint)]">Project {p.index}</span>
                <DifficultyPill difficulty={p.difficulty} />
              </div>
              <h2 className="mt-2 font-semibold">{p.title}</h2>
              <p className="mt-1 flex-1 text-sm text-[var(--text-muted)]">{p.subtitle}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-subtle)]"><Table2 size={13} /> {p.tables.length} tables · {p.tasks.length} tasks</div>
                <ArrowRight size={16} className="text-[var(--text-faint)]" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
