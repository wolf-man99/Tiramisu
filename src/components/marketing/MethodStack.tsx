'use client';

import { Fragment, useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import { METHOD_LAYERS } from '@/lib/courses/stack';
import { cn } from '@/lib/utils';

const COUNT = METHOD_LAYERS.length;

/**
 * The nine layers, as an interactive stack.
 *
 * Reads as a physical object: slabs of deepening amber, each sitting on the one
 * below. Opening a slab reveals what that layer actually teaches, so the section
 * carries real content instead of nine bare nouns.
 *
 * Layout trick: the detail panel is a *single* element rendered immediately after
 * the open slab. On mobile the container is a flex column, so it lands inline like
 * an accordion — the detail appears right under the thing you tapped. On lg+ the
 * container becomes a grid and the panel's inline grid-column/grid-row pin it to a
 * sticky sidebar regardless of its DOM position. Flex containers ignore grid-*
 * placement, so the same inline style is inert on mobile and load-bearing on
 * desktop — one element, no duplicated content for screen readers.
 *
 * Slabs render in their final state by default, so the section is complete before
 * hydration and without JS; the build-in animation is layered on once it scrolls in.
 */
export function MethodStack() {
  const [active, setActive] = useState(0);
  const [building, setBuilding] = useState(false);
  const stackRef = useRef<HTMLDivElement>(null);
  const slabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Kick the build-in exactly once, when the stack first enters the viewport.
  useEffect(() => {
    const el = stackRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBuilding(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const last = COUNT - 1;
    let next: number | null = null;
    if (e.key === 'ArrowDown') next = active === last ? 0 : active + 1;
    else if (e.key === 'ArrowUp') next = active === 0 ? last : active - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    slabRefs.current[next]?.focus();
  }, [active]);

  return (
    <div
      ref={stackRef}
      onKeyDown={onKeyDown}
      className={cn(
        'flex flex-col gap-1.5',
        'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:gap-x-6 lg:gap-y-1.5',
        building && 'is-building',
      )}
    >
      {METHOD_LAYERS.map((l, i) => {
        const open = i === active;
        // Deepening amber down the stack — light sponge at the top, rich base below.
        const tint = `color-mix(in srgb, var(--amber) ${12 + (i / (COUNT - 1)) * 52}%, white)`;
        return (
          <Fragment key={l.name}>
            <button
              ref={(el) => { slabRefs.current[i] = el; }}
              type="button"
              aria-expanded={open}
              aria-controls="layer-detail"
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              style={{
                '--i': i,
                background: open ? 'var(--ink)' : tint,
                gridColumn: 1,
                gridRow: i + 1,
              } as React.CSSProperties}
              className={cn(
                'slab group flex items-center gap-3 rounded-[10px] border-2 border-[var(--ink)] px-4 py-3 text-left',
                'transition-[transform,box-shadow,background-color] duration-150 focus-ring',
                open
                  ? 'text-white shadow-[5px_5px_0_var(--amber)] lg:translate-x-1'
                  : 'text-[var(--ink)] shadow-[3px_3px_0_var(--ink)] hover:-translate-y-px',
              )}
            >
              <span className="mono grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-current text-[11px] font-bold tabular-nums">
                {i + 1}
              </span>
              <span className="font-display text-[15px] font-extrabold">{l.name}</span>
              <span
                className={cn(
                  'ml-auto hidden truncate text-xs font-semibold md:block',
                  open ? 'text-white/75' : 'text-[var(--text-muted)]',
                )}
              >
                {l.summary}
              </span>
              <ArrowRight
                size={14}
                className={cn(
                  'ml-auto shrink-0 transition-opacity md:ml-0',
                  open ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
                )}
                aria-hidden
              />
            </button>

            {open && (
              <div
                id="layer-detail"
                style={{ gridColumn: 2, gridRow: `1 / span ${COUNT}` }}
                className="animate-swap self-start rounded-[14px] border-2 border-[var(--ink)] bg-white p-5 shadow-[3px_3px_0_var(--ink)] lg:sticky lg:top-24"
              >
                <span className="mono text-xs font-bold tabular-nums text-[var(--text-faint)]">
                  Layer {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-1 font-display text-xl font-extrabold tracking-tight">{l.name}</h3>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{l.detail}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {l.skills.map((s) => <span key={s} className="chip py-0 text-[10px]">{s}</span>)}
                </div>
                <p className="mt-4 hidden border-t-2 border-[var(--border-soft)] pt-3 text-xs text-[var(--text-subtle)] lg:block">
                  Hover, or use ↑ ↓ to move through the stack.
                </p>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
