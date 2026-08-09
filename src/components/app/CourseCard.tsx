import Link from 'next/link';
import { ArrowRight, Lock, Check } from 'lucide-react';
import { type Course, STATUS_LABEL } from '@/lib/courses/registry';
import { Card } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<Course['status'], string> = {
  live: 'text-[var(--success)] border-[var(--success)]/40 bg-[var(--success-soft)]',
  'in-progress': 'text-[var(--warn)] border-[var(--warn)]/40 bg-[var(--warn-soft)]',
  'coming-soon': 'text-[var(--text-subtle)] border-[var(--border-strong)] bg-[var(--surface-2)]',
};

export function CourseCard({ course }: { course: Course }) {
  const live = course.status === 'live';
  const inner = (
    <Card
      hover={live || course.status === 'in-progress'}
      className={cn('relative flex h-full flex-col overflow-hidden p-5', !live && course.status === 'coming-soon' && 'opacity-75')}
      style={{ boxShadow: live ? `0 0 0 1px ${course.accent}22` : undefined }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl" style={{ background: `${course.accent}22` }} />
      <div className="relative flex items-start justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-xl text-2xl" style={{ background: `${course.accent}1a`, border: `1px solid ${course.accent}33` }}>
          {course.emoji}
        </span>
        <span className={cn('chip border', STATUS_STYLE[course.status])}>
          {course.status === 'live' && <Check size={11} />}
          {course.status === 'coming-soon' && <Lock size={10} />}
          {STATUS_LABEL[course.status]}
        </span>
      </div>
      <h3 className="relative mt-3 font-semibold">{course.title}</h3>
      <p className="relative mt-0.5 text-sm" style={{ color: course.accent }}>{course.tagline}</p>
      <p className="relative mt-2 flex-1 text-sm text-[var(--text-muted)]">{course.description}</p>
      <div className="relative mt-3 flex flex-wrap gap-1.5">
        {course.highlights.slice(0, 3).map((h) => <span key={h} className="chip py-0 text-[10px]">{h}</span>)}
      </div>
      <div className="relative mt-4 flex items-center justify-between text-xs text-[var(--text-subtle)]">
        <span>{course.level} · {course.duration}</span>
        {live ? (
          <span className="flex items-center gap-1 font-medium" style={{ color: course.accent }}>Start <ArrowRight size={13} /></span>
        ) : course.status === 'in-progress' ? (
          <span className="flex items-center gap-1 font-medium text-[var(--warn)]">Preview <ArrowRight size={13} /></span>
        ) : (
          <span className="text-[var(--text-faint)]">Notify me</span>
        )}
      </div>
    </Card>
  );

  if (course.status === 'coming-soon') return <div>{inner}</div>;
  return <Link href={course.href}>{inner}</Link>;
}
