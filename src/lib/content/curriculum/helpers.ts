import type { Block, CalloutTone, ProjectTask, QuizQuestion } from '../types';

/** Compact block constructors. The curriculum is 14 days of these. */
export const p = (text: string): Block => ({ kind: 'p', text });
export const h = (text: string): Block => ({ kind: 'h', text });
export const list = (items: string[], ordered = false): Block => ({ kind: 'list', ordered, items });
export const key = (text: string): Block => ({ kind: 'keyidea', text });
export const call = (tone: CalloutTone, title: string, text: string): Block =>
  ({ kind: 'callout', tone, title, text });
export const sql = (code: string, caption?: string, runnable = true): Block =>
  ({ kind: 'sql', code: code.trim(), caption, runnable });
export const table = (headers: string[], rows: string[][], caption?: string): Block =>
  ({ kind: 'table', headers, rows, caption });
export const compare = (
  leftTitle: string, leftCode: string, rightTitle: string, rightCode: string, verdict: string,
): Block => ({
  kind: 'compare',
  left: { title: leftTitle, code: leftCode.trim() },
  right: { title: rightTitle, code: rightCode.trim() },
  verdict,
});

export const mcq = (
  id: string, prompt: string, options: string[], answer: number, explanation: string, code?: string,
): QuizQuestion => ({ kind: 'mcq', id, prompt, options, answer, explanation, code });

export const predict = (
  id: string, prompt: string, code: string, options: string[], answer: number, explanation: string,
): QuizQuestion => ({ kind: 'predict', id, prompt, code: code.trim(), options, answer, explanation });

export const debug = (
  id: string, prompt: string, code: string, options: string[], answer: number, explanation: string,
): QuizQuestion => ({ kind: 'debug', id, prompt, code: code.trim(), options, answer, explanation });

export const explain = (
  id: string, prompt: string, code: string, options: string[], answer: number, explanation: string,
): QuizQuestion => ({ kind: 'explain', id, prompt, code: code.trim(), options, answer, explanation });

export const order = (id: string, prompt: string, items: string[], explanation: string): QuizQuestion =>
  ({ kind: 'order', id, prompt, items, explanation });

export const task = (
  id: string, title: string, brief: string, solution: string, hints: string[],
  extra: Partial<ProjectTask> = {},
): ProjectTask => ({ id, title, brief, solution: solution.trim(), hints, ...extra });
