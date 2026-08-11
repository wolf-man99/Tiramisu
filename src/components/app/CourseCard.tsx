'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, Check, Sparkle } from 'lucide-react';
import { type Course, STATUS_LABEL } from '@/lib/courses/registry';
import { Card } from '@/components/ui/primitives';
import { CourseLogo } from '@/components/app/CourseLogo';
import { CoursePricingModal } from '@/components/payments/CoursePricingModal';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<Course['status'], string> = {
  live: 'text-white bg-[var(--green)]',
  'in-progress': 'text-[var(--ink)] bg-[var(--amber)]',
  'coming-soon': 'text-[var(--text-muted)] bg-[var(--surface-3)]',
};

export function CourseCard({
  course, recommended = false, pricing,
}: {
  course: Course;
  recommended?: boolean;
  /** Set only for a course that has real pricing (Meta Ads today) and an authed
   *  viewer — clicking opens a pricing dialog instead of navigating straight in. */
  pricing?: { hasLearn: boolean; hasRun: boolean };
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const live = course.status === 'live';
  const nudge = recommended && live;
  const inner = (
    <Card
      hover={live || course.status === 'in-progress'}
      className={cn(
        'relative flex h-full flex-col overflow-hidden p-5',
        !live && course.status === 'coming-soon' && 'opacity-80',
        nudge && 'animate-nudge',
      )}
      style={live ? { boxShadow: `4px 4px 0 ${course.accent}`, ...(nudge ? { '--nudge-accent': course.accent } as React.CSSProperties : {}) } : undefined}
    >
      {/* A flat colour band along the top — no blur, just a block of colour. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5" style={{ background: course.accent }} />
      <div className="relative flex items-start justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-xl border-2 border-[var(--ink)]" style={{ background: `${course.accent}2e` }}>
          <CourseLogo courseId={course.id} emoji={course.emoji} size={48} />
        </span>
        <span className={cn('chip', STATUS_STYLE[course.status])}>
          {course.status === 'live' && <Check size={11} />}
          {course.status === 'coming-soon' && <Lock size={10} />}
          {STATUS_LABEL[course.status]}
        </span>
      </div>
      {nudge && (
        <span className="relative mt-2 inline-flex w-fit items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide" style={{ color: course.accent }}>
          <Sparkle size={11} /> Picked for you
        </span>
      )}
      <h3 className="relative mt-3 text-lg font-extrabold">{course.title}</h3>
      <p className="relative mt-0.5 text-sm font-bold" style={{ color: course.accent }}>{course.tagline}</p>
      <p className="relative mt-2 flex-1 text-sm text-[var(--text-muted)]">{course.description}</p>
      <div className="relative mt-3 flex flex-wrap gap-1.5">
        {course.highlights.slice(0, 3).map((h) => <span key={h} className="chip py-0 text-[10px]">{h}</span>)}
      </div>
      <div className="relative mt-4 flex items-center justify-between text-xs font-semibold text-[var(--text-subtle)]">
        <span>{course.level} · {course.duration}</span>
        {live ? (
          <span className="flex items-center gap-1 font-extrabold" style={{ color: course.accent }}>Start <ArrowRight size={13} /></span>
        ) : course.status === 'in-progress' ? (
          <span className="flex items-center gap-1 font-extrabold text-[var(--warn)]">Preview <ArrowRight size={13} /></span>
        ) : (
          <span className="text-[var(--text-faint)]">Notify me</span>
        )}
      </div>
    </Card>
  );

  if (course.status === 'coming-soon') return <div>{inner}</div>;

  const fullyPurchased = pricing && pricing.hasLearn && pricing.hasRun;
  if (pricing && !fullyPurchased) {
    return (
      <>
        <button type="button" onClick={() => setModalOpen(true)} className="block h-full w-full text-left">{inner}</button>
        {modalOpen && (
          <CoursePricingModal course={course} hasLearn={pricing.hasLearn} hasRun={pricing.hasRun} onClose={() => setModalOpen(false)} />
        )}
      </>
    );
  }

  return <Link href={course.href}>{inner}</Link>;
}
