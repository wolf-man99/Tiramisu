import Link from 'next/link';
import { Dumbbell, ArrowRight } from 'lucide-react';
import { EXERCISES } from '@/lib/content/exercises';
import { DAYS } from '@/lib/content/curriculum';
import { PageHeader } from '@/components/app/PageHeader';
import { Card, DifficultyPill, Chip } from '@/components/ui/primitives';
import { PracticeFilters } from '@/components/app/PracticeFilters';

export const metadata = { title: 'Practice - Tiramisu' };

export default function PracticePage() {
  const modules = [...new Set(EXERCISES.map((e) => e.day))].sort((a, b) => a - b);
  const byDay = modules.map((day) => ({
    day,
    title: DAYS.find((d) => d.day === day)?.moduleTitle ?? `Day ${day}`,
    exercises: EXERCISES.filter((e) => e.day === day),
  }));

  const items = EXERCISES.map((e) => ({
    id: e.id, title: e.title, difficulty: e.difficulty, day: e.day, concepts: e.concepts,
  }));

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <PageHeader
        title="Practice"
        subtitle="300 graded exercises across every module. Filter by difficulty and concept, or jump into a random rep."
        icon={<Dumbbell size={20} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['easy', 'medium', 'hard', 'expert'] as const).map((d) => {
          const n = EXERCISES.filter((e) => e.difficulty === d).length;
          return (
            <Card key={d} className="p-4">
              <DifficultyPill difficulty={d} />
              <div className="mt-2 text-2xl font-semibold tabular-nums">{n}</div>
              <div className="text-xs text-[var(--text-subtle)]">exercises</div>
            </Card>
          );
        })}
      </div>

      <PracticeFilters items={items} />

      <div className="mt-8 space-y-6">
        {byDay.map((group) => (
          <div key={group.day}>
            <div className="mb-2 flex items-center gap-2">
              <span className="chip">Day {group.day}</span>
              <h2 className="text-sm font-semibold text-[var(--text-muted)]">{group.title}</h2>
              <span className="text-xs text-[var(--text-faint)]">{group.exercises.length} exercises</span>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {group.exercises.map((e) => (
                <Link key={e.id} href={`/practice/${e.id}`}>
                  <Card hover className="flex items-center gap-3 p-3.5">
                    <span className="mono text-xs text-[var(--text-faint)]">{e.id}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{e.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1">{e.concepts.slice(0, 2).map((c) => <Chip key={c} className="py-0 text-[10px]">{c.replace(/-/g, ' ')}</Chip>)}</div>
                    </div>
                    <DifficultyPill difficulty={e.difficulty} />
                    <ArrowRight size={15} className="shrink-0 text-[var(--text-faint)]" />
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
