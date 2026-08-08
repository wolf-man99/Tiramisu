'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, GraduationCap, Terminal, Dumbbell, FolderKanban, Briefcase,
  FlaskConical, ScrollText, BookOpen, Layers, Trophy, Brain, BarChart3, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV: { group: string; items: { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] }[] = [
  {
    group: 'Learn',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/learn', label: 'Curriculum', icon: GraduationCap },
      { href: '/playground', label: 'Playground', icon: Terminal },
      { href: '/practice', label: 'Practice', icon: Dumbbell },
    ],
  },
  {
    group: 'Apply',
    items: [
      { href: '/projects', label: 'Projects', icon: FolderKanban },
      { href: '/interviews', label: 'Mock Interviews', icon: Briefcase },
      { href: '/labs', label: 'BigQuery Labs', icon: FlaskConical },
      { href: '/capstone', label: 'Capstone', icon: BarChart3 },
    ],
  },
  {
    group: 'Reference',
    items: [
      { href: '/cheatsheets', label: 'Cheatsheets', icon: ScrollText },
      { href: '/glossary', label: 'Glossary', icon: BookOpen },
      { href: '/flashcards', label: 'Flashcards', icon: Layers },
    ],
  },
  {
    group: 'Compete',
    items: [
      { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
      { href: '/badges', label: 'Badges', icon: Brain },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-subtle)]">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] shadow-[0_4px_20px_-6px_var(--accent)]">
          <Sparkles size={17} className="text-white" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight">
          Growth<span className="text-[var(--accent-text)]">SQL</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {NAV.map((section) => (
          <div key={section.group}>
            <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
              {section.group}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] font-medium'
                        : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
                    )}
                  >
                    <Icon size={17} className={active ? 'text-[var(--accent-text)]' : 'text-[var(--text-subtle)]'} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <div className="rounded-lg bg-[var(--surface)] p-3 text-xs text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text)]">Zero to analyst</span> in 14 days — one query at a time.
        </div>
      </div>
    </aside>
  );
}
