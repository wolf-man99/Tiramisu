import { grade } from '@/lib/grading/grade';
import { recordAttempt } from '@/lib/progress/persist';
import { analyze } from '@/lib/coach/analyze';
import { PROJECTS } from '@/lib/content/projects';
import { INTERVIEWS } from '@/lib/content/interviews';
import { CAPSTONE } from '@/lib/content/capstone';
import { LABS } from '@/lib/content/labs';
import { getProfileId } from '@/lib/auth/server';
import { captureEvent } from '@/lib/analytics/server';

export const runtime = 'nodejs';

type Collection = 'project' | 'interview' | 'capstone' | 'lab';

/** Resolve a task's reference solution server-side — never expose it to the client. */
function resolve(collection: Collection, slug: string, taskId?: string): { solution: string; orderMatters?: boolean; itemId: string } | null {
  if (collection === 'project') {
    const p = PROJECTS.find((x) => x.slug === slug);
    const t = p?.tasks.find((x) => x.id === taskId);
    return t ? { solution: t.solution, orderMatters: t.orderMatters, itemId: `${slug}/${t.id}` } : null;
  }
  if (collection === 'interview') {
    const s = INTERVIEWS.find((x) => x.slug === slug);
    const q = s?.questions.find((x) => x.id === taskId);
    return q ? { solution: q.solution, orderMatters: q.orderMatters, itemId: `${slug}/${q.id}` } : null;
  }
  if (collection === 'lab') {
    const l = LABS.find((x) => x.slug === slug);
    const idx = Number(taskId);
    const step = l?.steps[idx];
    return step?.task ? { solution: step.task.solution, orderMatters: step.task.orderMatters, itemId: `${slug}/task${idx + 1}` } : null;
  }
  if (collection === 'capstone') {
    const q = CAPSTONE.find((x) => x.id === slug);
    return q ? { solution: q.solution, orderMatters: q.orderMatters, itemId: q.id } : null;
  }
  return null;
}

export async function POST(req: Request) {
  let body: { sql?: string; collection?: Collection; slug?: string; taskId?: string; hintsUsed?: number; today?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const sql = (body.sql ?? '').trim();
  if (!sql || !body.collection || !body.slug) {
    return Response.json({ error: 'sql, collection and slug are required.' }, { status: 400 });
  }
  const ref = resolve(body.collection, body.slug, body.taskId);
  if (!ref) return Response.json({ error: 'Task not found.' }, { status: 404 });

  const result = grade({ sql, solution: ref.solution, orderMatters: ref.orderMatters });
  const analysis = analyze({ sql, passed: result.passed, compare: result.compare, error: result.error });

  const profileId = await getProfileId();
  const progress = profileId
    ? await recordAttempt({
      profileId,
      itemType: body.collection,
      itemId: ref.itemId,
      sql,
      passed: result.passed,
      ms: result.ms,
      rowsReturned: result.result?.rowCount ?? 0,
      hintsUsed: body.hintsUsed ?? 0,
      difficulty: body.collection === 'capstone' || body.collection === 'lab' ? 'expert' : 'hard',
      today: body.today,
    })
    : null;

  if (profileId && progress) {
    await captureEvent(profileId, 'task_submitted', {
      collection: body.collection,
      slug: body.slug,
      taskId: body.taskId,
      itemId: ref.itemId,
      passed: result.passed,
      ms: result.ms,
      hintsUsed: body.hintsUsed ?? 0,
    });

    if (result.passed) {
      await captureEvent(profileId, 'task_passed', {
        collection: body.collection,
        slug: body.slug,
        ms: result.ms,
      });

      if (progress?.xpAwarded && progress.xpAwarded > 0) {
        await captureEvent(profileId, 'xp_earned', {
          amount: progress.xpAwarded,
          source: body.collection,
          itemId: ref.itemId,
        });
      }

      if (progress?.leveledUp) {
        await captureEvent(profileId, 'level_up', {
          newLevel: progress.newLevel,
          totalXp: progress.totalXp,
        });
      }
    } else {
      await captureEvent(profileId, 'task_failed', {
        collection: body.collection,
        slug: body.slug,
        ms: result.ms,
      });
    }
  }

  return Response.json({ ...result, analysis, progress });
}
