import { notFound } from 'next/navigation';
import { metaLessonBySlug, nextMetaLesson } from '@/lib/content/meta-ads';
import { requireProfileId } from '@/lib/auth/server';
import { LessonPlayer } from '@/components/meta/LessonPlayer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function MetaLessonPage({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson: slug } = await params;
  const lesson = metaLessonBySlug(slug);
  if (!lesson) notFound();
  await requireProfileId(`/courses/meta-ads/${slug}`);
  const next = nextMetaLesson(slug);

  return <LessonPlayer lesson={lesson} nextSlug={next?.slug} />;
}
