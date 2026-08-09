'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, Loader } from 'lucide-react';
import { SECTION_ORDER } from '@/lib/content/types';
import { Button } from '@/components/ui/primitives';
import posthog from '@/lib/posthog/client';

/** Marks every section of a day complete — the simple "I finished this day" control. */
export function LessonComplete({ day, done }: { day: number; done: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(done);

  const finish = async () => {
    setSaving(true);
    try {
      const results = await Promise.all(
        SECTION_ORDER.map((section) =>
          fetch('/api/progress/lesson', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ dayNumber: day, section, status: 'complete' }),
          }),
        ),
      );
      if (!results.every((result) => result.ok)) return;
      posthog.capture('lesson_day_completed', { day_number: day });
      setComplete(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  if (complete) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--success)] bg-[var(--success-soft)] px-4 py-2 text-sm font-medium text-[var(--success)]">
        <CircleCheck size={16} /> Day {day} complete
      </div>
    );
  }
  return (
    <Button onClick={finish} disabled={saving}>
      {saving ? <Loader size={15} className="animate-spin" /> : <CircleCheck size={15} />} Mark day complete
    </Button>
  );
}
