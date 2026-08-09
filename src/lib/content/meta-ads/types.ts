import type { Block } from '../types';

/**
 * Content model for the Meta Ads course. Unlike the SQL course (which grades real
 * queries), an ad course teaches judgement — so a lesson is a sequence of stepped
 * "cards": teaching cards interleaved with interactive checks. The learner answers to
 * advance, and finishes with XP. The same model will power Google/LinkedIn/etc.
 */

export type DiagramVariant =
  | 'campaign-structure'
  | 'funnel'
  | 'auction'
  | 'pixel-flow'
  | 'audiences'
  | 'cbo'
  | 'creative-anatomy'
  | 'metrics-flow'
  | 'creative-formats'
  | 'learning-phase'
  | 'testing-matrix'
  | 'fatigue-curve'
  | 'scaling-paths';

export type CalcVariant =
  | 'roas'
  | 'breakeven-roas'
  | 'cpa'
  | 'budget-split'
  | 'learning-budget'
  | 'frequency';

export type MetaCard =
  | { kind: 'teach'; id: string; title?: string; art?: DiagramVariant; blocks: Block[] }
  | { kind: 'tip'; id: string; title: string; text: string }
  | { kind: 'diagram'; id: string; variant: DiagramVariant; title: string; caption: string }
  | { kind: 'mcq'; id: string; prompt: string; options: string[]; answer: number; explain: string }
  | { kind: 'multi'; id: string; prompt: string; options: string[]; answers: number[]; explain: string }
  | { kind: 'truefalse'; id: string; statement: string; isTrue: boolean; explain: string }
  | { kind: 'scenario'; id: string; situation: string; options: { label: string; correct: boolean; feedback: string }[] }
  | { kind: 'sort'; id: string; prompt: string; items: string[]; explain: string } // `items` already in correct order
  | { kind: 'calc'; id: string; variant: CalcVariant; title: string; blurb: string };

export interface MetaLesson {
  slug: string;
  moduleSlug: string;
  title: string;
  subtitle: string;
  minutes: number;
  xp: number;
  objective: string;
  cards: MetaCard[];
}

export interface MetaModule {
  slug: string;
  index: number;
  title: string;
  tagline: string;
  emoji: string;
  status: 'available' | 'coming-soon';
  lessons: MetaLesson[];
}

/** True when a card requires an answer before the learner may continue. */
export function isInteractive(card: MetaCard): boolean {
  return ['mcq', 'multi', 'truefalse', 'scenario', 'sort'].includes(card.kind);
}

/** Reusable prose helpers so authoring reads cleanly. */
export const p = (text: string): Block => ({ kind: 'p', text });
export const h = (text: string): Block => ({ kind: 'h', text });
export const list = (items: string[], ordered = false): Block => ({ kind: 'list', ordered, items });
export const key = (text: string): Block => ({ kind: 'keyidea', text });
