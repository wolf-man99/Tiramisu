import type { MetaLesson } from '../types';
import { p, list, key } from '../types';

/** Module 7, Scaling: grow spend without breaking the economics or the learning phase. */
export const M7_LESSONS: MetaLesson[] = [
  // ─────────────────────────────────────────────────────────── Lesson 7.1 ──
  {
    slug: 'horizontal-vs-vertical',
    moduleSlug: 'scaling',
    title: 'Horizontal vs vertical scaling',
    subtitle: 'Two ways to spend more',
    minutes: 9,
    xp: 70,
    objective: 'Understand the two directions of scale and the trade-off each makes.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Once you have a winner, you can grow two ways', art: 'scaling-paths',
        blocks: [
          p('Scaling means spending more *without* wrecking your ROAS. There are exactly two directions:'),
          list([
            '**Vertical**, raise the budget on a proven ad set. Fast and simple, but big jumps reset the learning phase and can push you into worse-converting audiences.',
            '**Horizontal**. Keep budgets stable and *add* new ad sets: new audiences, new lookalikes, new creatives. Slower and more to manage, but far more stable.',
          ]),
          key('Vertical scales *depth* (more money, same target). Horizontal scales *breadth* (new targets, same money each). Mature accounts lean horizontal and use gentle vertical on the very best sets.'),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'You want to grow spend while keeping delivery stable and ROAS intact. Which approach is generally safer?',
        options: [
          'Vertical, double the budget on your winner tonight',
          'Horizontal. Add new audiences/creatives at stable budgets',
          'Pause and rebuild everything',
          'Narrow the audience',
        ],
        answer: 1,
        explain: 'Horizontal scaling adds new stable ad sets rather than shocking a proven one with a big budget jump. It avoids resetting learning and spreads risk across more audiences.',
      },
      {
        kind: 'truefalse', id: 'q2',
        statement: 'Doubling a winning ad set’s budget overnight is a reliable way to scale.',
        isTrue: false,
        explain: 'No. A sudden large budget jump resets the learning phase and often forces delivery into pricier, worse-converting inventory. Scale vertically in small steps, or scale horizontally instead.',
      },
      {
        kind: 'scenario', id: 'q3',
        situation: 'A single ad set is crushing it at $50/day. The client wants to hit $500/day this week. What’s the least risky path?',
        options: [
          { label: 'Set that ad set to $500/day now', correct: false, feedback: 'A 10× overnight jump obliterates learning and usually tanks ROAS as delivery chases expensive impressions.' },
          { label: 'Raise it gradually and duplicate the winner into new audiences (horizontal)', correct: true, feedback: 'Right. Combine gentle vertical steps (~20% every few days) with horizontal expansion, the same winning creative into fresh lookalikes and interests, to add spend without a shock.' },
          { label: 'Clone it 10 times at $50 each targeting the identical audience', correct: false, feedback: 'Ten clones on the *same* audience just overlap and bid against each other, inflating your own CPMs. Expand to *new* audiences instead.' },
        ],
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'When you scale horizontally, exclude overlapping audiences from each other. Ten new ad sets fighting over the same people isn’t scale, it’s you outbidding yourself and driving your own costs up.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 7.2 ──
  {
    slug: 'duplicate-or-raise',
    moduleSlug: 'scaling',
    title: 'Duplicate or raise the budget?',
    subtitle: 'The scaler’s daily decision',
    minutes: 8,
    xp: 65,
    objective: 'Decide between nudging a budget up and duplicating an ad set, and avoid overlap traps.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Two tools, two situations',
        blocks: [
          p('When a winner is ready to scale, you reach for one of two moves:'),
          list([
            '**Raise the existing budget (gently).** Best when the ad set is stable and not yet saturated. Nudge ~20% every few days so you don’t reset learning.',
            '**Duplicate into a *new* audience.** Best when the current audience is getting saturated (frequency rising). A fresh audience gives the winning creative new people to reach.',
          ]),
          key('Raise the budget to get *more* out of the *same* audience. Duplicate to reach a *new* audience. Duplicating onto the *same* audience just creates overlap.'),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'A winning ad set is stable, frequency is still low (1.6×), and it’s nowhere near saturating its audience. How do you scale it?',
        options: [
          'Duplicate it 5× onto the same audience',
          'Gradually raise its budget (~20% every few days)',
          'Leave it and start a brand-new campaign',
          'Cut the budget to "reset" it',
        ],
        answer: 1,
        explain: 'Low frequency means there’s room in the current audience. Gently raising the budget captures more of that audience without the overlap you’d create by duplicating onto the same people.',
      },
      {
        kind: 'scenario', id: 'q2',
        situation: 'A media buyer duplicates the winning ad set 4 times onto the *same* lookalike to "multiply" spend. CPMs climb across all of them. What happened?',
        options: [
          { label: 'Meta penalised the duplicates', correct: false, feedback: 'No penalty. This is auction mechanics. The copies target the same people and compete in the same auctions.' },
          { label: 'The copies overlap and bid against each other, raising CPMs', correct: true, feedback: 'Right. Duplicating onto the identical audience makes your own ad sets compete for the same impressions, you inflate your own prices. Duplicate onto *new* audiences instead.' },
          { label: 'The creative fatigued instantly', correct: false, feedback: 'Fatigue builds over time; this cost jump is immediate and comes from self-overlap, not fatigue.' },
        ],
      },
      {
        kind: 'truefalse', id: 'q3',
        statement: 'Duplicating a winning ad set onto the same audience multiplies your results.',
        isTrue: false,
        explain: 'It multiplies your *competition with yourself*. Copies on the same audience overlap and bid against each other. To actually multiply reach, duplicate onto new, non-overlapping audiences.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Think of "duplicate" as "clone the winning *creative* into a new *audience*," never "clone the whole thing onto the same people." The creative is the asset worth copying; the audience should always be fresh.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 7.3 ──
  {
    slug: 'scaling-without-breaking',
    moduleSlug: 'scaling',
    title: 'Scaling without breaking ROAS',
    subtitle: 'Grow spend, keep the economics',
    minutes: 10,
    xp: 80,
    objective: 'Hold profitability while scaling by watching break-even ROAS and feeding the creative pipeline.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'ROAS usually dips as you scale - plan for it',
        blocks: [
          p('As you spend more, you reach beyond your best, cheapest audiences into broader, pricier ones. So a *small* ROAS dip while scaling is normal and often fine, as long as you stay above **break-even ROAS**. The mistake is scaling until you’re unknowingly losing money on every extra dollar.'),
          key('The real target isn’t "keep ROAS at 4×." It’s "spend as much as possible while staying profitably above break-even ROAS." Volume at a healthy margin beats a beautiful ROAS on tiny spend.'),
        ],
      },
      {
        kind: 'calc', id: 'calc1', variant: 'breakeven-roas', title: 'Know your floor before you scale', blurb: 'Enter your margin. As long as your scaled ROAS stays above this line, more spend means more profit. Even if the ROAS number drops.' },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'Scaling drops your ROAS from 4.0× to 2.8×. Your product margin is 50% (break-even ROAS = 2.0×). Are you still making money on the extra spend?',
        options: [
          'No - ROAS fell, so stop scaling',
          'Yes: 2.8× is still above the 2.0× break-even, so each extra dollar profits',
          'Only if ROAS stays above 4.0×',
          'Impossible to tell',
        ],
        answer: 1,
        explain: 'Break-even is 1 ÷ 0.5 = 2.0×. At 2.8× you’re comfortably above it, so the additional spend is still profitable. A lower ROAS at much higher volume can mean far more total profit.',
      },
      {
        kind: 'teach', id: 'c2', title: 'What actually lets you scale',
        blocks: [
          p('Sustained scaling rests on two engines running in the background:'),
          list([
            '**A creative pipeline.** New winners constantly replace fatiguing ones. Without fresh creative, frequency climbs and ROAS falls no matter how you structure budgets.',
            '**Audience expansion.** Broader interests, new lookalikes and new geos keep giving the algorithm fresh people so you’re not just re-hitting a saturated pool.',
          ]),
          p('Structure (CBO, gentle increases, exclusions) keeps you stable, but creative and fresh audiences are what let you actually get *bigger*.'),
        ],
      },
      {
        kind: 'multi', id: 'q2',
        prompt: 'Which are sustainable ways to keep scaling profitably? (Select all that apply.)',
        options: [
          'A steady pipeline of fresh creative to beat fatigue',
          'Expanding into new audiences, lookalikes and geos',
          'Judging spend against break-even ROAS, not a fixed ROAS number',
          'Doubling every ad set’s budget every night',
        ],
        answers: [0, 1, 2],
        explain: 'Fresh creative, new audiences, and scaling against break-even ROAS are the durable levers. Doubling budgets nightly just resets learning and destabilises delivery, the opposite of sustainable.',
      },
      {
        kind: 'scenario', id: 'q3',
        situation: 'You’ve scaled to $2k/day at a healthy, above-break-even ROAS, but growth has stalled and frequency is creeping up across the account. What’s the highest-leverage next move?',
        options: [
          { label: 'Keep raising budgets on the same ad sets', correct: false, feedback: 'Rising frequency says the current audiences are saturating, more budget on them just re-shows the same ads and pushes ROAS down.' },
          { label: 'Ship new creative and open new audiences to refresh the pool', correct: true, feedback: 'Right. Stalled growth + creeping frequency means you’ve tapped the current pool. Fresh creative and new audiences give the algorithm new people to convert, reopening headroom to scale.' },
          { label: 'Cut spend to protect ROAS', correct: false, feedback: 'That protects a vanity number while shrinking the business. The goal is profitable *volume*, which needs new creative and audiences, not retreat.' },
        ],
      },
      {
        kind: 'teach', id: 'c3',
        blocks: [key('You’ve completed the arc: structure → auction → measurement → audiences → creative → budgets → testing → optimisation → scale. Run ads like a system, feed it fresh creative, and grow spend while staying above break-even. That’s the whole game.')],
      },
    ],
  },
];
