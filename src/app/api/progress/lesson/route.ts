import { prisma } from '@/lib/db';
import { SECTION_ORDER } from '@/lib/content/types';
import { ensureEnrollment, DEFAULT_COURSE } from '@/lib/progress/persist';
import { getProfileId } from '@/lib/auth/server';
import { captureEvent } from '@/lib/analytics/server';

export const runtime = 'nodejs';

/** Mark a day's section complete (theory read, quiz done, reflection saved, …). */
export async function POST(req: Request) {
  const profileId = await getProfileId();
  if (!profileId) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  let body: { dayNumber?: number; section?: string; status?: string; score?: number; courseId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const { dayNumber, section } = body;
  if (typeof dayNumber !== 'number' || !section) {
    return Response.json({ error: 'dayNumber and section are required.' }, { status: 400 });
  }
  if (!SECTION_ORDER.includes(section as (typeof SECTION_ORDER)[number])) {
    return Response.json({ error: `Unknown section: ${section}` }, { status: 400 });
  }
  const courseId = body.courseId ?? DEFAULT_COURSE;

  // Check if this is a new enrollment
  const enrollment = await ensureEnrollment(profileId, courseId);
  if (enrollment.isNew) {
    await captureEvent(profileId, 'course_enrolled', {
      courseId,
    });
  }

  const status = body.status ?? 'complete';
  const row = await prisma.lessonProgress.upsert({
    where: { profileId_courseId_dayNumber_section: { profileId, courseId, dayNumber, section } },
    update: { status, score: body.score, completedAt: status === 'complete' ? new Date() : null },
    create: { profileId, courseId, dayNumber, section, status, score: body.score, completedAt: status === 'complete' ? new Date() : null },
  });

  // Emit lesson completed event
  if (status === 'complete') {
    await captureEvent(profileId, 'lesson_completed', {
      courseId,
      dayNumber,
      section,
      score: body.score,
    });
  }

  return Response.json({ ok: true, lesson: row });
}
