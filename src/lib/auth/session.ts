import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

/**
 * Auth primitives built on Node's standard crypto — no bcrypt, no jose, no external
 * auth service. Passwords are scrypt-hashed; sessions are HMAC-signed stateless tokens
 * carried in an httpOnly cookie. Fully offline, in the spirit of the rest of the app.
 */

export { SESSION_COOKIE, SESSION_MAX_AGE } from './constants';
import { SESSION_MAX_AGE } from './constants';

const SECRET = process.env.AUTH_SECRET ?? 'tiramisu-dev-secret-change-me-in-production';

if (!process.env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[auth] AUTH_SECRET is not set — using an insecure development default.');
}

// ── Passwords ────────────────────────────────────────────────────────────────

/** Hash a password as `salt:derived`, both hex. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

/** Constant-time verify. */
export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = scryptSync(password, salt, expected.length);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

// ── Session tokens ───────────────────────────────────────────────────────────

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(data: string): string {
  return createHmac('sha256', SECRET).update(data).digest('base64url');
}

export interface SessionPayload {
  sub: string; // profileId
  iat: number;
  exp: number;
}

/** Create a signed session token for a profile id. */
export function createSessionToken(profileId: string, maxAgeSec = SESSION_MAX_AGE): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { sub: profileId, iat: now, exp: now + maxAgeSec };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Verify a token's signature and expiry; return the payload or null. */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = sign(body);
  // Constant-time signature comparison.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
