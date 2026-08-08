import Link from 'next/link';
import { BarChart3, ArrowRight, Building2 } from 'lucide-react';
import { CAPSTONE, capstoneSections, capstoneBySection } from '@/lib/content/capstone';
import { PageHeader } from '@/components/app/PageHeader';
import { Card, DifficultyPill } from '@/components/ui/primitives';

export const metadata = { title: 'Capstone — GrowthSQL Academy' };

export default function CapstonePage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
      <PageHeader
        title="The Capstone"
        subtitle="You're the new Growth Analyst at Northbeam. 100 real business questions across eight sections — every one with a 'so what'."
        icon={<Building2 size={20} />}
      >
        <span className="chip">{CAPSTONE.length} questions</span>
      </PageHeader>

      <div className="space-y-6">
        {capstoneSections().map((section) => {
          const qs = capstoneBySection(section);
          return (
            <div key={section}>
              <div className="mb-2 flex items-center gap-2">
                <BarChart3 size={15} className="text-[var(--accent-text)]" />
                <h2 className="text-sm font-semibold">{section}</h2>
                <span className="text-xs text-[var(--text-faint)]">{qs.length} questions</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {qs.map((q) => (
                  <Link key={q.id} href={`/capstone/${q.id}`}>
                    <Card hover className="flex items-start gap-2.5 p-3.5">
                      <span className="mono text-xs text-[var(--text-faint)]">{q.id}</span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm">{q.prompt}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <DifficultyPill difficulty={q.difficulty} />
                        <ArrowRight size={14} className="text-[var(--text-faint)]" />
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
