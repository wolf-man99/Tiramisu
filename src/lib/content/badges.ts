import type { Badge } from './types';

/**
 * The badge catalogue. 44 badges across eight families, each with a machine-checkable
 * criterion the progress engine can evaluate against a Profile and its rollups. `icon`
 * is a lucide-react icon name; `tier` drives the frame colour in the UI.
 *
 * Criteria are written for humans on the locked card. The matching predicate lives in
 * `lib/progress/badges.ts`, keyed by badge id, so a badge with no predicate is simply
 * never awarded rather than crashing.
 */
export const BADGES: Badge[] = [
  // ── Onboarding ────────────────────────────────────────────────────────────
  {
    id: 'first-query',
    name: 'Hello, World',
    description: 'You ran your first query. Everything else is just more of this.',
    icon: 'play',
    tier: 'bronze',
    criterion: 'Run any query in the playground',
  },
  {
    id: 'first-correct',
    name: 'First Blood',
    description: 'Your first graded exercise, passed. The result set matched to the last row.',
    icon: 'check-check',
    tier: 'bronze',
    criterion: 'Pass any exercise',
  },
  {
    id: 'profile-set',
    name: 'Nameplate',
    description: 'You made the place your own.',
    icon: 'user-round',
    tier: 'bronze',
    criterion: 'Set a display name',
  },

  // ── Streaks ───────────────────────────────────────────────────────────────
  {
    id: 'streak-3',
    name: 'Warming Up',
    description: 'Three days in a row. The habit is forming.',
    icon: 'flame',
    tier: 'bronze',
    criterion: 'Reach a 3-day streak',
  },
  {
    id: 'streak-7',
    name: 'Full Week',
    description: 'Seven consecutive days. Halfway through the programme without a gap.',
    icon: 'flame',
    tier: 'silver',
    criterion: 'Reach a 7-day streak',
  },
  {
    id: 'streak-14',
    name: 'The Fortnight',
    description: 'Fourteen days, unbroken: the whole curriculum, one day at a time.',
    icon: 'flame',
    tier: 'gold',
    criterion: 'Reach a 14-day streak',
  },
  {
    id: 'streak-30',
    name: 'Unbroken',
    description: 'A month of showing up. This is what fluency is made of.',
    icon: 'flame',
    tier: 'platinum',
    criterion: 'Reach a 30-day streak',
  },
  {
    id: 'streak-saved',
    name: 'Clutch',
    description: 'You spent a streak freeze and lived to analyse another day.',
    icon: 'snowflake',
    tier: 'silver',
    criterion: 'Use a streak freeze to protect a streak',
  },

  // ── XP and levels ─────────────────────────────────────────────────────────
  {
    id: 'level-5',
    name: 'Junior Analyst',
    description: 'Level 5. You know your SELECT from your GROUP BY.',
    icon: 'trending-up',
    tier: 'bronze',
    criterion: 'Reach level 5',
  },
  {
    id: 'level-10',
    name: 'Analyst',
    description: 'Level 10. Joins and aggregation are reflexes now.',
    icon: 'trending-up',
    tier: 'silver',
    criterion: 'Reach level 10',
  },
  {
    id: 'level-20',
    name: 'Senior Analyst',
    description: 'Level 20. Windows, CTEs and the GA4 export hold no fear.',
    icon: 'trending-up',
    tier: 'gold',
    criterion: 'Reach level 20',
  },
  {
    id: 'level-30',
    name: 'Analytics Lead',
    description: 'Level 30. You could teach this.',
    icon: 'crown',
    tier: 'platinum',
    criterion: 'Reach level 30',
  },
  {
    id: 'xp-1000',
    name: 'Four Figures',
    description: 'One thousand XP earned the honest way.',
    icon: 'zap',
    tier: 'bronze',
    criterion: 'Earn 1,000 total XP',
  },
  {
    id: 'xp-10000',
    name: 'Five Figures',
    description: 'Ten thousand XP. That is a lot of correct result sets.',
    icon: 'zap',
    tier: 'gold',
    criterion: 'Earn 10,000 total XP',
  },
  {
    id: 'daily-goal-7',
    name: 'On Target',
    description: 'You hit your daily XP goal seven times.',
    icon: 'target',
    tier: 'silver',
    criterion: 'Hit your daily goal on 7 days',
  },

  // ── Module and day completion ─────────────────────────────────────────────
  {
    id: 'day-1-done',
    name: 'Day One',
    description: 'The first day, start to finish: theory, practice, project and reflection.',
    icon: 'sunrise',
    tier: 'bronze',
    criterion: 'Complete every section of day 1',
  },
  {
    id: 'foundations-done',
    name: 'Foundations Laid',
    description: 'Days 1 through 5: grain, SELECT, filtering, aggregation and execution order.',
    icon: 'layers',
    tier: 'silver',
    criterion: 'Complete days 1–5',
  },
  {
    id: 'joins-done',
    name: 'Everything Connected',
    description: 'The JOINs module, both days, including the ON-versus-WHERE trap.',
    icon: 'git-merge',
    tier: 'silver',
    criterion: 'Complete days 6–7',
  },
  {
    id: 'windows-done',
    name: 'Through the Window',
    description: 'Window functions: ranking, running totals, LAG and the LAST_VALUE frame trap.',
    icon: 'panels-top-left',
    tier: 'gold',
    criterion: 'Complete day 10',
  },
  {
    id: 'bigquery-done',
    name: 'Cost Aware',
    description: 'The BigQuery module. You now know what a query costs before you run it.',
    icon: 'database',
    tier: 'gold',
    criterion: 'Complete day 11',
  },
  {
    id: 'ga4-done',
    name: 'Export Whisperer',
    description: 'The GA4 export, rebuilt from raw events and reconciled to the last percent.',
    icon: 'bar-chart-3',
    tier: 'gold',
    criterion: 'Complete day 12',
  },
  {
    id: 'marketing-done',
    name: 'The Heart',
    description: 'Marketing analytics: every metric a growth team argues about, derived and defended.',
    icon: 'heart-pulse',
    tier: 'platinum',
    criterion: 'Complete day 13',
  },
  {
    id: 'all-days-done',
    name: 'Graduate',
    description: 'All fourteen days complete. You started at zero. You did not stay there.',
    icon: 'graduation-cap',
    tier: 'platinum',
    criterion: 'Complete all 14 days',
  },

  // ── Accuracy and craft ────────────────────────────────────────────────────
  {
    id: 'first-try-10',
    name: 'One and Done',
    description: 'Ten exercises passed on the first attempt. No hints, no retries.',
    icon: 'crosshair',
    tier: 'silver',
    criterion: 'Pass 10 exercises on the first attempt',
  },
  {
    id: 'first-try-50',
    name: 'Sharpshooter',
    description: 'Fifty first-attempt passes. Your mental model is doing the work.',
    icon: 'crosshair',
    tier: 'gold',
    criterion: 'Pass 50 exercises on the first attempt',
  },
  {
    id: 'no-hints-25',
    name: 'Unaided',
    description: 'Twenty-five exercises solved without opening a single hint.',
    icon: 'brain',
    tier: 'gold',
    criterion: 'Pass 25 exercises without using a hint',
  },
  {
    id: 'expert-10',
    name: 'Deep End',
    description: 'Ten expert-tier exercises passed. These are the ones that separate analysts.',
    icon: 'gem',
    tier: 'gold',
    criterion: 'Pass 10 expert exercises',
  },
  {
    id: 'accuracy-90',
    name: 'Precision Instrument',
    description: 'A 90% pass rate across at least 50 graded attempts.',
    icon: 'gauge',
    tier: 'platinum',
    criterion: '90% accuracy over 50+ attempts',
  },
  {
    id: 'debugger',
    name: 'Bug Hunter',
    description: 'You fixed twenty broken queries in the debug drills.',
    icon: 'bug',
    tier: 'silver',
    criterion: 'Pass 20 debug questions',
  },

  // ── Speed ─────────────────────────────────────────────────────────────────
  {
    id: 'speed-runner',
    name: 'Speed Runner',
    description: 'A correct answer to a hard exercise in under sixty seconds.',
    icon: 'timer',
    tier: 'silver',
    criterion: 'Pass a hard exercise in under 60 seconds',
  },
  {
    id: 'timed-perfect',
    name: 'Against the Clock',
    description: 'A perfect score on a timed assessment with time to spare.',
    icon: 'alarm-clock',
    tier: 'gold',
    criterion: 'Score 100% on a timed assessment',
  },

  // ── Practice modes ────────────────────────────────────────────────────────
  {
    id: 'daily-challenge-1',
    name: "Today's Question",
    description: 'You took the daily challenge. Come back tomorrow for another.',
    icon: 'calendar-check',
    tier: 'bronze',
    criterion: 'Complete a daily challenge',
  },
  {
    id: 'daily-challenge-14',
    name: 'Every Day Counts',
    description: 'Fourteen daily challenges answered. The compounding kind of practice.',
    icon: 'calendar-days',
    tier: 'gold',
    criterion: 'Complete 14 daily challenges',
  },
  {
    id: 'blind-mode',
    name: 'No Peeking',
    description: 'You passed an exercise in blind mode: no expected output, no hints.',
    icon: 'eye-off',
    tier: 'gold',
    criterion: 'Pass an exercise in blind mode',
  },
  {
    id: 'interview-mode',
    name: 'Under Pressure',
    description: 'You completed a mock interview set end to end, thinking out loud.',
    icon: 'mic',
    tier: 'silver',
    criterion: 'Complete a mock interview set',
  },

  // ── Projects, interviews, labs ────────────────────────────────────────────
  {
    id: 'project-1',
    name: 'Shipped',
    description: 'Your first end-to-end project, delivered.',
    icon: 'package-check',
    tier: 'bronze',
    criterion: 'Complete a project',
  },
  {
    id: 'project-all',
    name: 'The Portfolio',
    description: 'All ten projects complete. That is a body of work you can talk about.',
    icon: 'folder-check',
    tier: 'platinum',
    criterion: 'Complete all 10 projects',
  },
  {
    id: 'interview-3',
    name: 'On the Circuit',
    description: 'Three mock interview sets cleared. You have a feel for the format now.',
    icon: 'briefcase',
    tier: 'silver',
    criterion: 'Complete 3 mock interview sets',
  },
  {
    id: 'interview-all',
    name: 'Offer Ready',
    description: 'All ten interview sets, from Google to Zomato. Bring on the real thing.',
    icon: 'handshake',
    tier: 'platinum',
    criterion: 'Complete all 10 interview sets',
  },
  {
    id: 'labs-all',
    name: 'Lab Coat',
    description: 'Every BigQuery lab finished. Nested data and cost control are second nature.',
    icon: 'flask-conical',
    tier: 'gold',
    criterion: 'Complete all BigQuery labs',
  },

  // ── Capstone ──────────────────────────────────────────────────────────────
  {
    id: 'capstone-started',
    name: 'Day One at Northbeam',
    description: 'You accepted the Growth Analyst seat and answered your first capstone question.',
    icon: 'building-2',
    tier: 'silver',
    criterion: 'Answer a capstone question',
  },
  {
    id: 'capstone-half',
    name: 'Halfway There',
    description: 'Fifty of the hundred capstone questions, answered and defended.',
    icon: 'clipboard-list',
    tier: 'gold',
    criterion: 'Answer 50 capstone questions',
  },
  {
    id: 'capstone-complete',
    name: 'The Whole Business',
    description: 'All one hundred capstone questions. You can run analytics for a company now.',
    icon: 'trophy',
    tier: 'platinum',
    criterion: 'Answer all 100 capstone questions',
  },

  // ── Bonus / meta ──────────────────────────────────────────────────────────
  {
    id: 'flashcards-100',
    name: 'Spaced Out',
    description: 'A hundred flashcard reviews. Spaced repetition doing its quiet work.',
    icon: 'layers-2',
    tier: 'silver',
    criterion: 'Review 100 flashcards',
  },
  {
    id: 'note-taker',
    name: 'Margin Notes',
    description: 'You wrote your own notes on ten lessons.',
    icon: 'notebook-pen',
    tier: 'bronze',
    criterion: 'Write notes on 10 lessons',
  },
  {
    id: 'leaderboard-top-3',
    name: 'Podium',
    description: 'You finished a week in the top three of the leaderboard.',
    icon: 'medal',
    tier: 'gold',
    criterion: 'Finish a week in the top 3',
  },
];

const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]));

export function badgeById(id: string): Badge | undefined {
  return BADGE_BY_ID.get(id);
}

export function badgesByTier(tier: Badge['tier']): Badge[] {
  return BADGES.filter((b) => b.tier === tier);
}

export const BADGE_TIER_ORDER: Badge['tier'][] = ['bronze', 'silver', 'gold', 'platinum'];
