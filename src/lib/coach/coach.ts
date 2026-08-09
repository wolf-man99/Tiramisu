import { analyze, type Analysis, type AnalyzeInput, type CoachNote } from './analyze';
import { exerciseById } from '../content/exercises';

/**
 * The coach. Its spine is the deterministic {@link analyze} static analyser — always
 * available, free, and offline. When an `ANTHROPIC_API_KEY` is configured it can layer
 * a natural-language mentor message on top, built strictly from the deterministic
 * diagnosis and bound by a system prompt that forbids ever revealing the answer.
 *
 * The LLM is never the source of truth for correctness — grading is done by result-set
 * comparison elsewhere. The coach only explains, hints and encourages.
 */

export interface CoachRequest extends AnalyzeInput {
  /** The exercise/task prompt, so the mentor can reference what was asked. */
  taskPrompt?: string;
  /** Ask for the optional LLM mentor paragraph on top of the static analysis. */
  wantMentor?: boolean;
  exerciseId?: string;
}

export interface CoachResponse {
  analysis: Analysis;
  /** A short mentor paragraph. Present only when the LLM layer ran. */
  mentor?: string;
  /** How the mentor text was produced. */
  mentorSource: 'llm' | 'deterministic' | 'none';
}

const MODEL = process.env.COACH_MODEL ?? 'claude-opus-5';
const API_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are the AI SQL mentor inside Tiramisu, a platform that
teaches marketers BigQuery SQL. You are coaching a learner on one exercise.

Absolute rules, in priority order:
1. NEVER write the solution query, or any fragment that hands them the answer. Not the
   final SELECT, not the exact WHERE clause, not the specific function call they are
   missing. If you catch yourself about to write runnable SQL that solves the task, stop.
2. Coach with questions and concepts. Point at the SHAPE of the mistake ("your LEFT JOIN
   filters in WHERE — what happens to the unmatched rows?") and let them make the fix.
3. Be a mentor, not a cheerleader. Two or three sentences. Warm, direct, specific to
   their query. No preamble, no "Great question!", no restating the prompt.
4. Ground every claim in the diagnosis you are given. Do not invent facts about their
   result set.

You will receive: the task, the learner's SQL, and a structured diagnosis from the
platform's own analyser. Turn that into one short, human paragraph of guidance.`;

function buildUserMessage(req: CoachRequest, analysis: Analysis): string {
  const notes = analysis.notes.map((n: CoachNote) => `- (${n.tone}) ${n.title}: ${n.body}`).join('\n');
  return [
    req.taskPrompt ? `TASK:\n${req.taskPrompt}` : null,
    `LEARNER SQL:\n${req.sql}`,
    `DIAGNOSIS: ${analysis.diagnosis} — ${analysis.headline}`,
    `ANALYSER NOTES:\n${notes}`,
    req.passed
      ? 'They passed. Affirm what they did well in one sentence, then offer one concrete way to make the query cleaner or cheaper.'
      : 'They have not passed yet. Give one nudge toward the fix without writing any SQL.',
  ].filter(Boolean).join('\n\n');
}

async function callAnthropic(system: string, user: string, signal?: AbortSignal): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: user }],
    }),
    signal,
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    stop_reason?: string;
    content?: { type: string; text?: string }[];
  };
  // Safety classifiers can decline (HTTP 200, stop_reason "refusal") — fall back.
  if (data.stop_reason === 'refusal') return null;
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('')
    .trim();
  return text || null;
}

/** A deterministic mentor paragraph, assembled from the analysis when no LLM is available. */
function deterministicMentor(analysis: Analysis): string {
  const lead = analysis.notes.find((n) => n.tone === 'hint')
    ?? analysis.notes.find((n) => n.tone === 'warn')
    ?? analysis.notes[0];
  if (!lead) return analysis.headline;
  return `${analysis.headline} ${lead.body}`;
}

/**
 * Coach a submission. Always returns the static analysis; adds a mentor paragraph when
 * asked, preferring the LLM and falling back to a deterministic summary.
 */
export async function coach(req: CoachRequest, opts: { timeoutMs?: number } = {}): Promise<CoachResponse> {
  // Enrich with exercise concepts if we can resolve the id.
  const enriched: AnalyzeInput = { ...req };
  if (req.exerciseId && !req.concepts) {
    enriched.concepts = exerciseById(req.exerciseId)?.concepts;
  }

  const analysis = analyze(enriched);

  if (!req.wantMentor) {
    return { analysis, mentorSource: 'none' };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12_000);
    try {
      const text = await callAnthropic(SYSTEM_PROMPT, buildUserMessage(req, analysis), controller.signal);
      if (text) return { analysis, mentor: text, mentorSource: 'llm' };
    } catch {
      // network/timeout — fall through to deterministic
    } finally {
      clearTimeout(timer);
    }
  }

  return { analysis, mentor: deterministicMentor(analysis), mentorSource: 'deterministic' };
}

/** Whether the richer LLM mentor is available in this deployment. */
export function coachHasLlm(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
