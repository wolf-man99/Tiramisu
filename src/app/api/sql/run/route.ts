import { runQuery, QueryError } from '@/lib/warehouse/engine';
import { estimateCost } from '@/lib/bigquery/cost';
import { rowCounts } from '@/lib/warehouse/engine';

export const runtime = 'nodejs';

const MAX_SQL = 20_000;

/** Execute a learner query against the read-only warehouse and return the result. */
export async function POST(req: Request) {
  let body: { sql?: string; withCost?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const sql = (body.sql ?? '').trim();
  if (!sql) return Response.json({ error: 'No SQL provided.' }, { status: 400 });
  if (sql.length > MAX_SQL) return Response.json({ error: 'Query is too long.' }, { status: 400 });

  try {
    const r = runQuery(sql);
    const cost = body.withCost ? estimateCost(sql, rowCounts()) : undefined;
    return Response.json({
      ok: true,
      columns: r.columns,
      rows: r.rows.slice(0, 500),
      rowCount: r.rowCount,
      truncated: r.truncated || r.rows.length > 500,
      ms: r.ms,
      notes: r.notes,
      compiledSql: r.compiledSql,
      cost,
    });
  } catch (e) {
    const err = e as QueryError;
    return Response.json(
      { ok: false, error: err.message, kind: err.kind ?? 'error', hint: err.hint },
      { status: 200 },
    );
  }
}
