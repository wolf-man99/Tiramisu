import type { MetaModule, MetaLesson } from './types';
import { M1_LESSONS } from './modules/m1-foundations';
import { M2_LESSONS } from './modules/m2-audiences';

/** The Meta Ads course. Two modules are authored and playable; the rest are on the way. */
export const META_MODULES: MetaModule[] = [
  { slug: 'foundations', index: 1, title: 'Foundations', tagline: 'Structure, the auction, objectives & metrics', emoji: '🧱', status: 'available', lessons: M1_LESSONS },
  { slug: 'audiences', index: 2, title: 'Audiences & the Pixel', tagline: 'How Meta measures, and who you can reach', emoji: '🎯', status: 'available', lessons: M2_LESSONS },
  { slug: 'creative', index: 3, title: 'Creative that converts', tagline: 'Hooks, formats, and UGC frameworks', emoji: '🎬', status: 'coming-soon', lessons: [] },
  { slug: 'budgets-cbo', index: 4, title: 'Budgets & CBO', tagline: 'Campaign Budget Optimization vs ad-set budgets', emoji: '💰', status: 'coming-soon', lessons: [] },
  { slug: 'testing', index: 5, title: 'The testing method', tagline: 'Isolate variables without starving learning', emoji: '🧪', status: 'coming-soon', lessons: [] },
  { slug: 'optimising', index: 6, title: 'Reading & optimising', tagline: 'Frequency, fatigue, and what to change when', emoji: '📈', status: 'coming-soon', lessons: [] },
  { slug: 'scaling', index: 7, title: 'Scaling', tagline: 'Horizontal vs vertical, and when to duplicate', emoji: '🚀', status: 'coming-soon', lessons: [] },
];

export const META_LESSONS: MetaLesson[] = META_MODULES.flatMap((m) => m.lessons);

export function metaModuleBySlug(slug: string): MetaModule | undefined {
  return META_MODULES.find((m) => m.slug === slug);
}

export function metaLessonBySlug(slug: string): MetaLesson | undefined {
  return META_LESSONS.find((l) => l.slug === slug);
}

/** The item id used to record a lesson completion (course-scoped). */
export function metaLessonItemId(lesson: MetaLesson): string {
  return `${lesson.moduleSlug}/${lesson.slug}`;
}

/** Ordered lesson slugs, for "next lesson" navigation. */
export const META_LESSON_ORDER: string[] = META_LESSONS.map((l) => l.slug);

export function nextMetaLesson(slug: string): MetaLesson | undefined {
  const i = META_LESSON_ORDER.indexOf(slug);
  return i >= 0 && i + 1 < META_LESSONS.length ? META_LESSONS[i + 1] : undefined;
}

export const META_TOTAL_XP = META_LESSONS.reduce((a, l) => a + l.xp, 0);
export const META_AVAILABLE_LESSONS = META_LESSONS.length;
