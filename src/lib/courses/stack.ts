/**
 * The performance-marketing skill stack — four layers that together make a complete
 * performance marketer. This is the *positioning* view of the catalog: the homepage
 * shows the four layers as cards, /courses expands each into its full tool list.
 *
 * Individual shipped courses still live in registry.ts; this file references them by
 * slug so a course that goes live is a one-line status change here, not a rewrite.
 * Layer accents reuse Tiramisu's existing six-colour system — no new hues.
 */

export type StackItemStatus = 'live' | 'coming-next' | 'coming-soon';

export interface StackItem {
  label: string;
  status: StackItemStatus;
  /** Set only when the course is live and has somewhere to go. */
  href?: string;
}

export interface StackLayer {
  index: string;
  slug: string;
  title: string;
  tagline: string;
  /** One of the six existing brand hues. */
  accent: string;
  items: StackItem[];
}

export const STACK: StackLayer[] = [
  {
    index: '01',
    slug: 'paid-acquisition',
    title: 'Paid Acquisition',
    tagline: 'Buy attention profitably, on every major platform.',
    accent: 'var(--blue)',
    items: [
      { label: 'Meta Ads', status: 'live', href: '/courses/meta-ads' },
      { label: 'Google Ads', status: 'coming-next' },
      { label: 'LinkedIn Ads', status: 'coming-soon' },
      { label: 'Snapchat Ads', status: 'coming-soon' },
      { label: 'Reddit Ads', status: 'coming-soon' },
      { label: 'More in store', status: 'coming-soon' },
    ],
  },
  {
    index: '02',
    slug: 'tracking-measurement',
    title: 'Tracking & Measurement',
    tagline: 'Know what actually happened — before you optimise it.',
    accent: 'var(--teal)',
    items: [
      { label: 'Google Tag Manager', status: 'coming-soon' },
      { label: 'GA4', status: 'coming-soon' },
      { label: 'Meta Pixel', status: 'coming-soon' },
      { label: 'Conversion API', status: 'coming-soon' },
      { label: 'UTM Tracking', status: 'coming-soon' },
      { label: 'Microsoft Clarity', status: 'coming-soon' },
      { label: 'Hotjar', status: 'coming-soon' },
      { label: 'Attribution', status: 'coming-soon' },
      { label: 'Offline Conversions', status: 'coming-soon' },
    ],
  },
  {
    index: '03',
    slug: 'marketing-analytics',
    title: 'Marketing Analytics',
    tagline: 'Turn the data into an answer someone can act on.',
    accent: 'var(--purple)',
    items: [
      { label: 'SQL', status: 'live', href: '/dashboard' },
      { label: 'BigQuery', status: 'coming-soon' },
      { label: 'GA4 → BigQuery', status: 'coming-soon' },
      { label: 'Funnels', status: 'coming-soon' },
      { label: 'Cohorts', status: 'coming-soon' },
      { label: 'LTV', status: 'coming-soon' },
      { label: 'CAC', status: 'coming-soon' },
      { label: 'ROAS', status: 'coming-soon' },
      { label: 'Attribution', status: 'coming-soon' },
    ],
  },
  {
    index: '04',
    slug: 'growth-optimization',
    title: 'Growth & Optimization',
    tagline: 'Compound the wins — test, convert, automate.',
    accent: 'var(--amber)',
    items: [
      { label: 'CRO', status: 'coming-soon' },
      { label: 'A/B Testing', status: 'coming-soon' },
      { label: 'Creative Testing', status: 'coming-soon' },
      { label: 'Landing Pages', status: 'coming-soon' },
      { label: 'Experimentation', status: 'coming-soon' },
      { label: 'Budget Allocation', status: 'coming-soon' },
      { label: 'Lifecycle Marketing', status: 'coming-soon' },
      { label: 'Automation', status: 'coming-soon' },
      { label: 'AI for Marketing', status: 'coming-soon' },
    ],
  },
];

export const STACK_ITEM_LABEL: Record<StackItemStatus, string> = {
  live: 'Live',
  'coming-next': 'Coming next',
  'coming-soon': 'Coming soon',
};

export interface MethodLayer {
  name: string;
  /** One line, shown inline in the stack on wider screens. */
  summary: string;
  /** Shown in the detail panel when the layer is selected. */
  detail: string;
  skills: string[];
}

/** The nine layers of the Tiramisu method, top to bottom. */
export const METHOD_LAYERS: MethodLayer[] = [
  {
    name: 'Strategy',
    summary: 'Decide what a win looks like — before you spend.',
    detail:
      'Who you are selling to, what you are offering them, and the number that tells you it worked. Every layer below inherits these answers, so getting them wrong is expensive in nine different ways.',
    skills: ['Positioning', 'ICP', 'Offer design', 'Budget planning'],
  },
  {
    name: 'Acquisition',
    summary: 'Buy attention where your buyers already are.',
    detail:
      'Campaign structure, bidding, audiences and pacing across Meta, Google and the rest. The mechanics of getting your offer in front of people at a price that still leaves margin.',
    skills: ['Campaign structure', 'Bidding', 'Audiences', 'Pacing'],
  },
  {
    name: 'Creative',
    summary: 'The single biggest lever in paid media.',
    detail:
      'Targeting has largely been automated away. What you say and how you show it is the variable you still control — and the one that moves CAC the most.',
    skills: ['Hooks & angles', 'Ad formats', 'Creative testing', 'Iteration'],
  },
  {
    name: 'Tracking',
    summary: 'If you measure it wrong, everything downstream is fiction.',
    detail:
      'Tags, pixels, server-side events and clean UTMs. Unglamorous, and the reason most reporting quietly lies. Fix this layer and every number above it starts meaning something.',
    skills: ['GTM', 'Pixel & CAPI', 'UTMs', 'Event design'],
  },
  {
    name: 'Analytics',
    summary: 'Turn raw events into a number worth acting on.',
    detail:
      'SQL against the warehouse, funnels, cohorts and attribution. The difference between having data and having an answer someone can make a decision on.',
    skills: ['SQL', 'BigQuery', 'Funnels', 'Cohorts'],
  },
  {
    name: 'Conversion',
    summary: 'Traffic is rented. The page is where you earn it.',
    detail:
      'You already paid for the click. Landing page, offer clarity and checkout friction decide whether that spend becomes revenue or a bounce.',
    skills: ['Landing pages', 'CRO', 'Checkout UX', 'Friction audits'],
  },
  {
    name: 'Optimization',
    summary: 'Read the signal. Kill the losers. Scale the winners.',
    detail:
      'Diagnosing why a number moved, then acting at a size delivery can absorb. Most accounts die from over-reacting to noise, not from under-spending.',
    skills: ['Diagnosis', 'Scaling rules', 'Budget allocation', 'Guardrails'],
  },
  {
    name: 'Automation',
    summary: 'Stop hand-doing what a rule or a model can do.',
    detail:
      'Automated rules, scripts, feeds and AI workflows. Buy back the hours you currently spend in spreadsheets and spend them on judgement instead.',
    skills: ['Automated rules', 'Scripts', 'Feeds', 'AI workflows'],
  },
  {
    name: 'Growth',
    summary: 'Compound it — beyond the campaign.',
    detail:
      'Retention, LTV, lifecycle and the loops that keep paying after the ad stops. Where a good performance marketer turns into a growth owner.',
    skills: ['LTV', 'Lifecycle', 'Retention', 'Experimentation'],
  },
];
