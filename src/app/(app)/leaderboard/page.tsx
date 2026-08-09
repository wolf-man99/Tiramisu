import { Trophy } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { LeaderboardTable } from '@/components/app/LeaderboardTable';

export const metadata = { title: 'Leaderboard — Tiramisu' };

export default function LeaderboardPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8 md:px-8">
      <PageHeader title="Leaderboard" subtitle="You versus 24 analysts grinding the same curriculum. Earn XP to climb." icon={<Trophy size={20} />} />
      <LeaderboardTable />
    </div>
  );
}
