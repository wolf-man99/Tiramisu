import { signup } from '@/lib/auth/users';
import { setSession } from '@/lib/auth/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: { email?: string; password?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!body.email || !body.password) {
    return Response.json({ error: 'Email and password are required.' }, { status: 400 });
  }
  const result = await signup(body.email, body.password, body.displayName);
  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });
  await setSession(result.profileId!);
  return Response.json({ ok: true });
}
