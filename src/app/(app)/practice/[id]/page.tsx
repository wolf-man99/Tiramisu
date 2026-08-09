import { notFound } from 'next/navigation';
import { exerciseById } from '@/lib/content/exercises';
import { QueryWorkspace } from '@/components/workspace/QueryWorkspace';

export const runtime = 'nodejs';

export default async function PracticeExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ex = exerciseById(id);
  if (!ex) notFound();

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <QueryWorkspace
        exercise={{
          id: ex.id,
          title: ex.title,
          prompt: ex.prompt,
          difficulty: ex.difficulty,
          tables: ex.tables,
          concepts: ex.concepts,
          hints: ex.hints,
        }}
        grade={{ exerciseId: ex.id }}
      />
    </div>
  );
}
