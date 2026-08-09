import { randomBytes } from 'node:crypto';
import { prisma } from '../db';
import { hashPassword, verifyPassword } from './session';

/**
 * Account creation and authentication. Kept separate from the HTTP layer so the same
 * logic can be reused by the Google callback and any future admin tooling.
 */

export interface AuthResult {
  ok: boolean;
  profileId?: string;
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function referral(): string {
  return randomBytes(4).toString('hex');
}

/** Derive a friendly display name from an email local-part. */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0].replace(/[._-]+/g, ' ');
  return local.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40) || 'Analyst';
}

/** Sign up with email + password. */
export async function signup(email: string, password: string, displayName?: string): Promise<AuthResult> {
  email = email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Enter a valid email address.' };
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };

  const existing = await prisma.profile.findUnique({ where: { email } });
  if (existing) return { ok: false, error: 'An account with that email already exists.' };

  const profile = await prisma.profile.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      provider: 'credentials',
      displayName: displayName?.trim() || nameFromEmail(email),
      avatarSeed: email,
      referralCode: referral(),
    },
  });
  return { ok: true, profileId: profile.id };
}

/** Log in with email + password. */
export async function login(email: string, password: string): Promise<AuthResult> {
  email = email.trim().toLowerCase();
  const profile = await prisma.profile.findUnique({ where: { email } });
  if (!profile || !profile.passwordHash) {
    return { ok: false, error: 'No account found, or wrong sign-in method.' };
  }
  if (!verifyPassword(password, profile.passwordHash)) {
    return { ok: false, error: 'Incorrect email or password.' };
  }
  return { ok: true, profileId: profile.id };
}

/** Upsert a Google-authenticated user by googleId (or link to an existing email). */
export async function upsertGoogleUser(google: {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}): Promise<AuthResult> {
  const email = google.email?.trim().toLowerCase();
  const byGoogle = await prisma.profile.findUnique({ where: { googleId: google.sub } });
  if (byGoogle) return { ok: true, profileId: byGoogle.id };

  // Link to an existing email account if one exists.
  if (email) {
    const byEmail = await prisma.profile.findUnique({ where: { email } });
    if (byEmail) {
      await prisma.profile.update({
        where: { id: byEmail.id },
        data: { googleId: google.sub, image: google.picture ?? byEmail.image, emailVerified: true },
      });
      return { ok: true, profileId: byEmail.id };
    }
  }

  const profile = await prisma.profile.create({
    data: {
      email,
      googleId: google.sub,
      provider: 'google',
      emailVerified: true,
      image: google.picture,
      displayName: google.name?.slice(0, 40) || (email ? nameFromEmail(email) : 'Analyst'),
      avatarSeed: email ?? google.sub,
      referralCode: referral(),
    },
  });
  return { ok: true, profileId: profile.id };
}
