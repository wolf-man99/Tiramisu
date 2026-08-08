import { coach, coachHasLlm } from '@/lib/coach/coach';
import type { CompareResult } from '@/lib/grading/compare';

export const runtime = 'nodejs';

/**
 * Coach a submission: always returns the deterministic analysis, plus an optional
 * mentor paragraph. Never returns the solution.
 */
export async function POST(req: Request) {
  let body: {
    sql?: string;
    passed?: boolean;
    compare?: CompareResult;
    error?: { kind: string; message: string; hint?: string };
    exerciseId?: string;
    taskPrompt?: string;
    concepts?: string[];
    hintsUsed?: number;
    wantMentor?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.sql) return Response.json({ error: 'No SQL provided.' }, { status: 400 });

  const result = await coach({
    sql: body.sql,
    passed: Boolean(body.passed),
    compare: body.compare,
    error: body.error,
    exerciseId: body.exerciseId,
    taskPrompt: body.taskPrompt,
    concepts: body.concepts,
    hintsUsed: body.hintsUsed,
    wantMentor: body.wantMentor ?? true,
  });

  return Response.json({ ...result, llmAvailable: coachHasLlm() });
}
