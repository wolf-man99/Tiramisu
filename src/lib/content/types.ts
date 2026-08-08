/**
 * Content types.
 *
 * All course content is typed data, not MDX: the compiler validates 300 exercises,
 * `npm run validate:content` executes every reference solution against the warehouse,
 * and server components render it without shipping any of it to the browser.
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export const DIFFICULTY_XP: Record<Difficulty, number> = {
  easy: 40,
  medium: 80,
  hard: 140,
  expert: 220,
};

export interface Exercise {
  /** `module.index`, e.g. `3.14`. Stable — it is the URL and the attempt key. */
  id: string;
  module: number;
  day: number;
  title: string;
  /** The business question, phrased as a colleague would ask it. */
  prompt: string;
  difficulty: Difficulty;
  concepts: string[];
  /** Tables the schema panel should open to. */
  tables: string[];
  starter?: string;
  /** Reference solution. Executed at grade time to produce the expected result. */
  solution: string;
  /** Escalating. The last one may name the technique, never the whole query. */
  hints: string[];
  /** Set when the question depends on row order ("top 5", "earliest"). */
  orderMatters?: boolean;
  /** Shown after solving: why the answer is what it is, and what it means. */
  explanation?: string;
  /** The specific mistake this exercise exists to surface. */
  trap?: string;
  /** Reference solutions legitimately return no rows for a few anti-join questions. */
  allowEmpty?: boolean;
}

// ─────────────────────────────────────────────────────────── curriculum ──

export type SectionKind =
  | 'theory' | 'visual' | 'examples' | 'playground' | 'practice'
  | 'quiz' | 'assessment' | 'challenge' | 'reflection' | 'project';

export const SECTION_ORDER: SectionKind[] = [
  'theory', 'visual', 'examples', 'playground', 'practice',
  'quiz', 'assessment', 'challenge', 'reflection', 'project',
];

export const SECTION_LABEL: Record<SectionKind, string> = {
  theory: 'Theory',
  visual: 'Visual',
  examples: 'Examples',
  playground: 'Playground',
  practice: 'Practice',
  quiz: 'Quiz',
  assessment: 'Assessment',
  challenge: 'Challenge',
  reflection: 'Reflection',
  project: 'Daily project',
};

export type CalloutTone = 'info' | 'warn' | 'trap' | 'engine' | 'money' | 'key';

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'list'; ordered?: boolean; items: string[] }
  | { kind: 'callout'; tone: CalloutTone; title: string; text: string }
  | { kind: 'sql'; code: string; caption?: string; runnable?: boolean }
  | { kind: 'table'; headers: string[]; rows: string[][]; caption?: string }
  | { kind: 'compare'; left: { title: string; code: string }; right: { title: string; code: string }; verdict: string }
  | { kind: 'keyidea'; text: string };

/** Names of the animated explainers in `components/viz`. */
export type VisualKind =
  | 'normalization' | 'grain' | 'select-projection' | 'truth-table'
  | 'execution-order' | 'join-visualizer' | 'fanout' | 'date-spine'
  | 'case-pivot' | 'cte-pipeline' | 'window-frame' | 'partition-pruning'
  | 'nested-data' | 'funnel' | 'cohort-matrix' | 'attribution-compare';

export interface WorkedExample {
  title: string;
  question: string;
  sql: string;
  takeaway: string;
}

export type QuizQuestion =
  | {
    kind: 'mcq';
    id: string;
    prompt: string;
    code?: string;
    options: string[];
    answer: number;
    explanation: string;
  }
  | {
    kind: 'predict';
    id: string;
    prompt: string;
    code: string;
    options: string[];
    answer: number;
    explanation: string;
  }
  | {
    kind: 'debug';
    id: string;
    prompt: string;
    code: string;
    options: string[];
    answer: number;
    explanation: string;
  }
  | {
    kind: 'explain';
    id: string;
    prompt: string;
    code: string;
    options: string[];
    answer: number;
    explanation: string;
  }
  | {
    kind: 'order';
    id: string;
    prompt: string;
    /** Correct order. The UI shuffles them deterministically per attempt. */
    items: string[];
    explanation: string;
  };

export interface ProjectTask {
  id: string;
  title: string;
  brief: string;
  solution: string;
  hints: string[];
  orderMatters?: boolean;
  /** Renders the learner's own result as a chart in the dashboard preview. */
  chart?: ChartSpec;
}

export interface ChartSpec {
  type: 'bar' | 'line' | 'area' | 'funnel' | 'heatmap' | 'scatter' | 'pie';
  /** Column indexes into the learner's result set. */
  x: number;
  y: number | number[];
  title: string;
}

export interface Project {
  slug: string;
  index: number;
  title: string;
  subtitle: string;
  scenario: string;
  deliverable: string;
  difficulty: Difficulty;
  unlockDay: number;
  tables: string[];
  tasks: ProjectTask[];
  badge: string;
}

export interface InterviewQuestion {
  id: string;
  prompt: string;
  difficulty: Difficulty;
  /** Seconds. The timer is advisory; it never blocks submission. */
  timeLimit: number;
  solution: string;
  hints: string[];
  orderMatters?: boolean;
  /** What a strong candidate says out loud before writing SQL. */
  interviewerNote: string;
  followUp?: string;
}

export interface InterviewSet {
  slug: string;
  company: string;
  role: string;
  blurb: string;
  /** What this company's SQL round actually optimises for. */
  style: string;
  difficulty: Difficulty;
  questions: InterviewQuestion[];
}

export interface LabStep {
  title: string;
  body: string;
  sql?: string;
  /** Compare bytes scanned before/after — the point of most labs. */
  measure?: boolean;
  task?: { prompt: string; solution: string; hints: string[]; orderMatters?: boolean };
}

export interface Lab {
  slug: string;
  index: number;
  title: string;
  subtitle: string;
  objective: string;
  concepts: string[];
  steps: LabStep[];
}

export interface CapstoneQuestion {
  id: string;
  section: string;
  prompt: string;
  difficulty: Difficulty;
  solution: string;
  hints: string[];
  orderMatters?: boolean;
  /** The business decision this number informs. */
  soWhat: string;
}

export interface CheatsheetEntry {
  id: string;
  name: string;
  syntax: string;
  description: string;
  example: string;
  /** A marketing question this idiom answers. */
  useCase: string;
  concepts: string[];
}

export interface Cheatsheet {
  slug: string;
  title: string;
  subtitle: string;
  groups: Array<{ name: string; entries: CheatsheetEntry[] }>;
}

export interface GlossaryTerm {
  term: string;
  category: 'SQL' | 'BigQuery' | 'Marketing';
  short: string;
  long: string;
  related?: string[];
  formula?: string;
}

export interface FlashcardSeed {
  id: string;
  deck: string;
  front: string;
  back: string;
  concept: string;
}

export interface DayContent {
  day: number;
  module: number;
  moduleTitle: string;
  title: string;
  subtitle: string;
  objective: string;
  estimatedMinutes: number;
  concepts: string[];
  theory: Block[];
  visual: { kind: VisualKind; title: string; caption: string };
  examples: WorkedExample[];
  playground: { prompt: string; starter: string };
  /** Exercise ids drawn from the exercise bank. */
  practice: string[];
  quiz: QuizQuestion[];
  assessment: { passScore: number; timeLimitSec: number; questions: QuizQuestion[]; exerciseIds: string[] };
  challenge: string;
  reflection: string[];
  project: { title: string; brief: string; tasks: ProjectTask[] };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  /** Human-readable unlock criterion, shown on locked badges. */
  criterion: string;
}
