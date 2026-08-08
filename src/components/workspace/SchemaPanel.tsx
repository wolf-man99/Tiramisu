'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Table as TableIcon, Database, KeyRound } from 'lucide-react';
import { cn, compactNumber } from '@/lib/utils';

interface Col { name: string; type: string; description: string; pk: boolean; fk: string | null; nullable: boolean }
interface Tbl { name: string; kind: string; grain: string; group: string; columns: Col[]; partitionBy?: string; clusterBy?: string[] }
interface Grp { group: string; tables: Tbl[] }

/** The playground's left schema browser: groups → tables → columns. */
export function SchemaPanel({ onInsert }: { onInsert?: (text: string) => void }) {
  const [groups, setGroups] = useState<Grp[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/schema').then((r) => r.json()).then((d) => {
      setGroups(d.groups);
      setCounts(d.rowCounts);
      // Open the first group by default.
      if (d.groups[0]) setOpen({ [d.groups[0].group]: true });
    }).catch(() => {});
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">
        <Database size={14} /> Warehouse
        <span className="ml-auto chip">{groups.reduce((a, g) => a + g.tables.length, 0)} tables</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {groups.map((g) => (
          <div key={g.group} className="mb-1">
            <button
              onClick={() => setOpen((o) => ({ ...o, [g.group]: !o[g.group] }))}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-faint)] hover:text-[var(--text-muted)]"
            >
              <ChevronRight size={13} className={cn('transition-transform', open[g.group] && 'rotate-90')} />
              {g.group}
            </button>
            {open[g.group] && g.tables.map((t) => <TableItem key={t.name} table={t} count={counts[t.name]} onInsert={onInsert} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function TableItem({ table, count, onInsert }: { table: Tbl; count?: number; onInsert?: (t: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="ml-1">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--surface-2)]"
        title={table.grain}
      >
        <TableIcon size={13} className="shrink-0 text-[var(--accent-text)]" />
        <span
          className="flex-1 truncate text-[13px] mono"
          onClick={(e) => { e.stopPropagation(); onInsert?.(table.name); }}
        >
          {table.name}
        </span>
        {table.kind === 'view' && <span className="chip py-0 text-[9px]">view</span>}
        {count != null && <span className="text-[10px] text-[var(--text-faint)]">{compactNumber(count)}</span>}
        <ChevronRight size={12} className={cn('shrink-0 text-[var(--text-faint)] transition-transform', expanded && 'rotate-90')} />
      </button>
      {expanded && (
        <div className="ml-5 border-l border-[var(--border)] pl-2">
          {table.partitionBy && <div className="px-2 py-1 text-[10px] text-[var(--info)]">⊞ partition: {table.partitionBy}</div>}
          {table.columns.map((c) => (
            <button
              key={c.name}
              onClick={() => onInsert?.(c.name)}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-[var(--surface-2)]"
              title={c.description}
            >
              {c.pk && <KeyRound size={10} className="text-[var(--warn)]" />}
              <span className="flex-1 truncate text-[12px] mono text-[var(--text-muted)]">{c.name}</span>
              <span className="text-[10px] text-[var(--text-faint)]">{c.type.split('<')[0]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
