import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '../db';
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, verifySessionToken } from './session';

/**
 * Server-only helpers for reading and writing the session. Import these in server
 * components, route handlers and server actions — never in client code.
 */

/** The authenticated profile id, or null. */
export async function getProfileId(): Promise<string | null> {
  const jar = await cookies();
  const payload = verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  return payload?.sub ?? null;
}

/** The authenticated profile id, or redirect to /login. Use in protected pages. */
export async function requireProfileId(nextPath?: string): Promise<string> {
  const id = await getProfileId();
  if (!id) redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`);
  return id;
}

/** The full authenticated profile, or null. */
export async function getCurrentProfile() {
  const id = await getProfileId();
  if (!id) return null;
  const profile = await prisma.profile.findUnique({ where: { id } });
  return profile;
}

/** Set the session cookie for a freshly authenticated profile. */
export async function setSession(profileId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, createSessionToken(profileId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/** Clear the session cookie (logout). */
export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
