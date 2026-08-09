import { prisma } from '@/lib/db';
import { review, freshCard, isDue } from '@/lib/progress/srs';
import { getProfileId } from '@/lib/auth/server';

export const runtime = 'nodejs';

/** Due cards for review today, oldest-due first, plus deck counts. */
export async function GET(req: Request) {
  const profileId = await getProfileId();
  const today = new URL(req.url).searchParams.get('today') ?? new Date().toISOString().slice(0, 10);
  const [cards, reviews] = await Promise.all([
    prisma.flashcard.findMany(),
    profileId ? prisma.cardReview.findMany({ where: { profileId } }) : Promise.resolve([]),
  ]);
  const reviewByCard = new Map(reviews.map((r) => [r.cardId, r]));

  const due = cards.filter((c) => {
    const r = reviewByCard.get(c.id);
    return !r || isDue(r.dueDate, today);
  });

  const decks = [...new Set(cards.map((c) => c.deck))].map((deck) => ({
    deck,
    total: cards.filter((c) => c.deck === deck).length,
    due: due.filter((c) => c.deck === deck).length,
  }));

  return Response.json({
    due: due.map((c) => ({ id: c.id, deck: c.deck, front: c.front, back: c.back, concept: c.concept })),
    total: cards.length,
    dueCount: due.length,
    decks,
  });
}

/** Grade one card (0–5) and reschedule via SM-2. */
export async function POST(req: Request) {
  const profileId = await getProfileId();
  if (!profileId) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  let body: { cardId?: string; grade?: number; today?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!body.cardId || typeof body.grade !== 'number') {
    return Response.json({ error: 'cardId and grade are required.' }, { status: 400 });
  }
  const today = body.today ?? new Date().toISOString().slice(0, 10);
  const existing = await prisma.cardReview.findUnique({
    where: { profileId_cardId: { profileId, cardId: body.cardId } },
  });
  const state = existing
    ? { ease: existing.ease, intervalDays: existing.intervalDays, reps: existing.reps, lapses: existing.lapses, dueDate: existing.dueDate }
    : freshCard(today);
  const next = review(state, body.grade, today);
  const saved = await prisma.cardReview.upsert({
    where: { profileId_cardId: { profileId, cardId: body.cardId } },
    update: { ease: next.ease, intervalDays: next.intervalDays, reps: next.reps, lapses: next.lapses, dueDate: next.dueDate, lastGrade: next.lastGrade },
    create: { profileId, cardId: body.cardId, ease: next.ease, intervalDays: next.intervalDays, reps: next.reps, lapses: next.lapses, dueDate: next.dueDate, lastGrade: next.lastGrade },
  });
  return Response.json({ ok: true, review: saved });
}
