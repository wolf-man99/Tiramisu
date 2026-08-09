import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { googleConfigured, googleAuthUrl, googleRedirectUri } from '@/lib/auth/google';

export const runtime = 'nodejs';

/** Kick off the Google OAuth flow. Redirects to the consent screen, or back with an error. */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!googleConfigured()) {
    return Response.redirect(`${origin}/login?error=google_unconfigured`, 302);
  }
  const state = randomBytes(16).toString('hex');
  const jar = await cookies();
  jar.set('gsql_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 });
  return Response.redirect(googleAuthUrl(state, googleRedirectUri(origin)), 302);
}
