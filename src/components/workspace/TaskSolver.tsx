'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { QueryWorkspace, type WorkspaceExercise } from './QueryWorkspace';

export interface SolverTask {
  id: string;
  title: string;
  prompt: string;
  difficulty?: string;
  tables?: string[];
  concepts?: string[];
  hints?: string[];
}

/** A task picker plus a single embedded workspace — used by project/interview/capstone pages. */
export function TaskSolver({
  collection,
  slug,
  tasks,
}: {
  collection: 'project' | 'interview' | 'capstone' | 'lab';
  slug: string;
  tasks: SolverTask[];
}) {
  const [active, setActive] = useState(0);
  const t = tasks[active];

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
      {tasks.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--bg-subtle)] p-2">
          {tasks.map((task, i) => (
            <button
              key={task.id}
              onClick={() => setActive(i)}
              className={cn('shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors', i === active ? 'bg-[var(--surface-3)] text-[var(--text)]' : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)]')}
            >
              {i + 1}. {task.title}
            </button>
          ))}
        </div>
      )}
      <div className="h-[640px]">
        <QueryWorkspace
          key={t.id}
          exercise={
            {
              title: t.title,
              prompt: t.prompt,
              difficulty: t.difficulty ?? (collection === 'capstone' ? 'expert' : 'hard'),
              tables: t.tables ?? [],
              concepts: t.concepts ?? [],
              hints: t.hints ?? [],
            } satisfies WorkspaceExercise
          }
          grade={{ task: { collection, slug, taskId: t.id } }}
        />
      </div>
    </div>
  );
}
