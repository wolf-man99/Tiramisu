import { prisma } from '@/lib/db';
import { levelForXp, titleForLevel } from '@/lib/progress/leveling';
import { getProfileId } from '@/lib/auth/server';

export const runtime = 'nodejs';

/**
 * The platform leaderboard: every real learner plus a set of simulated rivals that
 * progress on a deterministic daily curve, so the board has life even early on. The
 * signed-in learner is flagged so the UI can highlight and locate them.
 */
export async function GET() {
  const meId = await getProfileId();
  // Parallel is safe: DATABASE_URL carries pgbouncer=true, so Prisma's engine never
  // relies on server-side prepared statements, which is what made concurrent queries
  // hazardous under Supabase's transaction-mode pooling in the first place.
  const [profiles, rivals] = await Promise.all([
    prisma.profile.findMany({
      where: { xp: { gt: 0 } },
      select: { id: true, displayName: true, avatarSeed: true, image: true, xp: true, level: true, title: true, currentStreak: true },
    }),
    prisma.rival.findMany(),
  ]);

  const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);

  const realRows = profiles.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    avatarSeed: p.avatarSeed,
    image: p.image,
    country: '',
    xp: p.xp,
    level: p.level,
    title: p.title,
    streak: p.currentStreak,
    isYou: p.id === meId,
    isRival: false,
  }));

  const rivalRows = rivals.map((r) => {
    const wobble = ((Math.sin(daysSinceEpoch * 0.7 + r.id.length) + 1) / 2) * 0.4 + 0.8;
    const xp = Math.round(r.baseXp + r.dailyXp * daysSinceEpoch * 0.05 * wobble);
    const level = Math.max(r.level, levelForXp(xp));
    return {
      id: r.id,
      displayName: r.displayName,
      avatarSeed: r.avatarSeed,
      image: null as string | null,
      country: r.country,
      xp,
      level,
      title: titleForLevel(level),
      streak: r.streak,
      isYou: false,
      isRival: true,
    };
  });

  // Ensure the signed-in learner appears even at 0 XP.
  const board = [...realRows, ...rivalRows];
  if (meId && !board.some((r) => r.isYou)) {
    const me = await prisma.profile.findUnique({ where: { id: meId } });
    if (me) {
      board.push({ id: me.id, displayName: me.displayName, avatarSeed: me.avatarSeed, image: me.image, country: '', xp: me.xp, level: me.level, title: me.title, streak: me.currentStreak, isYou: true, isRival: false });
    }
  }

  board.sort((a, b) => b.xp - a.xp);
  const ranked = board.map((row, i) => ({ ...row, rank: i + 1 }));
  const you = ranked.find((r) => r.isYou) ?? null;

  return Response.json({ board: ranked, you, learners: realRows.length });
}
