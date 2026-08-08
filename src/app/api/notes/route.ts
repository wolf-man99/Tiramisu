import { prisma, LOCAL_PROFILE_ID } from '@/lib/db';
import { ensureProfile } from '@/lib/progress/persist';

export const runtime = 'nodejs';

/** List the learner's notes, optionally filtered to one item. */
export async function GET(req: Request) {
  await ensureProfile();
  const url = new URL(req.url);
  const itemType = url.searchParams.get('itemType') ?? undefined;
  const itemId = url.searchParams.get('itemId') ?? undefined;
  const notes = await prisma.note.findMany({
    where: { profileId: LOCAL_PROFILE_ID, itemType, itemId },
    orderBy: { updatedAt: 'desc' },
  });
  return Response.json({ notes });
}

/** Create or update a note on an item. An empty body deletes it. */
export async function POST(req: Request) {
  let body: { itemType?: string; itemId?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.itemType || !body.itemId) {
    return Response.json({ error: 'itemType and itemId are required.' }, { status: 400 });
  }
  await ensureProfile();
  const text = (body.body ?? '').trim();
  if (!text) {
    await prisma.note.deleteMany({ where: { profileId: LOCAL_PROFILE_ID, itemType: body.itemType, itemId: body.itemId } });
    return Response.json({ ok: true, deleted: true });
  }
  const note = await prisma.note.upsert({
    where: { profileId_itemType_itemId: { profileId: LOCAL_PROFILE_ID, itemType: body.itemType, itemId: body.itemId } },
    update: { body: text },
    create: { profileId: LOCAL_PROFILE_ID, itemType: body.itemType, itemId: body.itemId, body: text },
  });
  return Response.json({ ok: true, note });
}
