'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Card } from '@/components/ui/primitives';
import { CourseLogo } from '@/components/app/CourseLogo';
import { courseBySlug } from '@/lib/courses/registry';
import {
  VariantAnchoredCards, VariantSelectableRows, VariantComparisonTable, type VariantProps,
} from '@/components/payments/PricingVariants';

/**
 * TEMPORARY. A side-by-side preview of the three candidate pricing-dialog layouts
 * so one can be picked at full fidelity. Delete this route, and the two losing
 * variants, once a direction is chosen.
 */

const VARIANTS: { key: string; title: string; note: string; render: (p: VariantProps) => React.ReactNode; wide: boolean }[] = [
  {
    key: 'A', title: 'Option A: anchored bundle cards', wide: true,
    note: 'Bundle raised out of the row with a ribbon tab and a struck-through anchor price.',
    render: (p) => <VariantAnchoredCards {...p} />,
  },
  {
    key: 'B', title: 'Option B: selectable rows, one button', wide: false,
    note: 'Bundle preselected. One primary call to action instead of three competing ones.',
    render: (p) => <VariantSelectableRows {...p} />,
  },
  {
    key: 'C', title: 'Option C: comparison table', wide: true,
    note: 'Feature matrix, so the bundle wins on visible completeness.',
    render: (p) => <VariantComparisonTable {...p} />,
  },
];

export default function PricingPreviewPage() {
  const course = courseBySlug('meta-ads')!;
  const [hasLearn, setHasLearn] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  return (
    <div className="min-h-screen bg-[#8c98a4] px-5 py-10">
      <div className="mx-auto max-w-[860px]">
        <div className="mb-6 rounded-[14px] border-2 border-[var(--ink)] bg-white p-4">
          <h1 className="font-display text-xl font-extrabold tracking-tight">Pricing dialog: three options</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Temporary preview page. Toggle the entitlement state to see how each layout adapts.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Toggle on={hasLearn} onClick={() => setHasLearn((v) => !v)} label="Owns Learn" />
            <Toggle on={hasRun} onClick={() => setHasRun((v) => !v)} label="Owns Run" />
          </div>
        </div>

        {VARIANTS.map((v) => (
          <section key={v.key} className="mb-10">
            <div className="mb-3 text-white drop-shadow">
              <h2 className="text-lg font-extrabold">{v.title}</h2>
              <p className="text-[13px] font-semibold opacity-90">{v.note}</p>
            </div>
            <Card className={v.wide ? 'mx-auto max-w-[760px] p-6' : 'mx-auto max-w-[640px] p-6'}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-[var(--ink)]" style={{ background: `${course.accent}2e` }}>
                    <CourseLogo courseId={course.id} emoji={course.emoji} size={44} />
                  </span>
                  <div>
                    <h3 className="text-lg font-extrabold leading-tight">{course.title}</h3>
                    <p className="text-sm font-bold" style={{ color: course.accent }}>{course.tagline}</p>
                  </div>
                </div>
                <button type="button" aria-label="Close" className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)]"><X size={18} /></button>
              </div>
              {v.render({ hasLearn, hasRun })}
              <div className="mt-4 border-t-2 border-dashed border-[var(--border-soft)] pt-3 text-center">
                <button type="button" className="text-[13px] font-bold text-[var(--text-muted)] underline">
                  Not ready? Try 2 modules free
                </button>
              </div>
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`rounded-full border-2 border-[var(--ink)] px-3 py-1 text-xs font-extrabold transition-all ${
        on ? 'bg-[var(--green)] text-white' : 'bg-white text-[var(--text-muted)]'
      }`}
    >
      {label}: {on ? 'yes' : 'no'}
    </button>
  );
}
