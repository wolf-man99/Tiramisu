import Link from 'next/link';
import { FlaskConical, ArrowRight } from 'lucide-react';
import { LABS } from '@/lib/content/labs';
import { PageHeader } from '@/components/app/PageHeader';
import { Card, Chip } from '@/components/ui/primitives';

export const metadata = { title: 'BigQuery Labs — GrowthSQL Academy' };

export default function LabsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
      <PageHeader title="BigQuery labs" subtitle="Hands-on labs on cost, partitioning, clustering, nested data and query optimisation — each with a real before/after." icon={<FlaskConical size={20} />} />
      <div className="grid gap-3 md:grid-cols-2">
        {LABS.map((l) => (
          <Link key={l.slug} href={`/labs/${l.slug}`}>
            <Card hover className="flex h-full flex-col p-5">
              <span className="text-xs font-semibold text-[var(--text-faint)]">Lab {l.index}</span>
              <h2 className="mt-1 font-semibold">{l.title}</h2>
              <p className="mt-1 flex-1 text-sm text-[var(--text-muted)]">{l.subtitle}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {l.concepts.slice(0, 3).map((c) => <Chip key={c}>{c.replace(/-/g, ' ')}</Chip>)}
                <ArrowRight size={16} className="ml-auto text-[var(--text-faint)]" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
