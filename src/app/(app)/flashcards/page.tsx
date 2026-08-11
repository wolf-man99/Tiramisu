import { Layers } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { FlashcardReview } from '@/components/content/FlashcardReview';

export const metadata = { title: 'Flashcards - Tiramisu' };

export default function FlashcardsPage() {
  return (
    <div className="mx-auto max-w-xl px-5 py-8 md:px-8">
      <PageHeader title="Flashcards" subtitle="Spaced repetition over the concepts that fade: graded with SM-2, so you see hard cards more often." icon={<Layers size={20} />} />
      <FlashcardReview />
    </div>
  );
}
