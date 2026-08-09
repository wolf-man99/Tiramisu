import type { MetaLesson } from '../types';
import { p, list, key } from '../types';

/** Module 6 — Reading & optimising: fatigue, top-down diagnosis, and knowing when to leave it alone. */
export const M6_LESSONS: MetaLesson[] = [
  // ─────────────────────────────────────────────────────────── Lesson 6.1 ──
  {
    slug: 'frequency-and-fatigue',
    moduleSlug: 'optimising',
    title: 'Frequency & creative fatigue',
    subtitle: 'Every ad has a shelf life',
    minutes: 9,
    xp: 70,
    objective: 'Spot creative fatigue early using frequency and rising CPMs, and act before it hurts.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'The same ad gets tired', art: 'fatigue-curve',
        blocks: [
          p('The more times a person sees the same ad, the less it works. **Frequency** (average times each person saw your ad) creeps up, novelty wears off, CTR falls, and — because engagement is an auction lever — your **CPMs rise**. That’s creative fatigue.'),
          p('Watch for the tell-tale pattern: **frequency climbing** + **CTR falling** + **CPA rising**, all on a steady audience. That trio means the creative is worn out, not that the audience is gone.'),
          key('Fatigue is a creative problem, not a budget problem. Throwing more budget at a tired ad just shows it to the same people *more* — accelerating the decline.'),
        ],
      },
      {
        kind: 'calc', id: 'calc1', variant: 'frequency', title: 'Check your frequency', blurb: 'Frequency = impressions ÷ reach. Push it past ~3× on a cold audience and watch the warning trip.' },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'On a fixed cold audience, over two weeks: frequency 1.4 → 4.2, CTR 2.1% → 0.9%, CPA up 60%. What’s happening?',
        options: [
          'The pixel broke',
          'Creative fatigue — the audience has seen the ad too many times',
          'Meta raised prices',
          'The offer got worse',
        ],
        answer: 1,
        explain: 'Rising frequency + falling CTR + rising CPA on the same audience is the textbook fatigue signature. The people have simply seen it too often. Refresh the creative or widen the audience.',
      },
      {
        kind: 'scenario', id: 'q2',
        situation: 'A winning ad’s results are sliding and frequency has hit 5×. The team’s instinct is to raise the budget to "push through." Good move?',
        options: [
          { label: 'Yes — more budget will recover sales', correct: false, feedback: 'More budget on a fatigued ad shows it to the same saturated audience even more. You’d speed up the decline and raise costs.' },
          { label: 'No — refresh the creative and/or expand the audience', correct: true, feedback: 'Right. Fatigue is fixed with new creative or a bigger/fresher audience, not more spend on the tired ad. Give people something new to see.' },
          { label: 'Lower the budget and wait', correct: false, feedback: 'Cutting budget slows the bleed but doesn’t fix the cause — the audience still needs fresh creative.' },
        ],
      },
      {
        kind: 'truefalse', id: 'q3',
        statement: 'A rising CPM on a steady audience and bid is often an early warning of creative fatigue.',
        isTrue: true,
        explain: 'True — rising CPM with no change to bid or audience usually means engagement (an auction quality signal) is slipping, an early fatigue warning. Treat CPM as a creative scoreboard, not just a media cost.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Keep a creative pipeline so you’re never caught out. When an ad’s frequency approaches ~3× on cold traffic, have the next batch ready to launch. Fatigue is inevitable; being unprepared for it isn’t.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 6.2 ──
  {
    slug: 'diagnose-top-down',
    moduleSlug: 'optimising',
    title: 'Diagnosing a losing campaign, top-down',
    subtitle: 'Find the broken link, not the symptom',
    minutes: 10,
    xp: 75,
    objective: 'Walk the metric chain from impression to purchase to locate the real problem.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Walk the chain in order', art: 'metrics-flow',
        blocks: [
          p('A bad CPA or ROAS is a *symptom*. The cause is always a weak link earlier in the chain. Diagnose top-down and you fix the real thing instead of guessing:'),
          list([
            '**CPM too high?** → an auction/relevance problem: creative, audience too narrow, or heavy overlap.',
            '**CPM fine, CTR low?** → the ad isn’t compelling: hook/creative/offer in the ad itself.',
            '**CTR fine, but few conversions (low CVR)?** → the problem is *after* the click: landing page, price, offer, or a broken checkout.',
            '**Everything fine but CPA still high?** → your margins/target may be off, or attribution is under-counting (check CAPI).',
          ]),
          key('Start at the top (CPM), move down (CTR → CVR), and stop at the first broken link. That’s the one to fix.'),
        ],
      },
      {
        kind: 'calc', id: 'calc1', variant: 'cpa', title: 'Compute a CPA', blurb: 'Cost per acquisition = spend ÷ conversions. Get comfortable turning raw spend and sales into the number you optimise against.' },
      {
        kind: 'scenario', id: 'q1',
        situation: 'CPA is double your target. You check: CPM normal, CTR healthy at 1.8%, but the landing page converts at 0.4% (industry norm ~2%). Where do you spend your effort?',
        options: [
          { label: 'Make new ad creative', correct: false, feedback: 'The ad is doing its job — CTR is healthy. Rebuilding creative won’t fix a page that fails to convert the clicks you’re already getting.' },
          { label: 'Fix the landing page / offer (the conversion step)', correct: true, feedback: 'Right. Good CPM + good CTR + terrible CVR isolates the break to *after the click*. Fix page speed, message match, price or checkout — not the ad.' },
          { label: 'Widen the audience', correct: false, feedback: 'Audience isn’t the issue — people are clicking. The leak is on the page.' },
        ],
      },
      {
        kind: 'mcq', id: 'q2',
        prompt: 'CPM is 3× the account average, but CTR and CVR are both fine. What’s the most likely culprit?',
        options: [
          'The landing page',
          'A too-narrow audience or heavy audience overlap inflating auction costs',
          'The checkout is broken',
          'The offer is bad',
        ],
        answer: 1,
        explain: 'Healthy CTR and CVR clear the creative and the page. A CPM way above average points to the auction itself — usually an audience that’s too small, or overlap making you bid against yourself.',
      },
      {
        kind: 'sort', id: 'q3',
        prompt: 'Order the diagnostic questions you should ask, first to last.',
        items: ['Is CPM (cost to be seen) reasonable?', 'Is CTR (is the ad compelling) healthy?', 'Is CVR (does the page convert) healthy?', 'Is CPA/ROAS acceptable vs target?'],
        explain: 'Follow the money down the funnel: seen (CPM) → clicked (CTR) → converted (CVR) → profitable (CPA/ROAS). The first "no" is your bottleneck.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Before blaming the ads, load the landing page on your own phone over cellular. Slow pages and clunky mobile checkouts quietly destroy CVR — and no amount of ad optimisation can rescue a page that takes 8 seconds to load.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 6.3 ──
  {
    slug: 'when-to-change-what',
    moduleSlug: 'optimising',
    title: 'What to change, and when to leave it alone',
    subtitle: 'The discipline of not fiddling',
    minutes: 8,
    xp: 65,
    objective: 'Avoid the reset trap: know which changes help and which just restart learning.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Every edit has a cost',
        blocks: [
          p('Beginners "optimise" by fiddling daily — nudging budgets, swapping audiences, tweaking copy. But significant edits **reset the learning phase**, throwing away the algorithm’s progress and restarting the erratic, expensive exploration period.'),
          p('The skill is knowing what genuinely needs a change versus what just needs to be *left alone* to finish learning.'),
          key('If it’s learning-limited or clearly losing over a fair sample → change it. If it’s working, or still learning → hands off. Restraint is an optimisation.'),
        ],
      },
      {
        kind: 'multi', id: 'q1',
        prompt: 'Which are good reasons to actually make a change? (Select all that apply.)',
        options: [
          'The ad set is stuck "Learning Limited" (can’t hit ~50 events)',
          'It’s day one and one ad is slightly ahead',
          'Frequency is high and the creative has clearly fatigued',
          'CVR shows the landing page is the bottleneck',
        ],
        answers: [0, 2, 3],
        explain: 'Learning-limited delivery, genuine fatigue, and a diagnosed page problem are real reasons to act. A day-one lead is noise — changing on it just resets learning for nothing.',
      },
      {
        kind: 'mcq', id: 'q2',
        prompt: 'You want to raise a well-performing ad set’s budget without wrecking its stable delivery. Best approach?',
        options: [
          'Double it overnight',
          'Increase gradually (~20% every few days) to avoid resetting learning',
          'Duplicate it 10 times',
          'Cut it in half first',
        ],
        answer: 1,
        explain: 'Large budget swings reset the learning phase and destabilise a good ad set. Gentle increases (~20% every couple of days) let it scale while staying out of learning. Patience keeps the winner winning.',
      },
      {
        kind: 'truefalse', id: 'q3',
        statement: 'Checking and tweaking your campaigns several times a day helps them perform better.',
        isTrue: false,
        explain: 'Usually the opposite. Constant edits reset learning and add noise. Set up well, then give the algorithm room and time. Good media buyers change *less* than beginners, not more.',
      },
      {
        kind: 'scenario', id: 'q4',
        situation: 'A profitable ad set is only two days old and still in "Learning." Its CPA today spiked. The client demands you "do something." What’s the right move?',
        options: [
          { label: 'Overhaul the audience and creative now', correct: false, feedback: 'It’s still learning — a daily CPA spike is expected noise. Overhauling resets the phase and throws away progress on a set that’s profitable overall.' },
          { label: 'Hold — it’s still learning; judge it after ~50 events / a few days', correct: true, feedback: 'Right. Learning-phase days swing wildly. If it’s profitable overall and hasn’t finished learning, the disciplined move is to wait and let it stabilise.' },
          { label: 'Pause it for the day', correct: false, feedback: 'Pausing and restarting also disrupts learning. A single noisy day in the learning phase isn’t a reason to intervene.' },
        ],
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Adopt a change budget: allow yourself one meaningful edit per ad set per few days, and log why. It forces you to act on evidence, not anxiety — and it keeps ad sets out of perpetual learning.',
      },
    ],
  },
];
