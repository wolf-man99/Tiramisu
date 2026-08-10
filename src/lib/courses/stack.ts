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

/** The nine layers of the Tiramisu method, top to bottom. */
export const METHOD_LAYERS = [
  'Strategy',
  'Acquisition',
  'Creative',
  'Tracking',
  'Analytics',
  'Conversion',
  'Optimization',
  'Automation',
  'Growth',
] as const;
