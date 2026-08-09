import { QueryWorkspace } from '@/components/workspace/QueryWorkspace';

export const metadata = { title: 'SQL Playground — Tiramisu' };

const STARTER = `-- The Northbeam marketing warehouse — 28 tables, ~240k rows, all real.
-- Try: which channel had the best blended ROAS last quarter?
SELECT channel,
       ROUND(SUM(spend), 0)            AS spend,
       ROUND(SUM(platform_revenue), 0) AS revenue,
       ROUND(SAFE_DIVIDE(SUM(platform_revenue), SUM(spend)), 2) AS roas
FROM ad_spend_daily
WHERE date BETWEEN '2024-10-01' AND '2024-12-31'
GROUP BY channel
ORDER BY roas DESC`;

export default function PlaygroundPage() {
  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <QueryWorkspace initialSql={STARTER} />
    </div>
  );
}
