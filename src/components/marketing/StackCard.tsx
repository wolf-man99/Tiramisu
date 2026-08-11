import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { type StackLayer, STACK_ITEM_LABEL } from '@/lib/courses/stack';
import { Card } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

/**
 * One layer of the skill stack. `detailed` is the /courses treatment, every tool
 * carries its own status pill. The homepage uses the compact form, which keeps the
 * cards visually clean and defers the detail to /courses.
 */
export function StackCard({ layer, detailed = false }: { layer: StackLayer; detailed?: boolean }) {
  return (
    // h-full only in compact mode: there the chips wrap to similar heights and a
    // uniform row looks intentional. In detailed mode h-full would resolve to the
    // grid row height and stretch a short layer into a tall empty box.
    <Card className={cn('relative flex flex-col overflow-hidden p-5', !detailed && 'h-full')}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5" style={{ background: layer.accent }} />

      <div className="relative flex items-baseline gap-2.5">
        <span className="font-display text-2xl font-extrabold tabular-nums" style={{ color: layer.accent }}>
          {layer.index}
        </span>
        <h3 className="text-lg font-extrabold">{layer.title}</h3>
      </div>
      <p className="relative mt-1 text-sm text-[var(--text-muted)]">{layer.tagline}</p>

      <div className={cn('relative mt-4 flex-1', detailed ? 'flex flex-col gap-2' : 'flex flex-wrap gap-1.5')}>
        {layer.items.map((item) =>
          detailed ? (
            <ItemRow key={item.label} label={item.label} status={item.status} href={item.href} accent={layer.accent} />
          ) : (
            <span
              key={item.label}
              className={cn('chip py-0 text-[10px]', item.status === 'live' && 'bg-[var(--green)] text-white')}
            >
              {item.status === 'live' && <Check size={10} />}
              {item.label}
            </span>
          ),
        )}
      </div>
    </Card>
  );
}

function ItemRow({
  label, status, href, accent,
}: {
  label: string;
  status: StackLayer['items'][number]['status'];
  href?: string;
  accent: string;
}) {
  const live = status === 'live';
  const body = (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-[10px] border-2 border-[var(--ink)] px-3 py-2',
        live ? 'bg-white shadow-[3px_3px_0_var(--ink)] lift' : 'bg-[var(--surface-2)]',
      )}
      style={live ? { boxShadow: `3px 3px 0 ${accent}` } : undefined}
    >
      <span className={cn('text-sm font-bold', !live && 'text-[var(--text-muted)]')}>{label}</span>
      <span
        className={cn(
          'chip shrink-0 py-0 text-[10px]',
          live && 'bg-[var(--green)] text-white',
          status === 'coming-next' && 'bg-[var(--amber)] text-[var(--ink)]',
          status === 'coming-soon' && 'bg-[var(--surface-3)] text-[var(--text-muted)]',
        )}
      >
        {live && <Check size={10} />}
        {STACK_ITEM_LABEL[status]}
        {live && <ArrowRight size={10} />}
      </span>
    </div>
  );

  return href && live ? <Link href={href}>{body}</Link> : body;
}
