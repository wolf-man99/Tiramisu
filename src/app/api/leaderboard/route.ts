import { prisma, LOCAL_PROFILE_ID } from '@/lib/db';
import { levelForXp, titleForLevel } from '@/lib/progress/leveling';
import { ensureProfile } from '@/lib/progress/persist';

export const runtime = 'nodejs';

/**
 * The leaderboard. Rivals progress on a deterministic curve keyed off days since the
 * epoch, so the board moves day to day without any background job. The learner is
 * slotted in by real XP.
 */
export async function GET() {
  await ensureProfile();
  const [profile, rivals] = await Promise.all([
    prisma.profile.findUniqueOrThrow({ where: { id: LOCAL_PROFILE_ID } }),
    prisma.rival.findMany(),
  ]);

  const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);

  const board = rivals.map((r) => {
    // Simulated accumulation: baseXp plus dailyXp for each day, with a little wobble.
    const wobble = ((Math.sin(daysSinceEpoch * 0.7 + r.id.length) + 1) / 2) * 0.4 + 0.8;
    const xp = Math.round(r.baseXp + r.dailyXp * daysSinceEpoch * 0.05 * wobble);
    return {
      id: r.id,
      displayName: r.displayName,
      avatarSeed: r.avatarSeed,
      country: r.country,
      xp,
      level: Math.max(r.level, levelForXp(xp)),
      title: titleForLevel(Math.max(r.level, levelForXp(xp))),
      streak: r.streak,
      isYou: false,
    };
  });

  board.push({
    id: LOCAL_PROFILE_ID,
    displayName: profile.displayName,
    avatarSeed: profile.avatarSeed,
    country: '',
    xp: profile.xp,
    level: profile.level,
    title: profile.title,
    streak: profile.currentStreak,
    isYou: true,
  });

  board.sort((a, b) => b.xp - a.xp);
  const ranked = board.map((row, i) => ({ ...row, rank: i + 1 }));
  const you = ranked.find((r) => r.isYou);

  return Response.json({ board: ranked, you });
}
