import { dashboardSummary } from '@/lib/progress/summary';
import { getProfileId } from '@/lib/auth/server';

export const runtime = 'nodejs';

/** The dashboard payload: profile, stats, streak, weak areas, recommendations, badges. */
export async function GET(req: Request) {
  const profileId = await getProfileId();
  if (!profileId) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  const url = new URL(req.url);
  const today = url.searchParams.get('today') ?? undefined;
  const courseId = url.searchParams.get('course') ?? undefined;
  const summary = await dashboardSummary(profileId, courseId ?? undefined, today ?? undefined);
  return Response.json(summary);
}
