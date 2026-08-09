'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, GraduationCap, Terminal, Dumbbell, FolderKanban, Briefcase,
  FlaskConical, ScrollText, BookOpen, Layers, Trophy, Brain, BarChart3, Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV: { group: string; items: { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] }[] = [
  {
    group: 'Learn',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
  const isActive = (href: string) => (href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href));

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r-2 border-[var(--ink)] bg-[var(--bg-subtle)]">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--purple)] border-2 border-[var(--ink)] shadow-[3px_3px_0_var(--ink)]">
          <Sparkles size={18} className="text-white" />
        </span>
        <span className="font-display text-[19px] font-extrabold tracking-tight">Tiramisu</span>
      </Link>

      {/* Current course + switcher */}
      <div className="px-3 pb-2">
        <Link href="/courses" className="flex items-center gap-2.5 rounded-[10px] border-2 border-[var(--ink)] bg-[var(--surface)] px-3 py-2 shadow-[3px_3px_0_var(--ink)] transition-all hover:-translate-x-px hover:-translate-y-px">
          <span className="grid h-7 w-7 place-items-center rounded-lg border-2 border-[var(--ink)] bg-[var(--purple)] text-sm">🗃️</span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-bold">SQL for Marketers</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-faint)]">Switch course</div>
          </div>
          <ChevronLeft size={14} className="rotate-180 text-[var(--text-faint)]" />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {NAV.map((section) => (
          <div key={section.group}>
            <div className="px-3 pb-1.5 eyebrow">{section.group}</div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all',
                      active
                        ? 'border-[var(--ink)] bg-[var(--ink)] font-bold text-white'
                        : 'border-transparent text-[var(--text-muted)] hover:border-[var(--ink)] hover:bg-white hover:text-[var(--ink)]',
                    )}
                  >
                    <Icon size={17} className={active ? 'text-white' : 'text-[var(--text-subtle)]'} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t-2 border-[var(--ink)] p-3">
        <div className="rounded-[10px] border-2 border-[var(--ink)] bg-[var(--green)] p-3 text-xs font-semibold text-white">
          <span className="font-extrabold">Zero to analyst</span> in 14 days — one query at a time.
        </div>
      </div>
    </aside>
  );
}
