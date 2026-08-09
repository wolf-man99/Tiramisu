import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { COURSES } from '@/lib/courses/registry';
import { getProfileId } from '@/lib/auth/server';
import { CourseCard } from '@/components/app/CourseCard';
import { Button } from '@/components/ui/primitives';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Courses — Tiramisu' };

export default async function CoursesPage() {
  const authed = Boolean(await getProfileId());
  const byCategory = ['Analytics', 'Paid media'] as const;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg border-2 border-[var(--ink)] bg-[var(--purple)]"><Sparkles size={17} className="text-white" /></span>
            <span className="text-[15px] font-semibold tracking-tight">Growth<span className="text-[var(--accent-text)]">SQL</span> Academy</span>
          </Link>
          {authed
            ? <Link href="/dashboard"><Button size="sm">Dashboard</Button></Link>
            : <Link href="/signup"><Button size="sm">Get started</Button></Link>}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"><ArrowLeft size={15} /> Home</Link>
        <h1 className="text-3xl font-semibold tracking-tight">All courses</h1>
        <p className="mt-1 text-[var(--text-muted)]">One platform for the whole growth stack. Take a course, or bundle several as they launch.</p>

        {byCategory.map((cat) => {
          const list = COURSES.filter((c) => c.category === cat);
          if (!list.length) return null;
          return (
            <section key={cat} className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-faint)]">{cat}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => <CourseCard key={c.id} course={c} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
