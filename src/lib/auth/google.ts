/**
 * Google OAuth 2.0 (authorization-code flow), hand-rolled with fetch. Works the moment
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set; until then {@link googleConfigured}
 * is false and the UI shows the button as unavailable.
 */

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Where Google redirects back to. Derived from the request origin so it works on any host. */
export function googleRedirectUri(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

export function googleAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export interface GoogleProfile {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

/** Exchange an authorization code for the user's profile. */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleProfile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw new Error('Google token exchange failed.');
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const infoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) throw new Error('Could not read Google profile.');
  return (await infoRes.json()) as GoogleProfile;
}
