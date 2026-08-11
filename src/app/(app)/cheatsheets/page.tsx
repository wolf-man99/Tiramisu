import { ScrollText } from 'lucide-react';
import { CHEATSHEETS } from '@/lib/content/cheatsheets';
import { PageHeader } from '@/components/app/PageHeader';
import { CheatsheetTabs } from '@/components/content/CheatsheetTabs';

export const metadata = { title: 'Cheatsheets - Tiramisu' };

export default function CheatsheetsPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
      <PageHeader title="Cheatsheets" subtitle="Six runnable reference sheets, every idiom executes against the real warehouse." icon={<ScrollText size={20} />} />
      <CheatsheetTabs sheets={CHEATSHEETS} />
    </div>
  );
}
