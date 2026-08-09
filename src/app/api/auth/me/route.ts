import { getCurrentProfile } from '@/lib/auth/server';
import { googleConfigured } from '@/lib/auth/google';

export const runtime = 'nodejs';

/** The signed-in user (or null), for client components that need auth state. */
export async function GET() {
  const p = await getCurrentProfile();
  return Response.json({
    authenticated: Boolean(p),
    googleEnabled: googleConfigured(),
    user: p
      ? { id: p.id, displayName: p.displayName, email: p.email, image: p.image, avatarSeed: p.avatarSeed, level: p.level, referralCode: p.referralCode }
      : null,
  });
}
