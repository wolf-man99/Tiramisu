import { BookOpen } from 'lucide-react';
import { GLOSSARY } from '@/lib/content/glossary';
import { PageHeader } from '@/components/app/PageHeader';
import { GlossaryView } from '@/components/content/GlossaryView';

export const metadata = { title: 'Glossary - Tiramisu' };

export default function GlossaryPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
      <PageHeader title="Glossary" subtitle="Every term across SQL, BigQuery and marketing analytics, defined the way an analyst uses it." icon={<BookOpen size={20} />} />
      <GlossaryView terms={GLOSSARY} />
    </div>
  );
}
