import { recordAttempt } from '@/lib/progress/persist';
import { getProfileId } from '@/lib/auth/server';

export const runtime = 'nodejs';

/**
 * Record a non-SQL graded event — a quiz answer, an assessment result, a completed
 * flashcard drill. SQL exercises go through /api/sql/grade instead.
 */
export async function POST(req: Request) {
  const profileId = await getProfileId();
  if (!profileId) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  let body: {
    itemType?: string;
    itemId?: string;
    passed?: boolean;
    difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
    concepts?: string[];
    ms?: number;
    today?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.itemType || !body.itemId) {
    return Response.json({ error: 'itemType and itemId are required.' }, { status: 400 });
  }
  const progress = await recordAttempt({
    profileId,
    itemType: body.itemType,
    itemId: body.itemId,
    sql: '',
    passed: Boolean(body.passed),
    ms: body.ms ?? 0,
    difficulty: body.difficulty,
    concepts: body.concepts,
    today: body.today,
  });
  return Response.json({ ok: true, progress });
}
