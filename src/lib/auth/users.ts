import { randomBytes } from 'node:crypto';
import { prisma } from '../db';
import { hashPassword, verifyPassword } from './session';
import { isValidLearningGoal, isValidHeardFrom } from './onboarding';
import { COURSES } from '../courses/registry';

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
// Lenient on purpose — accepts international formats (+, spaces, dashes, parens)
// without enforcing a specific country's numbering plan.
const PHONE_RE = /^[+\d][\d\s\-()]{6,19}$/;

function referral(): string {
  return randomBytes(4).toString('hex');
}

/** Derive a friendly display name from an email local-part. */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0].replace(/[._-]+/g, ' ');
  return local.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40) || 'Analyst';
}

export interface SignupOnboarding {
  displayName: string;
  phone: string;
  courseInterest: string;
  learningGoal: string;
  heardFrom: string;
}

/** Sign up with email + password, plus the required onboarding fields. */
export async function signup(email: string, password: string, onboarding: SignupOnboarding): Promise<AuthResult> {
  email = email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Enter a valid email address.' };
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };

  const displayName = onboarding.displayName.trim();
  if (!displayName) return { ok: false, error: 'Enter your name.' };

  const phone = onboarding.phone.trim();
  if (!PHONE_RE.test(phone)) return { ok: false, error: 'Enter a valid phone number.' };

  if (!COURSES.some((c) => c.id === onboarding.courseInterest)) {
    return { ok: false, error: 'Choose which course you want to learn.' };
  }
  if (!isValidLearningGoal(onboarding.learningGoal)) {
    return { ok: false, error: 'Choose what you’re learning for.' };
  }
  if (!isValidHeardFrom(onboarding.heardFrom)) {
    return { ok: false, error: 'Let us know how you heard about Tiramisu.' };
  }

  const existing = await prisma.profile.findUnique({ where: { email } });
  if (existing) return { ok: false, error: 'An account with that email already exists.' };

  const profile = await prisma.profile.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      provider: 'credentials',
      displayName: displayName || nameFromEmail(email),
      avatarSeed: email,
      referralCode: referral(),
      phone,
      courseInterest: onboarding.courseInterest,
      learningGoal: onboarding.learningGoal,
      heardFrom: onboarding.heardFrom,
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
