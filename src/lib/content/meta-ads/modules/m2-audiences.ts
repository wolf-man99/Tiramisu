import type { MetaLesson } from '../types';
import { p, list, key } from '../types';

/** Module 2 — Audiences & the Pixel: how Meta measures, and who you can reach. */
export const M2_LESSONS: MetaLesson[] = [
  // ─────────────────────────────────────────────────────────── Lesson 2.1 ──
  {
    slug: 'pixel-and-capi',
    moduleSlug: 'audiences',
    title: 'The Pixel & CAPI: how Meta learns',
    subtitle: 'No measurement, no optimisation',
    minutes: 9,
    xp: 70,
    objective: 'Understand how events flow back to Meta and why that feedback loop powers everything.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'The feedback loop that makes ads work', art: 'pixel-flow',
        blocks: [
          p('The **Meta Pixel** is a snippet of code on your website. Every time someone views a product, adds to cart, or buys, the pixel fires an **event** back to Meta. That feedback is what lets the algorithm learn "people like *this* buy" — and go find more of them.'),
          p('Without events flowing back, Meta is optimising blind. The pixel isn’t a tracking nicety; it’s the fuel for the whole optimisation engine.'),
          key('No pixel events → no conversion optimisation → no lookalikes → no retargeting. Measurement first, everything else second.'),
        ],
      },
      {
        kind: 'teach', id: 'c2', title: 'Standard events are a shared language',
        blocks: [
          p('Meta recognises a set of **standard events** — the vocabulary you map your site actions to:'),
          list([
            '`ViewContent` — someone looked at a product or key page.',
            '`AddToCart` — added an item to the cart.',
            '`InitiateCheckout` — started checkout.',
            '`Purchase` — bought (with a value and currency).',
            '`Lead` / `CompleteRegistration` — signed up.',
          ]),
          p('Send the right events with the right values and Meta can optimise for revenue, build cart-abandoner audiences, and report ROAS.'),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'Which event must send a monetary value and currency for ROAS reporting to work?',
        options: ['ViewContent', 'AddToCart', 'Purchase', 'Lead'],
        answer: 2,
        explain: 'ROAS = revenue ÷ spend. Meta only knows revenue if your `Purchase` events include a value and currency. Missing values = no ROAS, and weaker value optimisation.',
      },
      {
        kind: 'teach', id: 'c3', title: 'Why CAPI now matters',
        blocks: [
          p('The pixel runs in the browser — and browsers now block cookies, and iOS lets users opt out of tracking. That means a chunk of events never make it back. The **Conversions API (CAPI)** fixes this by sending events **server-to-server**, straight from your backend to Meta, bypassing the browser’s limits.'),
          p('Best practice today is **both**: the pixel *and* CAPI, sending the same events (deduplicated by an event ID). Together they recover the signal that browser-only tracking loses.'),
        ],
      },
      {
        kind: 'truefalse', id: 'q2',
        statement: 'Since iOS 14.5’s tracking prompt, the browser pixel alone captures every conversion reliably.',
        isTrue: false,
        explain: 'False — that change is exactly why the pixel alone under-reports. CAPI (server-side events) recovers conversions the browser drops. Run both, deduplicated.',
      },
      {
        kind: 'scenario', id: 'q3',
        situation: 'Your Meta dashboard shows 60 purchases but Shopify shows 95 for the same day. What’s the most likely explanation?',
        options: [
          { label: 'Meta is lying / broken', correct: false, feedback: 'Under-reporting is expected, not a bug. Meta only counts conversions it can attribute and receive.' },
          { label: 'Browser-tracking loss — you need CAPI to recover the missing events', correct: true, feedback: 'Right. Blocked cookies and opt-outs mean the browser pixel misses conversions. Adding CAPI closes much of that gap and improves optimisation too.' },
          { label: 'Your ROAS is fake', correct: false, feedback: 'The signal is just incomplete, not fake. The fix is better measurement (CAPI), not distrust.' },
        ],
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Set up the Purchase event with dynamic value first — it unlocks value optimisation, ROAS reporting, and cart-based retargeting all at once. It’s the single highest-leverage measurement task.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 2.2 ──
  {
    slug: 'audience-types',
    moduleSlug: 'audiences',
    title: 'The three kinds of audience',
    subtitle: 'Core, Custom, Lookalike',
    minutes: 10,
    xp: 75,
    objective: 'Know when to reach for cold interests, your own data, or an algorithmic lookalike.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Three ways to define who sees your ads', art: 'audiences',
        blocks: [
          p('Every audience you build is one of three types. They map neatly onto temperature — how much the person already knows you.'),
          list([
            '**Core (cold)** — you describe people by demographics, interests and behaviours. "Women 25–40 interested in trail running." Meta finds them.',
            '**Custom (warm)** — built from *your* data: site visitors (via the pixel), customer email lists, video viewers, people who engaged with your Page or IG.',
            '**Lookalike (cold, but smart)** — you give Meta a good Custom Audience as a "seed", and it finds new people who *resemble* them. A 1% lookalike is the closest match; 5–10% is broader but looser.',
          ]),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'You upload your list of best customers and ask Meta to "find more people like these." What are you building?',
        options: ['A Core audience', 'A Custom audience', 'A Lookalike audience', 'A retargeting audience'],
        answer: 2,
        explain: 'Feeding a seed (your customer Custom Audience) to find *similar* new people is the definition of a Lookalike. The uploaded list itself is a Custom Audience — the seed.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'A lookalike is only as good as its seed. A lookalike of "all site visitors" is weak; a lookalike of "purchasers with the highest lifetime value" is gold. Feed the algorithm your *best* people, not your *most* people.',
      },
      {
        kind: 'sort', id: 'q2',
        prompt: 'Order these audiences from coldest (knows you least) to warmest (knows you most).',
        items: ['1% Lookalike of buyers', 'Interest-based cold audience', 'Add-to-cart, didn’t buy (last 7 days)', 'Past purchasers'],
        explain: 'Wait — check the logic: broad interests are coldest, a lookalike is cold-but-modelled, cart-abandoners are warm, past buyers are warmest. (Sort answer: interest cold → lookalike → cart abandoners → purchasers.)',
      },
      {
        kind: 'scenario', id: 'q3',
        situation: 'A tiny brand with 300 site visitors a month wants to scale. Which audience will actually give the algorithm room to spend?',
        options: [
          { label: 'Retarget the 300 visitors', correct: false, feedback: 'Way too small to scale spend — you’ll hit high frequency fast and burn out. Retargeting is for closing, not scaling.' },
          { label: 'A broad Core interest audience or a wide lookalike', correct: true, feedback: 'Correct. To *scale*, you need reach. Broad interests or a 3–5% lookalike give the algorithm a big enough pool to find buyers. Save the 300 for retargeting.' },
          { label: 'Only 1% lookalikes', correct: false, feedback: 'With a 300-person seed, a 1% lookalike is thin and unstable. Broaden the seed and the percentage first.' },
        ],
      },
      {
        kind: 'truefalse', id: 'q4',
        statement: 'A broader (e.g. 5–10%) lookalike always performs worse than a 1% lookalike.',
        isTrue: false,
        explain: 'Not always. 1% is the tightest match but a small pool; broader lookalikes trade precision for reach and can perform better at scale, especially when paired with strong creative that self-selects the right people.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 2.3 ──
  {
    slug: 'retargeting-and-exclusions',
    moduleSlug: 'audiences',
    title: 'Retargeting & the art of exclusions',
    subtitle: 'Stop paying to reach people twice',
    minutes: 8,
    xp: 65,
    objective: 'Build warm retargeting audiences and use exclusions to avoid waste and overlap.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Warm audiences convert cheapest',
        blocks: [
          p('People who visited your site, watched 50% of your video, or added to cart already know you. Retargeting them is the highest-ROAS spend in most accounts — but also the easiest to *waste* if you don’t manage overlap.'),
          key('The move: show cold audiences your best hook, then retarget the people who engaged with a closer — a testimonial, an offer, a "still thinking about it?" ad.'),
        ],
      },
      {
        kind: 'teach', id: 'c2', title: 'Exclusions keep money from leaking',
        blocks: [
          p('Two silent budget leaks:'),
          list([
            '**Paying to convert people who already bought.** Exclude past purchasers from acquisition campaigns (unless you sell repeat/consumable products).',
            '**Two ad sets fighting over the same people.** If your lookalike and your interest audience overlap heavily, you bid against *yourself* in the auction, raising your own costs.',
          ]),
          p('Fix both with **exclusions**: exclude purchasers from prospecting, and exclude your warm/retargeting audience from your cold campaigns so each person sits in exactly one bucket.'),
        ],
      },
      {
        kind: 'scenario', id: 'q1',
        situation: 'A subscription-box brand excludes *all past purchasers* from every campaign. Sales from existing customers quietly vanish. What went wrong?',
        options: [
          { label: 'Nothing — always exclude purchasers', correct: false, feedback: 'Blanket advice bites here. For repeat/consumable/subscription products, existing customers are your best repeat buyers.' },
          { label: 'They should exclude purchasers from *prospecting*, but run *retention* campaigns to them', correct: true, feedback: 'Exactly. Exclude buyers from acquisition so you don’t pay to re-acquire them — but run dedicated win-back / upsell campaigns *to* them.' },
          { label: 'They should never use exclusions', correct: false, feedback: 'Exclusions are essential — the fix is targeted use, not abandoning them.' },
        ],
      },
      {
        kind: 'mcq', id: 'q2',
        prompt: 'Your prospecting and retargeting campaigns show rising costs. You discover big audience overlap. What’s happening in the auction?',
        options: [
          'Meta gives you a discount for overlap',
          'You’re bidding against yourself, inflating your own CPMs',
          'Overlap has no effect',
          'The pixel double-counts',
        ],
        answer: 1,
        explain: 'When your own ad sets target overlapping people, they compete in the same auctions — you drive up your own prices. Exclude warm audiences from cold campaigns to separate the buckets.',
      },
      {
        kind: 'truefalse', id: 'q3',
        statement: 'Retargeting can scale a business on its own.',
        isTrue: false,
        explain: 'Retargeting only reaches people who already engaged — a finite, warm pool. It closes; it doesn’t fill the top of the funnel. You need cold prospecting to *create* the audience retargeting later converts.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Think in buckets: Cold (prospecting) → Warm (engagers, add-to-cart) → Customers (retention). Exclude downward so each person is only ever paid for in one bucket at a time.',
      },
    ],
  },
];
