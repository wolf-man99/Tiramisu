'use client';

import { useState } from 'react';
import { Check, AlertTriangle, MinusCircle, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { SIM_EVENTS, type SimEventOption } from '@/lib/simulator/demo-account';
import { cn } from '@/lib/utils';

const VERDICT = {
  best: { label: 'Best call', color: 'var(--green)', icon: Check },
  partial: { label: 'Defensible', color: 'var(--warn)', icon: MinusCircle },
  costly: { label: 'Costly', color: 'var(--red)', icon: AlertTriangle },
} as const;

function Outcome({ option }: { option: SimEventOption }) {
  const v = VERDICT[option.verdict];
  const Icon = v.icon;
  return (
    <div
      className="mt-3 rounded-[10px] border-2 p-3.5"
      style={{ borderColor: v.color, background: `color-mix(in srgb, ${v.color} 10%, white)` }}
    >
      <div className="flex items-center gap-1.5 text-[13px] font-extrabold" style={{ color: v.color }}>
        <Icon size={14} /> {v.label}
      </div>
      <p className="mt-1.5 text-sm text-[var(--text-muted)]">{option.outcome}</p>
    </div>
  );
}

function EventCard({ event }: { event: (typeof SIM_EVENTS)[number] }) {
  const [picked, setPicked] = useState<number | null>(null);
  const chosen = picked === null ? null : event.options[picked];

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="chip bg-[var(--ink)] text-white">Day {event.day}</span>
        {chosen && (
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="flex items-center gap-1 text-xs font-bold text-[var(--text-subtle)] hover:text-[var(--text)] focus-ring"
          >
            <RotateCcw size={12} /> Try again
          </button>
        )}
      </div>

      <h3 className="mt-3 text-lg font-extrabold">{event.title}</h3>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {event.signals.map((s) => (
          <span key={s} className="chip py-0 text-[10px] tabular-nums">{s}</span>
        ))}
      </div>

      <p className="mt-3 text-sm font-bold text-[var(--text)]">{event.prompt}</p>

      <div className="mt-3 flex flex-1 flex-col gap-2">
        {event.options.map((o, i) => {
          const isPicked = picked === i;
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => setPicked(i)}
              aria-pressed={isPicked}
              className={cn(
                'rounded-[10px] border-2 border-[var(--ink)] p-3 text-left text-sm font-bold transition-all focus-ring',
                'hover:-translate-x-px hover:-translate-y-px',
                isPicked
                  ? 'text-white shadow-none'
                  : 'bg-white text-[var(--ink)] shadow-[3px_3px_0_var(--ink)]',
                picked !== null && !isPicked && 'opacity-55',
              )}
              style={isPicked ? { background: VERDICT[o.verdict].color } : undefined}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {chosen && <Outcome option={chosen} />}
    </Card>
  );
}

export function RealityEvents() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {SIM_EVENTS.map((e) => <EventCard key={e.day} event={e} />)}
    </div>
  );
}
