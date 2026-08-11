import { challengeForDate } from '@/lib/content/exercises';

export const runtime = 'nodejs';

/** Today's deterministic daily challenge, the same for everyone on a given date. */
export async function GET(req: Request) {
  const today = new URL(req.url).searchParams.get('today') ?? new Date().toISOString().slice(0, 10);
  const ex = challengeForDate(today);
  return Response.json({
    date: today,
    exercise: {
      id: ex.id,
      title: ex.title,
      prompt: ex.prompt,
      difficulty: ex.difficulty,
      tables: ex.tables,
      concepts: ex.concepts,
      hints: ex.hints,
    },
  });
}
