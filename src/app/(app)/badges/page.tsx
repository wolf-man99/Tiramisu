import { Award, Lock } from 'lucide-react';
import { dashboardSummary } from '@/lib/progress/summary';
import { BADGE_TIER_ORDER } from '@/lib/content/badges';
import { PageHeader } from '@/components/app/PageHeader';
import { requireProfileId } from '@/lib/auth/server';
import { cn } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIER_META: Record<string, { emoji: string; color: string; label: string }> = {
  bronze: { emoji: '🥉', color: '#cd7f32', label: 'Bronze' },
  silver: { emoji: '🥈', color: '#c0c0c8', label: 'Silver' },
  gold: { emoji: '🥇', color: '#f5c542', label: 'Gold' },
  platinum: { emoji: '💎', color: '#7dd3fc', label: 'Platinum' },
};

export default async function BadgesPage() {
  const profileId = await requireProfileId('/badges');
  const s = await dashboardSummary(profileId);
  const earned = s.badges.filter((b) => b.earned).length;

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
      <PageHeader title="Badges" subtitle={`${earned} of ${s.badges.length} earned — proof of the habits, not just the hours.`} icon={<Award size={20} />} />

      <div className="space-y-8">
        {BADGE_TIER_ORDER.map((tier) => {
          const tierBadges = s.badges.filter((b) => b.tier === tier);
          const meta = TIER_META[tier];
          return (
            <div key={tier}>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">{meta.emoji}</span>
                <h2 className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</h2>
                <span className="text-xs text-[var(--text-faint)]">{tierBadges.filter((b) => b.earned).length}/{tierBadges.length}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tierBadges.map((b) => (
                  <div
                    key={b.id}
                    className={cn('flex items-start gap-3 rounded-xl border p-4', b.earned ? 'border-[var(--border-strong)] bg-[var(--surface)]' : 'border-dashed border-[var(--border)] opacity-60')}
                    style={b.earned ? { boxShadow: `0 0 0 1px ${meta.color}22` } : undefined}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--surface-2)] text-xl">
                      {b.earned ? meta.emoji : <Lock size={16} className="text-[var(--text-faint)]" />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{b.name}</div>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">{b.earned ? b.description : b.criterion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
