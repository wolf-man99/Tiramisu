import { ChevronDown } from 'lucide-react';
import { METHOD_LAYERS } from '@/lib/courses/stack';

/**
 * The nine layers, stacked like the dessert. Each layer sits slightly inset from the
 * one above so the stack reads as a physical object rather than a list — the same
 * ink-border + hard-shadow language as the rest of the system.
 */
export function MethodStack() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center">
      {METHOD_LAYERS.map((layer, i) => {
        // Warm cream at the top fading to the deeper base — one hue, nine steps.
        const t = i / (METHOD_LAYERS.length - 1);
        return (
          <div key={layer} className="flex w-full flex-col items-center">
            <div
              className="w-full rounded-[10px] border-2 border-[var(--ink)] px-4 py-2.5 text-center font-display text-[15px] font-extrabold shadow-[3px_3px_0_var(--ink)]"
              style={{
                background: `color-mix(in srgb, var(--amber) ${Math.round(10 + t * 55)}%, white)`,
                width: `${100 - i * 1.5}%`,
              }}
            >
              {layer}
            </div>
            {i < METHOD_LAYERS.length - 1 && (
              <ChevronDown size={16} className="my-1 shrink-0 text-[var(--text-faint)]" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}
