import type { MetaLesson } from '../types';
import { p, list, key } from '../types';

/** Module 3 — Creative that converts: the ad is the campaign. Hooks, formats, and angles. */
export const M3_LESSONS: MetaLesson[] = [
  // ─────────────────────────────────────────────────────────── Lesson 3.1 ──
  {
    slug: 'anatomy-of-an-ad',
    moduleSlug: 'creative',
    title: 'Anatomy of an ad that stops the scroll',
    subtitle: 'Visual, hook, text, headline, CTA',
    minutes: 9,
    xp: 70,
    objective: 'Break an ad into its parts and know the job each one does.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Five parts, five jobs', art: 'creative-anatomy',
        blocks: [
          p('An ad isn’t one thing — it’s five parts working together, and each has exactly one job. Diagnose a weak ad by asking which part failed.'),
          list([
            '**Visual** — the image or (better) video. Its only job is to *stop the scroll*.',
            '**Hook** — the first 3 seconds / first line. Its job is to earn the next 3 seconds.',
            '**Primary text** — the body copy. Builds desire and handles objections.',
            '**Headline** — the bold line by the button. States the offer or payoff.',
            '**CTA** — the button. Tells them exactly what happens next.',
          ]),
          key('If people scroll past, it’s the visual/hook. If they watch but don’t click, it’s the offer/headline. If they click but don’t buy, it’s the landing page — not the ad.'),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'Your ad has a great click-through rate but a low view/hold time — most people who *do* watch bounce in 2 seconds. Which part is underperforming?',
        options: ['The headline', 'The CTA button', 'The hook (first 3 seconds)', 'The landing page'],
        answer: 2,
        explain: 'People are dropping in the first seconds, so the hook isn’t earning attention. A strong CTR on the few who stay tells you the offer works — fix the opening.',
      },
      {
        kind: 'sort', id: 'q2',
        prompt: 'Order these by the moment a viewer experiences them, first to last.',
        items: ['Visual stops the scroll', 'Hook earns the next 3 seconds', 'Primary text builds desire', 'Headline states the offer', 'CTA button gets the click'],
        explain: 'Attention is sequential: the visual stops them, the hook holds them, the body persuades, the headline frames the offer, the button converts. A break anywhere ends the chain.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Design for sound-off and thumbnail-size. Most feed video is watched muted on a phone — burn captions into the video and make sure the hook lands visually, not just verbally.',
      },
      {
        kind: 'truefalse', id: 'q3',
        statement: 'A beautiful, high-production video will always outperform a rough phone-shot one.',
        isTrue: false,
        explain: 'Often the opposite. Polished ads can read as "ads" and get tuned out; native, phone-shot UGC blends into the feed and can win on relevance. Production value ≠ performance.',
      },
      {
        kind: 'teach', id: 'c2',
        blocks: [key('The ad is the campaign. Targeting got commoditised; creative is where you still win or lose. Learn to see ads as parts with jobs, and you can fix them surgically.')],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 3.2 ──
  {
    slug: 'the-hook',
    moduleSlug: 'creative',
    title: 'The hook: winning the first 3 seconds',
    subtitle: 'No hook, no ad',
    minutes: 8,
    xp: 65,
    objective: 'Write and recognise hooks that stop the scroll and self-select the right viewer.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'The hook does two jobs at once',
        blocks: [
          p('The first 3 seconds have to (1) *interrupt the scroll* and (2) *signal who this is for*. A great hook filters as much as it attracts — it makes the right person lean in and lets the wrong person scroll on (which is fine; you don’t pay to keep them).'),
          list([
            '**Call out the audience:** "If you run Facebook ads and your CPMs are climbing…"',
            '**Open a curiosity gap:** "I was wasting 40% of my ad budget and didn’t know it."',
            '**Lead with the result:** "This one change doubled our ROAS in 14 days."',
            '**Name the pain:** "Your ads aren’t bad — your hook is."',
          ]),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'Which opening line is the strongest *hook* for a sleep-supplement ad?',
        options: [
          'We founded our company in 2019 with a mission.',
          'Still lying awake at 3am? This 10-second habit changed my nights.',
          'Buy now and save 20% this week only.',
          'Our product contains magnesium and L-theanine.',
        ],
        answer: 1,
        explain: 'It calls out the exact audience (insomniacs), names the pain (3am), and opens a curiosity gap (a habit). The others lead with the brand, the discount, or the ingredients — none stop a scroll.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Batch hooks, not whole videos. Film one strong ad, then shoot 5–10 different opening 3 seconds and splice each onto the same body. You’ll find a winning hook far faster and cheaper than remaking the whole ad.',
      },
      {
        kind: 'scenario', id: 'q2',
        situation: 'An ad’s 3-second video hold rate is strong, but the click-through rate is poor. Your editor wants to re-cut the hook. Good idea?',
        options: [
          { label: 'Yes — always start with the hook', correct: false, feedback: 'The data says the hook is already working: people are holding past 3 seconds. Re-cutting it risks breaking what works.' },
          { label: 'No — the hook is holding attention; the drop-off is later (offer/CTA)', correct: true, feedback: 'Right. Strong hold + weak CTR means the opening earns attention but the middle/offer doesn’t convert it. Fix the body, offer, or CTA — not the hook.' },
          { label: 'Pause the ad', correct: false, feedback: 'Premature. You have a diagnosable problem downstream of the hook — fix that first.' },
        ],
      },
      {
        kind: 'multi', id: 'q3',
        prompt: 'Which of these make a hook stronger? (Select all that apply.)',
        options: [
          'Naming the specific audience it’s for',
          'Opening with your company history',
          'Leading with a surprising result or claim',
          'Showing motion or a pattern-interrupt in the first frame',
        ],
        answers: [0, 2, 3],
        explain: 'Audience call-outs, a surprising result, and visual pattern-interrupts all stop scrolls. Company history is about you, not the viewer — it buries the hook.',
      },
      {
        kind: 'teach', id: 'c2',
        blocks: [key('The hook is the highest-leverage 3 seconds in the whole account. Test hooks relentlessly — a new hook on a proven body is the cheapest big win in Meta ads.')],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 3.3 ──
  {
    slug: 'formats-and-placements',
    moduleSlug: 'creative',
    title: 'Formats & placements: pick the right canvas',
    subtitle: 'Reels, Stories, feed, carousel',
    minutes: 9,
    xp: 70,
    objective: 'Match the creative format to the message and let placements run broad.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'The main formats', art: 'creative-formats',
        blocks: [
          p('Each format is a different canvas. Match it to what you’re trying to say:'),
          list([
            '**Vertical video (Reels/Stories, 9:16)** — the default for cold traffic. Native, full-screen, cheapest reach. Best for hooks and demonstrations.',
            '**Single image (1:1 or 4:5)** — fast to produce, great for a punchy claim or offer. A strong workhorse for retargeting.',
            '**Carousel** — swipeable cards. Perfect for step-by-step, feature breakdowns, or multiple products.',
            '**Collection / catalog** — pulls products dynamically; the engine for e-commerce retargeting.',
          ]),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'You want to show a "5 reasons customers switch to us" story that builds as the viewer engages. Best format?',
        options: ['Single image', 'Carousel', 'A 1:1 square video', 'Collection ad'],
        answer: 1,
        explain: 'A carousel is built for sequential, swipeable content — one reason per card. It rewards engagement and lets each card make its own point.',
      },
      {
        kind: 'teach', id: 'c2', title: 'Let Advantage+ placements run broad',
        blocks: [
          p('Meta can show your ad across Feeds, Reels, Stories, Search, Marketplace and the Audience Network. It’s tempting to hand-pick "only Instagram feed" — but restricting placements shrinks the auction pool and usually *raises* your costs.'),
          p('Best practice: use **Advantage+ placements** (all placements on) and supply assets that adapt — a 9:16 master plus a 1:1 crop — so every placement looks native.'),
        ],
      },
      {
        kind: 'truefalse', id: 'q2',
        statement: 'Restricting your ad to a single placement (e.g. only Instagram Feed) reliably improves performance.',
        isTrue: false,
        explain: 'Usually not. Narrowing placements shrinks the pool of cheap impressions and hands the auction fewer options, which tends to raise CPMs. Run broad placements and let the algorithm find efficiency.',
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Design one 9:16 vertical master with the important stuff in the safe zone (away from the top and bottom UI). It adapts cleanly to Reels, Stories and feed, so one asset covers most placements natively.',
      },
      {
        kind: 'scenario', id: 'q3',
        situation: 'A brand insists on running only 1:1 square images "because they look clean." Cold-traffic costs are high. What do you recommend?',
        options: [
          { label: 'Keep square only — consistency matters', correct: false, feedback: 'Consistency doesn’t beat native fit. Square images leave Reels/Stories real estate empty and reach fewer people cheaply.' },
          { label: 'Add 9:16 vertical video for cold traffic and open placements', correct: true, feedback: 'Right. Vertical video is native to the cheapest, highest-reach placements. Adding it (and opening placements) usually drops cold CPMs.' },
          { label: 'Just raise the budget', correct: false, feedback: 'That spends more without fixing the root cause — a format that doesn’t fit where cold reach is cheapest.' },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────── Lesson 3.4 ──
  {
    slug: 'ugc-and-angles',
    moduleSlug: 'creative',
    title: 'UGC & angles that scale',
    subtitle: 'Many messages, not many edits',
    minutes: 10,
    xp: 75,
    objective: 'Generate creative variety through angles, and know why UGC scales.',
    cards: [
      {
        kind: 'teach', id: 'c1', title: 'Scale angles, not just executions',
        blocks: [
          p('A common trap: making twenty versions of the *same* ad (new colours, new music). That’s variety of *execution*, not of *message*. The real unlock is testing different **angles** — different reasons a person might buy.'),
          list([
            '**Problem/solution** — "Tired of X? Here’s the fix."',
            '**Social proof** — "12,000 five-star reviews can’t be wrong."',
            '**Us-vs-them** — "Why we ditched the old way."',
            '**Founder story** — "I built this because nothing worked for me."',
            '**Demonstration** — show the product doing the thing, plainly.',
          ]),
          key('One product, many angles. Different people buy for different reasons — angles let you reach them all without a new product.'),
        ],
      },
      {
        kind: 'mcq', id: 'q1',
        prompt: 'You have one winning ad. To scale creative testing efficiently, what should you vary first?',
        options: [
          'The background music',
          'The angle — the reason-to-buy the ad leads with',
          'The aspect ratio only',
          'The button colour',
        ],
        answer: 1,
        explain: 'Angles unlock genuinely new performance because they speak to different motivations. Music and button colour are cosmetic — they rarely move results the way a fresh angle does.',
      },
      {
        kind: 'teach', id: 'c2', title: 'Why UGC punches above its budget',
        blocks: [
          p('**User-generated-style content** — a real-looking person talking to their phone camera — works because it’s *native*. It looks like the organic content around it, so the brain doesn’t flag it as an ad and skip it. That raises the estimated-action-rate and ad-quality levers you learned about in the auction.'),
          p('It’s also cheap to produce and easy to vary: one creator, many hooks and angles in a single shoot.'),
        ],
      },
      {
        kind: 'multi', id: 'q2',
        prompt: 'Why does UGC-style creative often beat polished studio ads on cold traffic? (Select all that apply.)',
        options: [
          'It blends into the feed, so it’s not skipped as "an ad"',
          'It’s always cheaper per view because Meta discounts it',
          'It raises engagement / ad-quality signals in the auction',
          'It’s fast to produce many hooks and angles from one shoot',
        ],
        answers: [0, 2, 3],
        explain: 'UGC wins on native fit, auction-quality signals, and production speed. Meta doesn’t "discount" it — the lower effective cost comes from higher Total Value, not a special rate.',
      },
      {
        kind: 'scenario', id: 'q3',
        situation: 'Your best ad has fatigued and results are sliding. The team wants to remake it in higher quality. Better first move?',
        options: [
          { label: 'Reshoot it as a premium studio ad', correct: false, feedback: 'Expensive and slow — and polish isn’t the lever. You’d bet the budget on one execution.' },
          { label: 'Test 3–4 new *angles* in UGC style against the same offer', correct: true, feedback: 'Right. New angles find new pockets of demand fast and cheaply. Fatigue is a message/variety problem more than a production-quality one.' },
          { label: 'Just duplicate the fatigued ad', correct: false, feedback: 'Duplicating a tired ad re-shows the same message — it fatigues again immediately.' },
        ],
      },
      {
        kind: 'tip', id: 't1', title: 'Pro tip',
        text: 'Keep a running "angle bank" — a doc of every angle, hook and testimonial you can pull from. When performance dips, you’re never staring at a blank page; you’re shipping the next test the same day.',
      },
    ],
  },
];
