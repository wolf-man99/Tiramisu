import type { MetaLesson } from '../types';
import { p, list, key } from '../types';

/** Module 1: Foundations: structure, the auction, objectives, and the metrics that matter. */
export const M1_LESSONS: MetaLesson[] = [
  // ─────────────────────────────────────────────────────────── Lesson 1.1 ──
  {
    slug: 'account-structure',
    moduleSlug: 'foundations',
    title: 'The three levels of every campaign',
    subtitle: 'Campaign → Ad Set → Ad',
    minutes: 8,
    xp: 60,
    objective: 'Understand how Meta organises ads, and what decision lives at each level.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Everything is three levels deep', art: 'campaign-structure',
        blocks: [
          p('Every ad you run on Facebook and Instagram lives inside the same three-level structure. Learn it once and the whole platform stops feeling random.'),
          list([
            '**Campaign**, you pick the *goal* (what a good outcome is).',
            '**Ad Set**: you pick the *who, where, when and how much* (audience, placements, budget, schedule).',
            '**Ad**: you pick the *creative* (the image, video, copy and link people actually see).',
          ]),
          key('One campaign can hold many ad sets; one ad set can hold many ads. Decisions flow downward, the campaign goal shapes how the ad sets spend.'),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'You want to test two different audiences with the same video. Where does the audience live?',
        options: ['At the Campaign level', 'At the Ad Set level', 'At the Ad level', 'It doesn’t matter'],
        answer: 1,
        explain: 'Audience, budget, placements and schedule all live at the Ad Set level. Two audiences = two ad sets, each holding the same ad.',
      },
      {
        kind: 'teach', id: 'c2', title: 'Business Manager sits above it all',
        blocks: [
          p('Before campaigns, there’s **Business Manager** (now "Meta Business Suite / Settings"): the container that owns your assets: the ad account that pays for ads, the Facebook Page and Instagram account the ads run from, the pixel that measures results, and the people who have access.'),
          p('Set this up once, cleanly, and you never fight permissions again. Skip it and you’ll lose access to your own pixel the day a freelancer leaves.'),
        ],
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Always create the pixel and Page inside Business Manager, not your personal profile. Assets owned by a person walk out the door with that person; assets owned by the Business stay.',
      },
      {
        kind: 'sort', id: 'q2',
        prompt: 'Put these in order, from the broadest container to the most specific.',
        items: ['Business Manager', 'Ad account', 'Campaign', 'Ad set', 'Ad'],
        explain: 'Business Manager owns the ad account; the ad account holds campaigns; campaigns hold ad sets; ad sets hold ads. Money and goals flow down the chain.',
      },
      {
        kind: 'scenario', id: 'q3',
        situation: 'A client says: "Just duplicate the winning ad but send it to a lookalike audience instead of retargeting." What do you duplicate?',
        options: [
          { label: 'Duplicate the whole campaign', correct: false, feedback: 'Overkill: you’d copy the goal and every other ad set too, and split your budget.' },
          { label: 'Duplicate the ad set, then swap its audience', correct: true, feedback: 'Exactly. The audience lives on the ad set, so you copy that ad set (which carries the ad) and change only the audience.' },
          { label: 'Duplicate just the ad', correct: false, feedback: 'An ad has no audience of its own, it inherits the ad set’s. You’d have nowhere to set the lookalike.' },
        ],
      },
      {
        kind: 'teach', id: 'c3', title: 'You now own the map',
        blocks: [
          key('Campaign = goal. Ad set = who/where/budget. Ad = creative. Every setting in Ads Manager belongs to exactly one of these three levels, and knowing which is half of running ads well.'),
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 1.2 ──
  {
    slug: 'the-auction',
    moduleSlug: 'foundations',
    title: 'The auction: why the highest bid rarely wins',
    subtitle: 'Total Value, not top dollar',
    minutes: 9,
    xp: 70,
    objective: 'Understand how Meta actually chooses which ad to show, and why creative is a bidding lever.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Every impression is an auction', art: 'auction',
        blocks: [
          p('When someone opens Instagram, Meta runs a lightning-fast auction for the ad slot on their screen. Thousands of advertisers "compete", but the winner is almost never the one bidding the most money.'),
          p('Meta picks the ad with the highest **Total Value**, and Total Value has three parts:'),
          list([
            '**Bid**, how much you’re willing to pay for the outcome.',
            '**Estimated action rate**: how likely *this* person is to do the thing you want (click, buy, sign up).',
            '**Ad quality**: signals of relevance and experience: engagement, feedback, how "adverty" and low-quality it feels.',
          ]),
          key('Total Value ≈ Bid × Estimated action rate + Ad quality. Great creative raises the last two. So it effectively lets you win the auction while bidding *less*.'),
        ],
      },
      {
        kind: 'truefalse', id: 'q1',
        statement: 'If you simply raise your bid high enough, your ad will always win the impression.',
        isTrue: false,
        explain: 'No. A relevant, engaging ad with a high estimated action rate can beat a higher bid with a weak, low-quality creative. Money is only one of three factors.',
      },
      {
        kind: 'teach', id: 'c2', title: 'This is why "creative is the new targeting"',
        blocks: [
          p('Because estimated action rate and ad quality are two of the three levers, a thumb-stopping ad is a *discount* on your cost. Better creative → higher Total Value → you win more auctions at a lower effective price → lower CPMs and CPAs.'),
          p('It’s also why two advertisers with the same budget and audience can get wildly different results. The one with better creative is quietly winning cheaper auctions all day.'),
        ],
      },
      {
        kind: 'mcq', id: 'q2',
        prompt: 'Your CPMs (cost per 1,000 impressions) suddenly jump 40% with no change to bid or audience. What’s the most likely lever that slipped?',
        options: [
          'Meta raised its prices overnight',
          'Ad quality / engagement dropped, likely creative fatigue',
          'You need to bid manually',
          'The pixel broke',
        ],
        answer: 1,
        explain: 'When bid and audience are constant, rising CPMs usually mean your Total Value fell, most often because the creative got stale and engagement (ad quality / action rate) dropped.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Treat CPM as a scoreboard for your creative and relevance, not just a media cost. Rising CPM on a steady audience is an early warning that your ads need refreshing.',
      },
      {
        kind: 'scenario', id: 'q3',
        situation: 'Two ad sets target the same audience. A bids $8, B bids $5. B is getting more of the impressions. Your teammate says "bump A’s bid." Better move?',
        options: [
          { label: 'Yes - raise A’s bid to $12', correct: false, feedback: 'You can force volume by overpaying, but you’re treating the symptom. If B wins at $5, B has higher Total Value.' },
          { label: 'Look at A’s creative and engagement first', correct: true, feedback: 'Right. B is likely winning on estimated action rate + ad quality. Fixing A’s creative wins auctions cheaply; raising the bid just pays more for a weak ad.' },
          { label: 'Pause A entirely', correct: false, feedback: 'Premature, you haven’t diagnosed *why* A is losing. It may just need a better hook.' },
        ],
      },
      {
        kind: 'teach', id: 'c3',
        blocks: [key('You don’t out-*spend* the auction, you out-*create* it. Bid buys you a seat; creative and relevance decide whether you win, and at what price.')],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 1.3 ──
  {
    slug: 'objectives',
    moduleSlug: 'foundations',
    title: 'Objectives: tell Meta exactly what you want',
    subtitle: 'Optimise for the outcome, not the vanity metric',
    minutes: 8,
    xp: 60,
    objective: 'Pick the campaign objective that makes Meta’s algorithm hunt for the right people.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'The objective is a hunting instruction',
        blocks: [
          p('Your campaign objective tells Meta’s machine learning who to go find. Choose "Traffic" and it finds people who *click*. Choose "Sales" and it finds people who *buy*. These are very different people.'),
          p('The six current objectives (Outcome-Driven Ad Experiences) map to funnel stages:'),
          list([
            '**Awareness**, reach the most people / maximise impressions cheaply.',
            '**Traffic**. Send clicks to a destination.',
            '**Engagement**: messages, video views, post engagement.',
            '**Leads**: form fills, sign-ups (on-platform or on your site).',
            '**App promotion**, installs and in-app events.',
            '**Sales**, purchases and high-intent conversions.',
          ]),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'You run an e-commerce store and want purchases. A friend says "use Traffic. It gets way more clicks for the money." Why is that usually bad advice?',
        options: [
          'Traffic is more expensive',
          'Meta will find cheap *clickers*, not *buyers*: cheap traffic, few sales',
          'Traffic objective disables the pixel',
          'It’s fine, always use Traffic',
        ],
        answer: 1,
        explain: 'Optimising for Traffic tells Meta to find people likely to click, not buy. You’ll get a great CTR and a terrible conversion rate. Optimise for the *actual* outcome, Sales.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Optimise for the deepest event you have enough volume for. Meta’s algorithm needs roughly 50 conversion events per ad set per week to exit the "learning phase" and stabilise. Too few purchases? Optimise for Add to Cart temporarily, then move down the funnel as volume grows.',
      },
      {
        kind: 'scenario', id: 'q2',
        situation: 'A new store gets ~10 purchases a week total. Which optimisation gets the algorithm enough signal to learn?',
        options: [
          { label: 'Optimise for Purchase anyway', correct: false, feedback: '10/week is far below the ~50 events an ad set needs. The algorithm stays stuck in the learning phase, spending erratically.' },
          { label: 'Optimise for a higher-funnel event like Add to Cart, for now', correct: true, feedback: 'Smart. A more frequent event gives the algorithm signal to learn on. As volume grows, move the optimisation down toward Purchase.' },
          { label: 'Optimise for Reach to save money', correct: false, feedback: 'Reach finds eyeballs, not buyers, you’d get impressions and almost no sales.' },
        ],
      },
      {
        kind: 'truefalse', id: 'q3',
        statement: 'A high click-through rate always means the campaign is succeeding.',
        isTrue: false,
        explain: 'CTR is a signal, not the goal. Clicks that don’t convert are just expensive curiosity. Judge a campaign by the objective you actually care about (leads, sales), not the vanity metric.',
      },
      {
        kind: 'teach', id: 'c2',
        blocks: [key('Meta optimises *literally* for what you ask. Ask for the real business outcome, and give the algorithm enough of that event to learn from.')],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 1.4 ──
  {
    slug: 'the-funnel-and-metrics',
    moduleSlug: 'foundations',
    title: 'The funnel & the metrics that matter',
    subtitle: 'CPM, CTR, CPA, ROAS, and how they connect',
    minutes: 11,
    xp: 80,
    objective: 'Read the core metrics as a chain, and know which one to look at when.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'The metrics are a chain', art: 'metrics-flow',
        blocks: [
          p('Money enters at the top as impressions and (hopefully) exits at the bottom as revenue. Each metric measures one link in that chain:'),
          list([
            '**CPM**, cost per 1,000 impressions. What it costs to be seen.',
            '**CTR**. Click-through rate. How compelling the ad is.',
            '**CPC**, cost per click. CPM ÷ CTR, roughly.',
            '**CVR**, conversion rate. How well the landing page + offer close.',
            '**CPA**, cost per acquisition. What one customer costs you.',
            '**ROAS**, return on ad spend. Revenue ÷ spend. The whole chain in one number.',
          ]),
          key('A bad final number (high CPA, low ROAS) is always caused by a weak link *earlier* in the chain. Diagnose top-down: is it CPM, CTR, or CVR?'),
        ],
      },
      {
        kind: 'scenario', id: 'q1',
        situation: 'Your CPA is way too high. CPM is normal, CTR is healthy (2.1%), but people click and don’t buy. Where’s the broken link?',
        options: [
          { label: 'The creative', correct: false, feedback: 'Creative is doing its job. CTR is healthy, people are clicking. The problem is *after* the click.' },
          { label: 'The landing page / offer (conversion rate)', correct: true, feedback: 'Exactly. Normal CPM + good CTR + poor result = the drop-off is at conversion. Fix the page, price, or offer, not the ad.' },
          { label: 'The audience is too small', correct: false, feedback: 'Nothing here points to reach. The click-to-buy step is where you’re leaking.' },
        ],
      },
      {
        kind: 'calc', id: 'calc1', variant: 'roas', title: 'Play with ROAS', blurb: 'Change spend and revenue and watch ROAS and profit move. Get a feel for the number before we go deeper.' },
      {
        kind: 'teach', id: 'c2', title: 'ROAS alone can lie',
        blocks: [
          p('A 3× ROAS sounds great: but if your product has a 40% margin, a 3× ROAS on the *revenue* might be losing money once you subtract cost of goods. The number you actually need to clear is your **break-even ROAS**.'),
          key('Break-even ROAS = 1 ÷ gross margin. At a 40% margin, break-even ROAS is 1 ÷ 0.40 = **2.5**. Below 2.5 you lose money; above it you profit.'),
        ],
      },
      {
        kind: 'calc', id: 'calc2', variant: 'breakeven-roas', title: 'Find your break-even ROAS', blurb: 'Enter your margin. Everything below the line is unprofitable spend, even if the ROAS looks positive.' },
      {
        kind: 'mcq', id: 'q2',
        prompt: 'Your product has a 50% gross margin. Which ROAS is your break-even point?',
        options: ['1.5', '2.0', '2.5', '5.0'],
        answer: 1,
        explain: 'Break-even ROAS = 1 ÷ margin = 1 ÷ 0.50 = 2.0. At 2× ROAS you exactly cover product cost + ad cost; you need more than 2× to profit.',
      },
      {
        kind: 'truefalse', id: 'q3',
        statement: 'Two campaigns both hit 3× ROAS, so they’re equally healthy.',
        isTrue: false,
        explain: 'Not necessarily. Different products have different margins (and different break-even ROAS). A 3× ROAS is great at a 30% margin and mediocre at an 80% margin. Always judge ROAS against *your* break-even.',
      },
      {
        kind: 'teach', id: 'c3',
        blocks: [key('Read metrics as a chain and diagnose top-down. And never celebrate a ROAS until you’ve compared it to your break-even ROAS.')],
      },
    ],
  },
];
