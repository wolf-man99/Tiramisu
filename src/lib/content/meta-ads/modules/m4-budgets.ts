import type { MetaLesson } from '../types';
import { p, list, key } from '../types';

/** Module 4 — Budgets & CBO: who controls the money, the learning phase, and allocation. */
export const M4_LESSONS: MetaLesson[] = [
  // ─────────────────────────────────────────────────────────── Lesson 4.1 ──
  {
    slug: 'abo-vs-cbo',
    moduleSlug: 'budgets-cbo',
    title: 'ABO vs CBO: who controls the money',
    subtitle: 'You set the budget, or Meta does',
    minutes: 9,
    xp: 70,
    objective: 'Choose between ad-set budgets and campaign budgets, and know when each wins.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Two places a budget can live', art: 'cbo',
        blocks: [
          p('You can put the budget in one of two places, and it changes who decides where the money goes:'),
          list([
            '**ABO (Ad-set Budget Optimization)** — you set a budget on *each ad set*. You control exactly how much each audience gets. Great for **testing**, because every test gets guaranteed spend.',
            '**CBO (Campaign Budget Optimization / "Advantage Campaign Budget")** — you set *one budget on the campaign*, and Meta flows it to whichever ad set is performing. Great for **scaling**, because the algorithm chases the winners.',
          ]),
          key('ABO = you decide the split (control). CBO = Meta decides the split (efficiency). Test with ABO, scale with CBO.'),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'You want to fairly test 4 new audiences and guarantee each gets enough spend to judge it. Which do you use?',
        options: ['CBO', 'ABO', 'It makes no difference', 'Neither — use a Lifetime budget'],
        answer: 1,
        explain: 'ABO gives each ad set its own guaranteed budget, so every audience gets a fair test. Under CBO, Meta would starve the ad sets it dislikes early — before you have a verdict.',
      },
      {
        kind: 'scenario', id: 'q2',
        situation: 'A marketer puts 5 brand-new audiences into one CBO campaign to "let Meta pick the winner." After two days, 90% of spend went to one ad set and the rest got almost nothing. Is that a bug?',
        options: [
          { label: 'Yes, CBO is broken', correct: false, feedback: 'It’s working exactly as designed — CBO concentrates spend on early front-runners.' },
          { label: 'No — that’s CBO doing its job, but it’s the wrong tool for *testing*', correct: true, feedback: 'Right. CBO chases early winners, so untested audiences get starved before you learn anything. For a fair test, use ABO; bring winners into CBO to scale.' },
          { label: 'The pixel is misfiring', correct: false, feedback: 'Nothing here points to measurement. This is CBO’s allocation behaviour, not a tracking issue.' },
        ],
      },
      {
        kind: 'truefalse', id: 'q3',
        statement: 'CBO always beats ABO, so you should use it for everything.',
        isTrue: false,
        explain: 'No single setting wins everywhere. CBO is superb for scaling proven ad sets, but it undermines clean testing because it won’t spend evenly. Match the tool to the job.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'A clean workflow: test in ABO → identify winners → rebuild the winners in a CBO campaign to scale. You get fair tests *and* algorithmic efficiency, instead of forcing one setting to do both jobs.',
      },
      {
        kind: 'teach', id: 'c2',
        blocks: [key('Budget placement is a control decision. Ask "do I need a fair test, or do I want Meta to chase winners?" — that answer picks ABO or CBO every time.')],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 4.2 ──
  {
    slug: 'the-learning-phase',
    moduleSlug: 'budgets-cbo',
    title: 'The learning phase & the 50-event rule',
    subtitle: 'Feed the algorithm or it never settles',
    minutes: 10,
    xp: 75,
    objective: 'Understand why ad sets need ~50 events/week and size budgets to reach it.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Every ad set starts by learning', art: 'learning-phase',
        blocks: [
          p('When you launch or significantly edit an ad set, it enters the **learning phase**. Meta is exploring — trying different people and placements to find who converts. Costs are erratic and results are unreliable during this time.'),
          p('The ad set *exits* learning once it collects roughly **50 optimisation events in a 7-day window**. After that, delivery stabilises and costs usually improve.'),
          key('Fewer than ~50 events/week and the ad set is stuck in "Learning Limited" — permanently unstable, permanently more expensive.'),
        ],
      },
      {
        kind: 'calc', id: 'calc1', variant: 'learning-budget', title: 'Size the budget to exit learning', blurb: 'Enter your target cost per conversion. This is the weekly budget an ad set needs to reach ~50 events and stabilise.' },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'Your target CPA is $40 and you optimise for Purchase. Roughly what daily budget does *one* ad set need to exit the learning phase?',
        options: ['~$40/day', '~$285/day', '~$100/day', '~$15/day'],
        answer: 1,
        explain: '50 events × $40 = $2,000/week ÷ 7 ≈ $285/day. Below that, the ad set can’t gather 50 conversions a week and stays learning-limited.',
      },
      {
        kind: 'teach', id: 'c2', title: 'The two ways to escape "Learning Limited"',
        blocks: [
          p('If an ad set can’t hit 50 events on your budget, you have two real fixes:'),
          list([
            '**Consolidate.** Fewer ad sets, each with a bigger share of the budget, so each one clears 50 events. Ten starving ad sets < three well-fed ones.',
            '**Optimise for a cheaper, more frequent event.** If Purchases are too rare, optimise for Add to Cart (which happens far more often) until volume grows, then move deeper.',
          ]),
          p('What *doesn’t* work: editing constantly. Every meaningful edit **resets** the learning phase and burns your progress.'),
        ],
      },
      {
        kind: 'multi', id: 'q2',
        prompt: 'Which actions typically RESET an ad set’s learning phase? (Select all that apply.)',
        options: [
          'Changing the audience or optimisation event',
          'A large budget change',
          'Swapping the creative',
          'Letting it run untouched over the weekend',
        ],
        answers: [0, 1, 2],
        explain: 'Significant edits — audience, optimisation, big budget swings, new creative — reset learning. Leaving it alone is exactly what lets it *finish* learning. Patience is a setting.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Don’t judge an ad set while it’s still in "Learning." Give it ~50 events (or 3–4 days) before you read the numbers. Killing ads on day one is how beginners strangle campaigns that were about to stabilise.',
      },
      {
        kind: 'scenario', id: 'q3',
        situation: 'A small account has eight ad sets, each spending $15/day, all stuck in "Learning Limited." The owner wants to add *more* ad sets to find a winner. Better advice?',
        options: [
          { label: 'Add more ad sets to test faster', correct: false, feedback: 'That splits the budget even thinner — every ad set gets further from 50 events. You’d make the problem worse.' },
          { label: 'Consolidate into 2–3 ad sets so each can clear 50 events', correct: true, feedback: 'Right. Concentrating the same budget into fewer ad sets lets each one exit learning and stabilise. Depth beats breadth on a small budget.' },
          { label: 'Raise the CPA target', correct: false, feedback: 'Changing the target doesn’t create the event volume needed — and it just lets in worse conversions.' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 4.3 ──
  {
    slug: 'budget-allocation',
    moduleSlug: 'budgets-cbo',
    title: 'Allocating budget across the funnel',
    subtitle: 'Where the next dollar should go',
    minutes: 8,
    xp: 65,
    objective: 'Split budget between prospecting and retargeting without starving growth.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Most of the money buys new customers',
        blocks: [
          p('Retargeting has the highest ROAS, so beginners pour budget into it — then wonder why they can’t grow. The catch: retargeting only reaches people who *already* engaged. That pool is small and finite. Spend too much there and you just hammer the same people.'),
          p('A common healthy starting split for a growing account:'),
          list([
            '**~70% prospecting (cold).** This *fills* the funnel — it creates the audience everything else depends on.',
            '**~30% retargeting (warm).** This *closes* the people prospecting warmed up.',
          ]),
          key('Prospecting creates demand; retargeting harvests it. Cut prospecting to chase ROAS and the whole funnel dries up within weeks.'),
        ],
      },
      {
        kind: 'calc', id: 'calc1', variant: 'budget-split', title: 'Split a monthly budget', blurb: 'A 70/30 prospecting-to-retargeting split. Adjust the budget and see where the money goes.' },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'A brand shifts 90% of budget to retargeting because it shows the best ROAS. A month later, total sales have dropped. Why?',
        options: [
          'Retargeting stopped working',
          'They starved prospecting, so the warm audience stopped being replenished',
          'ROAS is a fake metric',
          'They needed a bigger retargeting budget',
        ],
        answer: 1,
        explain: 'Retargeting’s high ROAS is real but its audience is tiny. Without prospecting to keep filling the top of the funnel, there’s no one new to retarget — so volume collapses even as ROAS looks great.',
      },
      {
        kind: 'truefalse', id: 'q2',
        statement: 'Because retargeting has the highest ROAS, you should always put most of your budget there.',
        isTrue: false,
        explain: 'False. Retargeting’s ROAS is high *because* the audience is pre-warmed and small. It can’t scale a business alone — prospecting is what creates the audience retargeting later converts.',
      },
      {
        kind: 'scenario', id: 'q3',
        situation: 'You have $5,000/month and a mature account. Blended ROAS is healthy but flat month over month. What lever most likely unlocks growth?',
        options: [
          { label: 'Move more budget into retargeting', correct: false, feedback: 'The warm pool is already being harvested — more retargeting budget just raises frequency, not sales.' },
          { label: 'Increase prospecting to expand the top of the funnel', correct: true, feedback: 'Right. Flat growth on healthy ROAS usually means you’re capped on *new* audience. More prospecting widens the funnel so retargeting has more people to convert.' },
          { label: 'Pause everything and rebuild', correct: false, feedback: 'Throwing away a healthy account is drastic. The diagnosis points to a specific lever — top-of-funnel reach.' },
        ],
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Judge prospecting on *blended* ROAS (total revenue ÷ total spend), not its in-platform ROAS. Cold campaigns look worse in isolation because the sale often gets attributed to the retargeting touch that closed it. The two work as a system.',
      },
    ],
  },
];
