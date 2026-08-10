import { prisma } from '@/lib/db';
import { recordAttempt, ensureEnrollment } from '@/lib/progress/persist';
import { isRunUnlocked } from '@/lib/progress/gating';
import { META_LESSONS, metaLessonItemId } from '@/lib/content/meta-ads';

export const runtime = 'nodejs';

/**
 * TEMPORARY, one-off test-data helper: marks every Meta Ads Learn lesson complete
 * for a given account, so Run can be tested without clicking through 23 lessons by
 * hand. Goes through the real recordAttempt()/ensureEnrollment() path -- same XP,
 * streak, level and badge logic the actual lesson player uses -- rather than writing
 * rows directly, so the resulting account state is exactly what it would be had the
 * lessons genuinely been completed.
 *
 * Deliberately NOT part of the permanent app surface: secret-gated, and removed
 * immediately after use (see the commit that deletes this file).
 */
const ADMIN_SECRET = '72ba188177923be0bc20ab6518b948b4819cdd665842f60d';

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('secret') !== ADMIN_SECRET) {
    return Response.json({ error: 'Not found.' }, { status: 404 });
  }

  const email = searchParams.get('email')?.trim().toLowerCase();
  if (!email) return Response.json({ error: 'email query param required.' }, { status: 400 });

  const profile = await prisma.profile.findUnique({ where: { email } });
  if (!profile) return Response.json({ error: `No account with email ${email}.` }, { status: 404 });

  await ensureEnrollment(profile.id, 'meta-ads');

  let totalXpAwarded = 0;
  let lessonsNewlyPassed = 0;
  for (const lesson of META_LESSONS) {
    const result = await recordAttempt({
      profileId: profile.id,
      courseId: 'meta-ads',
      itemType: 'lesson',
      itemId: metaLessonItemId(lesson),
      sql: '',
      passed: true,
      ms: 1000,
      xpOverride: lesson.xp,
    });
    if (result.xpAwarded > 0) {
      totalXpAwarded += result.xpAwarded;
      lessonsNewlyPassed++;
    }
  }

  const runUnlocked = await isRunUnlocked(profile.id, 'meta-ads');
  const updated = await prisma.profile.findUniqueOrThrow({ where: { id: profile.id } });

  return Response.json({
    ok: true,
    email,
    lessonsTotal: META_LESSONS.length,
    lessonsNewlyPassed,
    xpAwarded: totalXpAwarded,
    profileXp: updated.xp,
    profileLevel: updated.level,
    runUnlocked,
  });
}
