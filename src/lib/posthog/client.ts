import posthog from 'posthog-js';

export const initPostHog = () => {
  if (typeof window === 'undefined') return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    // PostHog not configured; app continues to work without it
    return;
  }

  posthog.init(apiKey, {
    api_host: 'https://us.i.posthog.com',
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.debug();
      }
    },
  });
};

export default posthog;
