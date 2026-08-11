'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';
import { type Course } from '@/lib/courses/registry';
import { Card, Button } from '@/components/ui/primitives';
import { CourseLogo } from '@/components/app/CourseLogo';
import { PricingSection } from '@/components/payments/PricingSection';

/**
 * Shown when a signed-in user clicks a course card that has real pricing (Meta Ads
 * today) — surfaces the same PricingSection used on the course page itself, up
 * front, before committing to the click-through. "Try free" still lets anyone
 * skip straight to the existing free 2-module preview.
 */
export function CoursePricingModal({
  course, hasLearn, hasRun, onClose,
}: { course: Course; hasLearn: boolean; hasRun: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[color-mix(in_srgb,var(--ink)_55%,transparent)] p-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <Card
        className="w-full max-w-xl p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${course.title} pricing`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-[var(--ink)]" style={{ background: `${course.accent}2e` }}>
              <CourseLogo courseId={course.id} emoji={course.emoji} size={44} />
            </span>
            <div>
              <h2 className="text-lg font-extrabold leading-tight">{course.title}</h2>
              <p className="text-sm font-bold" style={{ color: course.accent }}>{course.tagline}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]">
            <X size={18} />
          </button>
        </div>

        <PricingSection hasLearn={hasLearn} hasRun={hasRun} />

        {!(hasLearn && hasRun) && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-[var(--text-faint)]">
              <div className="h-px flex-1 bg-[var(--border)]" /> or <div className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <Link href={course.href} onClick={onClose} className="block">
              <Button variant="secondary" size="lg" className="w-full justify-center gap-2">
                {hasLearn ? 'Go to course — decide on Run later' : 'Try 2 modules free — decide later'} <ArrowRight size={15} />
              </Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
