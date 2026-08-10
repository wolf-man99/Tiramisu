export async function captureEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) {
    // PostHog not configured, skip silently
    return;
  }

  try {
    await fetch('https://us.i.posthog.com/capture/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        properties: {
          ...properties,
          $ip: 'server', // Mark as server-side event
        },
        distinct_id: userId,
        timestamp: new Date().toISOString(),
      }),
    }).catch((e) => {
      // Silently fail on network errors
      console.debug('[PostHog] Failed to send event:', e.message);
    });
  } catch (e) {
    // Silently fail on errors
    console.debug('[PostHog] Error capturing event:', e);
  }
}
