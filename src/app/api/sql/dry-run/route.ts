import { estimateCost } from '@/lib/bigquery/cost';
import { rowCounts } from '@/lib/warehouse/engine';

export const runtime = 'nodejs';

/** Estimate a query's bytes-scanned cost without executing it. */
export async function POST(req: Request) {
  let body: { sql?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const sql = (body.sql ?? '').trim();
  if (!sql) return Response.json({ error: 'No SQL provided.' }, { status: 400 });
  return Response.json(estimateCost(sql, rowCounts()));
}
