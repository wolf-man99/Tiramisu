'use client';

/** Renders a query result set as a scrollable table with sticky headers. */
export function ResultsGrid({ columns, rows }: { columns: string[]; rows: unknown[][] }) {
  if (!columns.length) return null;
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map((c, i) => (
              <th key={i} className="border-b border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 text-left font-semibold text-[var(--text-muted)] whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="hover:bg-[var(--surface-2)]">
              {row.map((cell, c) => (
                <td key={c} className="border-b border-[var(--border)] px-3 py-1.5 mono whitespace-nowrap tabular-nums">
                  {renderCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderCell(v: unknown) {
  if (v === null || v === undefined) return <span className="text-[var(--text-faint)] italic">NULL</span>;
  if (typeof v === 'number') return <span>{Number.isInteger(v) ? v : Math.round(v * 1e6) / 1e6}</span>;
  if (typeof v === 'boolean') return <span className="text-[var(--info)]">{String(v)}</span>;
  return <span className="text-[var(--text)]">{String(v)}</span>;
}
