/**
 * The fixed-choice fields collected at signup (learning goal, acquisition channel).
 * Shared between the signup form (which renders these as chips) and server-side
 * validation (which checks the submitted id is one of these), so the two can never
 * drift apart. Course interest is validated separately, against the live course
 * registry (`src/lib/courses/registry.ts`) rather than a list duplicated here.
 */

export interface OnboardingOption {
  id: string;
  label: string;
}

export const LEARNING_GOALS: OnboardingOption[] = [
  { id: 'get-a-job', label: 'Get a job in marketing' },
  { id: 'grow-my-campaigns', label: 'Grow my current campaigns' },
  { id: 'freelance-agency', label: 'Freelance or agency work' },
  { id: 'just-curious', label: 'Just curious' },
];

export const HEARD_FROM_OPTIONS: OnboardingOption[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'google-search', label: 'Google search' },
  { id: 'a-friend', label: 'A friend or colleague' },
  { id: 'other', label: 'Other' },
];

export const isValidLearningGoal = (id: string): boolean => LEARNING_GOALS.some((g) => g.id === id);
export const isValidHeardFrom = (id: string): boolean => HEARD_FROM_OPTIONS.some((h) => h.id === id);
