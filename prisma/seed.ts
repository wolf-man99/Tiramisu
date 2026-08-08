import { PrismaClient } from '../src/generated/prisma';
import { FLASHCARDS } from '../src/lib/content/flashcards';

/**
 * Seeds content-derived rows (flashcards), the simulated leaderboard rivals, and the
 * single local profile. Idempotent — safe to run on every `db:setup`.
 */
const prisma = new PrismaClient();

/** 24 rivals on a spread of skill curves, so the leaderboard has texture and movement. */
const RIVAL_NAMES: [string, string][] = [
  ['Priya Sharma', 'IN'], ['Marcus Okafor', 'NG'], ['Ana Silva', 'BR'], ['Wei Chen', 'CN'],
  ['Sofia Rossi', 'IT'], ['Tomas Novak', 'CZ'], ['Aisha Ahmed', 'AE'], ['Liam Murphy', 'IE'],
  ['Yuki Tanaka', 'JP'], ['Elena Weber', 'DE'], ['Omar Haddad', 'LB'], ['Grace Bennett', 'GB'],
  ['Diego Alvarez', 'MX'], ['Fatima Nasser', 'EG'], ['Lucas Moreau', 'FR'], ['Mei Zhang', 'CN'],
  ['Ravi Patel', 'IN'], ['Clara Lindqvist', 'SE'], ['Jonas Berg', 'NO'], ['Zara Adeyemi', 'NG'],
  ['Andre Ferreira', 'PT'], ['Nina Kowalski', 'PL'], ['Kwame Mensah', 'GH'], ['Hana Kim', 'KR'],
];

const TITLES = ['Junior Analyst', 'Analyst', 'Growth Analyst', 'Senior Analyst', 'Metrics Fluent'];

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  // Flashcards (content — replace wholesale so edits propagate).
  for (const f of FLASHCARDS) {
    await prisma.flashcard.upsert({
      where: { id: f.id },
      update: { deck: f.deck, front: f.front, back: f.back, concept: f.concept },
      create: { id: f.id, deck: f.deck, front: f.front, back: f.back, concept: f.concept },
    });
  }

  // Rivals — deterministic curves so the board is stable across reseeds.
  const rng = mulberry32(424242);
  for (let i = 0; i < RIVAL_NAMES.length; i++) {
    const [name, country] = RIVAL_NAMES[i];
    const skill = rng(); // 0..1
    const baseXp = Math.round(200 + skill * 9000 + rng() * 1500);
    const dailyXp = Math.round(40 + skill * 260);
    const level = Math.max(1, Math.round(2 + skill * 26));
    await prisma.rival.upsert({
      where: { id: `rival-${i + 1}` },
      update: { displayName: name, country, baseXp, dailyXp, streak: Math.round(rng() * 40), level, title: TITLES[Math.min(TITLES.length - 1, Math.floor(skill * TITLES.length))] },
      create: {
        id: `rival-${i + 1}`,
        displayName: name,
        avatarSeed: name.toLowerCase().replace(/\s+/g, '-'),
        country,
        baseXp,
        dailyXp,
        streak: Math.round(rng() * 40),
        level,
        title: TITLES[Math.min(TITLES.length - 1, Math.floor(skill * TITLES.length))],
      },
    });
  }

  // The single local profile.
  await prisma.profile.upsert({
    where: { id: 'local' },
    update: {},
    create: { id: 'local' },
  });

  const cards = await prisma.flashcard.count();
  const rivals = await prisma.rival.count();
  console.log(`Seeded ${cards} flashcards, ${rivals} rivals, 1 profile.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
