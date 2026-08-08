import { prisma, LOCAL_PROFILE_ID } from '@/lib/db';
import { SECTION_ORDER } from '@/lib/content/types';
import { ensureProfile } from '@/lib/progress/persist';

export const runtime = 'nodejs';

/** Mark a day's section complete (theory read, quiz done, reflection saved, …). */
export async function POST(req: Request) {
  let body: { dayNumber?: number; section?: string; status?: string; score?: number };
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
  await ensureProfile();
  const status = body.status ?? 'complete';
  const row = await prisma.lessonProgress.upsert({
    where: { profileId_dayNumber_section: { profileId: LOCAL_PROFILE_ID, dayNumber, section } },
    update: { status, score: body.score, completedAt: status === 'complete' ? new Date() : null },
    create: { profileId: LOCAL_PROFILE_ID, dayNumber, section, status, score: body.score, completedAt: status === 'complete' ? new Date() : null },
  });
  return Response.json({ ok: true, lesson: row });
}
