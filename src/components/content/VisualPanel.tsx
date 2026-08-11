import {
  GitMerge, Layers, PanelsTopLeft, Split, Table2, Filter, Boxes, Waypoints,
  BarChartBig, Grid3x3, Route, Network,
} from 'lucide-react';
import type { VisualKind } from '@/lib/content/types';

const ICON: Record<VisualKind, React.ComponentType<{ size?: number; className?: string }>> = {
  normalization: Boxes, grain: Table2, 'select-projection': Filter, 'truth-table': Grid3x3,
  'execution-order': Route, 'join-visualizer': GitMerge, fanout: Split, 'date-spine': Waypoints,
  'case-pivot': Grid3x3, 'cte-pipeline': Layers, 'window-frame': PanelsTopLeft,
  'partition-pruning': Layers, 'nested-data': Boxes, funnel: BarChartBig, 'cohort-matrix': Grid3x3,
  'attribution-compare': Network,
};

/** A stylised visual placeholder: a labelled, animated concept panel. */
export function VisualPanel({ kind, title, caption }: { kind: VisualKind; title: string; caption: string }) {
  const Icon = ICON[kind] ?? Layers;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--bg-subtle)] p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--accent-soft)] blur-3xl" />
      <div className="relative flex items-center gap-5">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)]">
          <Icon size={34} className="text-[var(--accent-text)]" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">Interactive visual</div>
          <h3 className="mt-0.5 text-lg font-semibold">{title}</h3>
          <p className="mt-1 max-w-lg text-sm text-[var(--text-muted)]">{caption}</p>
        </div>
      </div>
      <div className="relative mt-6 flex gap-1.5">
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full bg-[var(--accent)]"
            style={{ opacity: 0.15 + 0.5 * Math.abs(Math.sin(i * 0.9)), animation: `pulse 2s ${i * 0.08}s ease-in-out infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
