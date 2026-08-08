import { dashboardSummary } from '@/lib/progress/summary';

export const runtime = 'nodejs';

/** The dashboard payload: profile, stats, streak, weak areas, recommendations, badges. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const today = url.searchParams.get('today') ?? undefined;
  const summary = await dashboardSummary(today ?? undefined);
  return Response.json(summary);
}
