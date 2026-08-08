import { grade } from '@/lib/grading/grade';
import { exerciseById } from '@/lib/content/exercises';
import { recordAttempt } from '@/lib/progress/persist';
import { analyze } from '@/lib/coach/analyze';

export const runtime = 'nodejs';

/**
 * Grade a submission and record it. Resolve the reference solution from an exercise id,
 * or accept an explicit solution for project/interview/lab/capstone tasks.
 */
export async function POST(req: Request) {
  let body: {
    sql?: string;
    exerciseId?: string;
    solution?: string;
    orderMatters?: boolean;
    itemType?: string;
    itemId?: string;
    hintsUsed?: number;
    revealed?: boolean;
    difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
    concepts?: string[];
    record?: boolean;
    today?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const sql = (body.sql ?? '').trim();
  if (!sql) return Response.json({ error: 'No SQL provided.' }, { status: 400 });

  const ex = body.exerciseId ? exerciseById(body.exerciseId) : undefined;
  const solution = body.solution ?? ex?.solution;
  if (!solution) return Response.json({ error: 'No reference solution to grade against.' }, { status: 400 });

  const result = grade({
    sql,
    solution,
    orderMatters: body.orderMatters ?? ex?.orderMatters,
  });

  const analysis = analyze({
    sql,
    passed: result.passed,
    compare: result.compare,
    error: result.error,
    concepts: body.concepts ?? ex?.concepts,
    hintsUsed: body.hintsUsed,
  });

  // Persist the attempt unless the caller opts out (e.g. sandbox mode).
  let progress = null;
  if (body.record !== false) {
    progress = await recordAttempt({
      itemType: body.itemType ?? (ex ? 'exercise' : 'exercise'),
      itemId: body.itemId ?? body.exerciseId ?? 'unknown',
      sql,
      passed: result.passed,
      ms: result.ms,
      rowsReturned: result.result?.rowCount ?? 0,
      hintsUsed: body.hintsUsed ?? 0,
      revealed: body.revealed ?? false,
      difficulty: body.difficulty ?? ex?.difficulty,
      concepts: body.concepts ?? ex?.concepts,
      diagnosis: analysis.diagnosis,
      today: body.today,
    });
  }

  return Response.json({ ...result, analysis, progress });
}
