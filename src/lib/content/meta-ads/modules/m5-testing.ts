import type { MetaLesson } from '../types';
import { p, list, key } from '../types';

/** Module 5: The testing method: isolate variables, pick the right test, call it honestly. */
export const M5_LESSONS: MetaLesson[] = [
  // ─────────────────────────────────────────────────────────── Lesson 5.1 ──
  {
    slug: 'isolate-one-variable',
    moduleSlug: 'testing',
    title: 'Test one thing at a time',
    subtitle: 'A clean test has one variable',
    minutes: 8,
    xp: 65,
    objective: 'Design tests that produce a clear winner by changing exactly one thing.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Change one variable, or learn nothing', art: 'testing-matrix',
        blocks: [
          p('The whole point of a test is to learn *what* caused a result. If you change the creative **and** the audience **and** the budget at once and results improve. You have no idea which change did it. You can’t repeat it, and you can’t scale it.'),
          p('A clean test holds everything constant except the **one variable** you’re measuring:'),
          list([
            'Same audience, same budget, same placements → test **Creative A vs B**.',
            'Same creative, same budget → test **Audience 1 vs 2**.',
            'Same everything → test **Hook A vs B**.',
          ]),
          key('One variable per test. The winner is only meaningful if it’s the *only* thing that differed.'),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'You launch two ad sets: A = (lookalike audience + video ad), B = (interest audience + image ad). B wins. What did you learn?',
        options: [
          'The interest audience is better',
          'The image ad is better',
          'Almost nothing, two variables changed at once',
          'CBO is working',
        ],
        answer: 2,
        explain: 'Both the audience *and* the creative differ, so you can’t attribute B’s win to either one. To learn, hold the audience constant and test creative, or hold creative constant and test audience.',
      },
      {
        kind: 'scenario', id: 'q2',
        situation: 'A client wants to "test everything at once to move fast", 3 audiences × 3 creatives × 2 offers in one campaign. What’s the risk?',
        options: [
          { label: 'None - more variety is always better', correct: false, feedback: 'Speed without isolation isn’t learning. You’ll get a jumble of results you can’t attribute or repeat.' },
          { label: 'Confounded results and starved ad sets: you won’t know what won or why', correct: true, feedback: 'Right. 18 combinations split the budget into fragments (all learning-limited) and tangle the variables. Test in stages: nail the creative, then the audience, then the offer.' },
          { label: 'It will definitely fail to spend', correct: false, feedback: 'It may spend fine. The real problem is the results are uninterpretable and each cell is under-funded.' },
        ],
      },
      {
        kind: 'sort', id: 'q3',
        prompt: 'Order a sensible testing sequence for a new account, first to last.',
        items: ['Test creatives (biggest lever) on a broad audience', 'Test audiences with the winning creative', 'Test offers / landing pages', 'Scale the winning combination'],
        explain: 'Creative is the biggest lever, so test it first on a broad audience. Then find the best audience for the winning ad, then refine the offer, then scale what won. Isolate at each stage.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Give each test enough budget and time to reach significance *before* you change anything. The most common testing mistake isn’t the design: it’s calling the result on day one, on 6 conversions.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 5.2 ──
  {
    slug: 'abtest-vs-dynamic-creative',
    moduleSlug: 'testing',
    title: 'A/B tests vs Dynamic Creative',
    subtitle: 'Two tools, two jobs',
    minutes: 9,
    xp: 70,
    objective: 'Pick the right testing mechanism: a clean split test or a combination-finder.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Three ways Meta lets you test',
        blocks: [
          list([
            '**A/B Test (the official split test)**: Meta splits the audience into non-overlapping halves so each variant gets a fair, unbiased slice. This is the *clean* way to answer "does A beat B?"',
            '**Dynamic Creative (DCT)**: you feed in several images, headlines and texts; Meta mixes and matches and pushes the best-performing combos. Great for *discovering* which elements resonate, less clean for a strict A-vs-B verdict.',
            '**Manual ad sets**, duplicating ad sets and eyeballing results. Fast, but audience overlap can bias the outcome.',
          ]),
          key('A/B Test answers "which is better?" with statistical rigour. Dynamic Creative answers "which elements should I use more of?" Use the tool that matches the question.'),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'You need a rigorous, unbiased answer to "does headline A beat headline B?" for a big budget decision. Which tool?',
        options: ['Dynamic Creative', 'Meta’s A/B Test (split test)', 'Just duplicate the ad set', 'Boost the post'],
        answer: 1,
        explain: 'The official A/B Test splits the audience so the two variants never compete for the same people. That removes overlap bias and gives you a trustworthy verdict for a high-stakes call.',
      },
      {
        kind: 'truefalse', id: 'q2',
        statement: 'Duplicating an ad set to run "A" and "B" side by side gives you a perfectly clean test.',
        isTrue: false,
        explain: 'Not quite. Duplicated ad sets can target overlapping people and bid against each other, biasing delivery toward one. The A/B Test tool exists precisely to split the audience and remove that bias.',
      },
      {
        kind: 'scenario', id: 'q3',
        situation: 'You have 6 headlines, 4 images and 3 primary texts and want to quickly learn which *elements* perform best before committing. Best mechanism?',
        options: [
          { label: 'Run 72 separate ad sets', correct: false, feedback: 'That’s an unmanageable, budget-splitting nightmare. Every cell would be learning-limited.' },
          { label: 'Dynamic Creative - let Meta mix elements and surface winners', correct: true, feedback: 'Right. DCT is built to explore many combinations and reveal which images/headlines/texts pull their weight, so you can then build clean ads from the winners.' },
          { label: 'A single A/B test of two full ads', correct: false, feedback: 'A/B testing two finished ads is great for a verdict, but it won’t tell you which *elements* across many options are working.' },
        ],
      },
      {
        kind: 'multi', id: 'q4',
        prompt: 'When is Meta’s official A/B Test the right choice? (Select all that apply.)',
        options: [
          'You need an unbiased head-to-head between two variants',
          'The decision is high-stakes and you want statistical confidence',
          'You want to explore dozens of element combinations at once',
          'You’re comparing two audiences fairly, without overlap',
        ],
        answers: [0, 1, 3],
        explain: 'A/B Test shines for clean, unbiased head-to-heads and audience comparisons where you need confidence. Exploring dozens of combinations is Dynamic Creative’s job, not a split test’s.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Use them together: Dynamic Creative to *discover* the strongest elements, then an A/B Test to *confirm* the winning ad against your current champion before you scale spend behind it.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 5.3 ──
  {
    slug: 'reading-a-test',
    moduleSlug: 'testing',
    title: 'Calling a test: significance & patience',
    subtitle: 'Don’t trust small numbers',
    minutes: 9,
    xp: 70,
    objective: 'Know when a result is real versus noise, and resist calling tests too early.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Small samples lie',
        blocks: [
          p('On day one, Ad A has 3 sales and Ad B has 1. A is "300% better!", except that’s **noise**. With that few conversions, the gap is well within random chance. Flip four coins twice and you’ll get different results too.'),
          p('A result is trustworthy only when you have enough **conversions** (not clicks, not impressions) behind each variant, over enough time to smooth out daily swings.'),
          key('Judge tests on *conversions*, and give each variant a meaningful number of them, a rough floor is ~50 per variant, before you believe the winner.'),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'After 1 day: Ad A = 4 purchases, Ad B = 2 purchases. Your teammate says "kill B, A is 2× better." Best response?',
        options: [
          'Agree - 2× is a clear win',
          'Wait - 6 total conversions is far too few to be significant',
          'Kill both and start over',
          'Double A’s budget immediately',
        ],
        answer: 1,
        explain: 'Six conversions total is noise. A 4-vs-2 split could easily flip tomorrow. Let each variant gather enough conversions over several days before declaring anything.',
      },
      {
        kind: 'truefalse', id: 'q2',
        statement: 'A 300% difference in ROAS after a handful of conversions is strong evidence one ad is better.',
        isTrue: false,
        explain: 'A huge percentage on a tiny sample is exactly when to be *most* skeptical, small numbers produce dramatic percentages by chance. Significance comes from volume, not from the size of the gap.',
      },
      {
        kind: 'scenario', id: 'q3',
        situation: 'A test has run 5 days. Ad A: 68 conversions at $22 CPA. Ad B: 71 conversions at $38 CPA. What’s the call?',
        options: [
          { label: 'Too close to call - keep waiting', correct: false, feedback: 'The sample is now healthy (~70 conversions each) and the CPA gap is large and consistent. Waiting just wastes spend on the loser.' },
          { label: 'A wins - enough conversions, and a large, stable CPA gap', correct: true, feedback: 'Right. With ~70 conversions per side and a $22 vs $38 CPA gap that held over 5 days, this is a real result. Scale A, cut B.' },
          { label: 'B wins - it had more conversions', correct: false, feedback: 'B got more conversions only because it likely spent more, its *efficiency* (CPA) is far worse. Judge on cost per result, not raw count.' },
        ],
      },
      {
        kind: 'sort', id: 'q4',
        prompt: 'Order these from least to most trustworthy as a basis for calling a winner.',
        items: ['Impressions', 'Clicks', 'A handful of conversions', 'Enough conversions over several days'],
        explain: 'Impressions and clicks are the cheapest, noisiest signals; a few conversions is better but still shaky; a solid conversion count over several days is what actually earns a verdict.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Decide your "call it" threshold *before* you launch, e.g. "50 conversions per variant or 5 days, whichever comes first." Pre-committing stops you from cherry-picking the moment your favourite ad happens to be ahead.',
      },
    ],
  },
];
