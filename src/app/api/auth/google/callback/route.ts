import { cookies } from 'next/headers';
import { exchangeGoogleCode, googleRedirectUri } from '@/lib/auth/google';
import { upsertGoogleUser } from '@/lib/auth/users';
import { setSession } from '@/lib/auth/server';

export const runtime = 'nodejs';

/** Handle Google's redirect: verify state, exchange the code, sign the user in. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const jar = await cookies();
  const savedState = jar.get('gsql_oauth_state')?.value;
  jar.delete('gsql_oauth_state');

  if (!code || !state || state !== savedState) {
    return Response.redirect(`${origin}/login?error=oauth_state`, 302);
  }
  try {
    const profile = await exchangeGoogleCode(code, googleRedirectUri(origin));
    const result = await upsertGoogleUser(profile);
    if (!result.ok) return Response.redirect(`${origin}/login?error=oauth`, 302);
    await setSession(result.profileId!);
    return Response.redirect(`${origin}/dashboard`, 302);
  } catch {
    return Response.redirect(`${origin}/login?error=oauth`, 302);
  }
}
