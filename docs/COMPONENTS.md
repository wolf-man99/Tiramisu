# Component hierarchy

## Legend
`S` server component · `C` client component · `I` client island inside a server page

```
RootLayout                                                                   S
├── ThemeProvider                                                            C
├── ProgressStoreProvider  (zustand, hydrated from /api/progress)            C
├── AppShell                                                                 C
│   ├── Sidebar / IconRail / MobileSheet                                     C
│   ├── Topbar                                                               C
│   │   ├── Breadcrumbs                                                      S
│   │   ├── CommandPalette          ⌘K, fuzzy over 900+ targets             C
│   │   ├── StreakPill · XpPill · LevelPill                                  C
│   │   └── ThemeToggle                                                      C
│   ├── ShortcutOverlay             ?                                        C
│   └── Toaster                                                              C
```

## Shared primitives, `components/ui/*`

`button` `card` `badge` `tabs` `dialog` `sheet` `dropdown-menu` `popover` `tooltip`
`progress` `separator` `scroll-area` `switch` `input` `textarea` `label` `skeleton`
`accordion` `collapsible` `radio-group` `table` `alert` `kbd` `empty-state`

All are Radix-backed, `cva`-variant, `forwardRef`, and accept `className` merged through
`cn()`. No component reaches outside its props for state.

## The workspace, the platform's load-bearing component

```
QueryWorkspace                                    C   ← used by 6 route families
├── WorkspaceHeader                               C
│   ├── TitleBlock (id, name, difficulty, xp)
│   ├── Timer                        (timed/interview modes)
│   ├── HintButton                   (escalating, XP-costed)
│   ├── RevealButton                 (forfeits XP, requires confirm)
│   └── RunButton / SubmitButton     (⌘⏎ / ⌘⇧⏎)
├── ResizablePanes                                C
│   ├── SchemaPane                                C
│   │   ├── DatasetTree              tables → columns, typed icons, row counts
│   │   ├── TableSearch              ⌘/
│   │   ├── ColumnPeek               sample values + null-rate on hover
│   │   └── FunctionDocs             BigQuery reference, searchable
│   ├── EditorPane                                C
│   │   ├── MonacoEditor             dynamic, ssr:false
│   │   │   ├── bigquery language    tokens, keywords, brackets, folding
│   │   │   ├── completionProvider   tables, columns, 50 BQ functions, snippets
│   │   │   ├── hoverProvider        column type + description
│   │   │   └── signatureHelp        BQ function signatures
│   │   ├── EditorToolbar            format (sql-formatter), reset, copy, dry-run
│   │   └── AutosaveIndicator        debounced 600 ms → localStorage
│   └── ResultsPane                                C
│       ├── ResultsTab
│       │   ├── ResultsGrid          virtualised, sortable, type-aligned, null-styled
│       │   ├── ExecutionMeta        rows · ms · bytes-scanned · est. cost
│       │   └── ResultChart          auto-detects a chartable shape → Recharts
│       ├── ExpectedTab              shape-only until solved, then full
│       ├── DiffTab                  missing / extra / wrong-value rows
│       ├── HintsTab                 progressively unlocked
│       ├── CoachTab                 diagnoses + optimisation notes
│       └── NotesTab                 per-item, autosaved
└── GradeResultDialog                             C   pass → XP burst, badges, next
```

## Learn

```
DayPage                                                                      S
├── DayHeader (progress, xp, gate state)                                     S
├── SectionStepper                                                           C
├── SectionRenderer                                                          S
│   ├── TheorySection                                                        S
│   │   ├── Prose (typed content nodes, not MDX, no runtime parse)          S
│   │   ├── Callout  info | warn | trap | engine-note | money                S
│   │   ├── SqlBlock (read-only Monaco-lite, copy + "open in playground")    I
│   │   └── KeyIdea                                                          S
│   ├── VisualSection                                                        I
│   │   ├── JoinVisualizer           6 join types, animated row flow         C
│   │   ├── ExecutionOrderPipeline   FROM→WHERE→GROUP BY→…, live row counts  C
│   │   ├── WindowFrameAnimator      scrub cursor, frame highlight           C
│   │   ├── NormalizationMorph       flat CSV → 3NF                          C
│   │   ├── TruthTableLab            NULL three-valued logic                 C
│   │   ├── FunnelVisual             step drop-off                           C
│   │   ├── CohortMatrix             heatmap                                 C
│   │   ├── NestedDataExplorer       STRUCT/ARRAY → UNNEST expansion         C
│   │   └── PartitionPruningViz      bytes scanned before/after              C
│   ├── ExamplesSection              worked examples, each runnable          I
│   ├── PlaygroundSection            embedded QueryWorkspace, ungraded       I
│   ├── PracticeSection              ExerciseList → QueryWorkspace           I
│   ├── QuizSection                  MCQ · predict-output · debug · explain  C
│   ├── AssessmentSection            timed, mixed-format, scored, gate       C
│   ├── ChallengeSection             one hard graded question                I
│   ├── ReflectionSection            free-text prompts, saved as notes       C
│   └── DailyProjectSection          multi-task, graded                      I
└── DayFooter (prev/next, mark complete)                                     C
```

## Dashboard

```
DashboardPage                                                                S
├── GreetingHeader                                                           S
├── StatTileRow   Streak · XP/Level · Accuracy · AvgTime · Projects          S
│   └── Sparkline / RadialProgress                                           I
├── ContinueCard                                                             S
├── DailyChallengeCard                                                       I
├── RoadmapTrack        14 nodes, states, hover preview                      I
├── WeakAreasPanel      concept mastery bars                                 I
├── RecommendationsPanel  rule-engine output with one-click actions          I
├── AccuracyTrendChart  Recharts area                                        I
├── BadgeCase           earned + locked with unlock criteria                 I
└── LeaderboardPreview  top 5 + your rank                                    S
```

## Visualisation layer, `components/viz/*`

| Component | Library | Used by |
|---|---|---|
| `JoinVisualizer` | Framer Motion + SVG | Days 6–7, JOIN cheatsheet |
| `WindowFrameAnimator` | Framer Motion | Day 10, window cheatsheet |
| `ExecutionOrderPipeline` | Framer Motion | Day 5 |
| `NestedDataExplorer` | React + Framer | Days 11–12 |
| `PartitionPruningViz` | Chart.js | Day 11, labs |
| `CostMeter` | Chart.js | Labs, dry-run |
| `FunnelChart` `CohortHeatmap` `RetentionCurve` `MrrBridge` `AttributionCompare` | Recharts | Day 13, projects, capstone |
| `AccuracyTrend` `ConceptRadar` `TimeDistribution` | Recharts | Analytics |
| `ResultChart` | Recharts | Results pane auto-viz |

## Library layer, `lib/*`

```
warehouse/  ddl · generate · engine · catalog        (server-only)
bigquery/   transpile · udf · cost · language        (language is client-safe)
grading/    compare · analyze · score
content/    curriculum/* · exercises/* · projects · interviews · labs ·
            capstone · cheatsheets · glossary · flashcards · types
progress/   xp · levels · streak · badges · srs · recommendations
utils/      cn · format · hash · prng · clipboard
```

**Import rule enforced by convention:** `components/*` never imports from
`lib/warehouse/*`. Data reaches the client only through `app/api/*` responses. Content
modules are imported by server components and passed down as props.

## State

| State | Home | Lifetime |
|---|---|---|
| Theme | `next-themes`-style provider + `localStorage` | forever |
| Draft SQL per item | `localStorage`, debounced | forever |
| Pane sizes, sidebar collapsed | `localStorage` | forever |
| XP / streak / progress | Zustand store ← `/api/progress` → Prisma | durable |
| Active exercise run/grade result | component state | per attempt |
| Hint level, timer | component state | per attempt |

Progress writes are optimistic: the store updates, the API call fires, and a failure
rolls back and toasts.
