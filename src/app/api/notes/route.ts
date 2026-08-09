import { prisma } from '@/lib/db';
import { getProfileId } from '@/lib/auth/server';

export const runtime = 'nodejs';

/** List the learner's notes, optionally filtered to one item. */
export async function GET(req: Request) {
  const profileId = await getProfileId();
  if (!profileId) return Response.json({ notes: [] });
  const url = new URL(req.url);
  const itemType = url.searchParams.get('itemType') ?? undefined;
  const itemId = url.searchParams.get('itemId') ?? undefined;
  const notes = await prisma.note.findMany({
    where: { profileId, itemType, itemId },
    orderBy: { updatedAt: 'desc' },
  });
  return Response.json({ notes });
}

/** Create or update a note on an item. An empty body deletes it. */
export async function POST(req: Request) {
  const profileId = await getProfileId();
  if (!profileId) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  let body: { itemType?: string; itemId?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.itemType || !body.itemId) {
    return Response.json({ error: 'itemType and itemId are required.' }, { status: 400 });
  }
  const text = (body.body ?? '').trim();
  if (!text) {
    await prisma.note.deleteMany({ where: { profileId, itemType: body.itemType, itemId: body.itemId } });
    return Response.json({ ok: true, deleted: true });
  }
  const note = await prisma.note.upsert({
    where: { profileId_itemType_itemId: { profileId, itemType: body.itemType, itemId: body.itemId } },
    update: { body: text },
    create: { profileId, itemType: body.itemType, itemId: body.itemId, body: text },
  });
  return Response.json({ ok: true, note });
}
