import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/primitives';

/**
 * Shared marketing nav + footer. Previously duplicated inline in / and /courses;
 * kept identical here so the two pages cannot drift apart.
 *
 * No Simulator link: the simulator lives as a demo section on the homepage and has
 * no route of its own yet. It gets a nav slot when it becomes a real page.
 */
export function SiteHeader({ authed }: { authed: boolean }) {
  return (
    <header className="sticky top-0 z-30 glass">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border-2 border-[var(--ink)] bg-[var(--purple)] shadow-[3px_3px_0_var(--ink)]">
            <Sparkles size={17} className="text-white" />
          </span>
          <span className="font-display text-[20px] font-extrabold tracking-tight">Tiramisu</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/courses"
            className="hidden rounded-lg px-3 py-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)] sm:block"
          >
            Courses
          </Link>
          {authed ? (
            <Link href="/dashboard"><Button size="sm">Go to dashboard <ArrowRight size={14} /></Button></Link>
          ) : (
            <>
              <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)]">
                Sign in
              </Link>
              <Link href="/signup"><Button size="sm">Get started</Button></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t-2 border-[var(--ink)] bg-[var(--bg-subtle)] py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 md:px-8">
        <span className="text-sm font-semibold text-[var(--text-subtle)]">
          © {new Date().getFullYear()} Tiramisu — learn the layers, master the whole.
        </span>
        <Link href="/courses" className="text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text)]">
          Courses
        </Link>
      </div>
    </footer>
  );
}
