/**
 * The course catalog. GrowthSQL Academy is now a multi-course platform; "SQL for
 * Marketers" is the first live course. Adding a course later — Meta Ads content, then
 * Google Ads, then the rest — is a data change here plus its content, not a rebuild.
 *
 * Payments are deliberately out of scope for now, but the shape is ready: `price`,
 * `bundleEligible` and the Enrollment.access field let paid courses and bundle offers
 * drop in without a schema change.
 */

export type CourseStatus = 'live' | 'in-progress' | 'coming-soon';

export interface Course {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  status: CourseStatus;
  emoji: string;
  accent: string; // CSS color
  category: 'Analytics' | 'Paid media';
  /** Where "Start course" navigates for a live course. */
  href: string;
  level: string;
  duration: string;
  lessons: number;
  highlights: string[];
  /** Future monetisation — unused until payments ship. */
  price?: number;
  bundleEligible?: boolean;
}

export const COURSES: Course[] = [
  {
    id: 'sql-for-marketers',
    slug: 'sql-for-marketers',
    title: 'SQL for Marketers',
    tagline: 'Zero to marketing analyst in 14 days',
    description:
      'Learn BigQuery SQL on a real marketing warehouse — a real editor, an AI coach, and 300 graded exercises. Answer the questions a growth team actually argues about.',
    status: 'live',
    emoji: '🗃️',
    accent: '#7c6cf6',
    category: 'Analytics',
    href: '/dashboard',
    level: 'Beginner → Advanced',
    duration: '14 days',
    lessons: 14,
    highlights: ['Real BigQuery, runs locally', '300 graded exercises', 'AI coach', '10 projects · 10 mock interviews'],
    price: 0,
    bundleEligible: true,
  },
  {
    id: 'meta-ads',
    slug: 'meta-ads',
    title: 'Meta Ads Mastery',
    tagline: 'Run Facebook & Instagram ads that actually convert',
    description:
      'From the pixel to CBO to creative testing — build, launch, and scale Meta campaigns the way a performance marketer does. Interactive, gamified, and hands-on.',
    status: 'live',
    emoji: '📘',
    accent: '#3b82f6',
    category: 'Paid media',
    href: '/courses/meta-ads',
    level: 'Beginner → Advanced',
    duration: 'Beta · 7 lessons live',
    lessons: 7,
    highlights: ['Campaign structure & the auction', 'Audiences & the pixel', 'Interactive, gamified lessons', 'More modules dropping weekly'],
    price: 0,
    bundleEligible: true,
  },
  {
    id: 'google-ads',
    slug: 'google-ads',
    title: 'Google Ads',
    tagline: 'Search, Shopping, PMax — the intent engine',
    description: 'Capture demand where it lives. Search, Shopping and Performance Max, from keyword match types to bidding strategy.',
    status: 'coming-soon',
    emoji: '🔍',
    accent: '#22c55e',
    category: 'Paid media',
    href: '/courses/google-ads',
    level: 'Beginner → Advanced',
    duration: 'Launching soon',
    lessons: 0,
    highlights: ['Search & Shopping', 'Performance Max', 'Bidding strategy', 'Quality Score'],
    bundleEligible: true,
  },
  {
    id: 'linkedin-ads',
    slug: 'linkedin-ads',
    title: 'LinkedIn Ads',
    tagline: 'B2B demand gen that respects the CAC',
    description: 'The most expensive clicks in advertising — spent well. Targeting, sponsored content, and lead gen for B2B.',
    status: 'coming-soon',
    emoji: '💼',
    accent: '#0ea5e9',
    category: 'Paid media',
    href: '/courses/linkedin-ads',
    level: 'Intermediate',
    duration: 'Coming soon',
    lessons: 0,
    highlights: ['B2B targeting', 'Sponsored content', 'Lead-gen forms', 'CAC discipline'],
    bundleEligible: true,
  },
  {
    id: 'reddit-ads',
    slug: 'reddit-ads',
    title: 'Reddit Ads',
    tagline: 'Advertise where communities actually gather',
    description: 'Reach passionate niches without getting downvoted. Subreddit targeting, native creative, and community-safe messaging.',
    status: 'coming-soon',
    emoji: '👽',
    accent: '#f97316',
    category: 'Paid media',
    href: '/courses/reddit-ads',
    level: 'Intermediate',
    duration: 'Coming soon',
    lessons: 0,
    highlights: ['Subreddit targeting', 'Native creative', 'Community fit'],
    bundleEligible: true,
  },
  {
    id: 'snapchat-ads',
    slug: 'snapchat-ads',
    title: 'Snapchat Ads',
    tagline: 'Full-screen, vertical, Gen-Z native',
    description: 'Reach a younger audience with thumb-stopping vertical creative, AR lenses, and Snap Pixel optimisation.',
    status: 'coming-soon',
    emoji: '👻',
    accent: '#eab308',
    category: 'Paid media',
    href: '/courses/snapchat-ads',
    level: 'Beginner',
    duration: 'Coming soon',
    lessons: 0,
    highlights: ['Vertical creative', 'AR lenses', 'Snap Pixel'],
    bundleEligible: true,
  },
];

export function courseBySlug(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug);
}

export function liveCourses(): Course[] {
  return COURSES.filter((c) => c.status === 'live');
}

export const STATUS_LABEL: Record<CourseStatus, string> = {
  live: 'Live',
  'in-progress': 'In progress',
  'coming-soon': 'Coming soon',
};
