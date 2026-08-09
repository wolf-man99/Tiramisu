import Link from 'next/link';
import { Briefcase, ArrowRight } from 'lucide-react';
import { INTERVIEWS } from '@/lib/content/interviews';
import { PageHeader } from '@/components/app/PageHeader';
import { Card, DifficultyPill } from '@/components/ui/primitives';

export const metadata = { title: 'Mock Interviews — Tiramisu' };

export default function InterviewsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
      <PageHeader title="Mock interviews" subtitle="Ten company-styled SQL rounds of increasing difficulty, each with what a strong candidate says out loud." icon={<Briefcase size={20} />} />
      <div className="grid gap-3 md:grid-cols-2">
        {INTERVIEWS.map((s) => (
          <Link key={s.slug} href={`/interviews/${s.slug}`}>
            <Card hover className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{s.company}</h2>
                <DifficultyPill difficulty={s.difficulty} />
              </div>
              <div className="text-sm text-[var(--accent-text)]">{s.role}</div>
              <p className="mt-2 flex-1 text-sm text-[var(--text-muted)]">{s.blurb}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-subtle)]">
                <span>{s.questions.length} questions</span>
                <ArrowRight size={16} className="text-[var(--text-faint)]" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
