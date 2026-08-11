# Information architecture & wireframes

## 1. Site map

```
/                       Dashboard
/learn                  Roadmap, 14 days as a track
  /learn/[day]          Day page: 10 sections in a stepper
/playground             Full-screen SQL IDE (schema | editor | results)
/practice               Mode picker
  /practice/[mode]      easy medium hard expert interview blind timed random daily weekly
/projects               10 project cards
  /projects/[slug]      Brief + tasks + graded submissions + deliverable
/interviews             10 company cards
  /interviews/[slug]    Timed, escalating question set + debrief
/labs                   9 BigQuery labs
  /labs/[slug]          Lab with dry-run cost meter
/cheatsheets            6 interactive cheatsheets
  /cheatsheets/[slug]
/glossary               SQL | BigQuery | Marketing, searchable
/flashcards             SM-2 review session
/capstone               Northbeam case: 100 questions, 8 sections
/leaderboard
/analytics              Personal learning analytics
/settings
```

## 2. Global shell

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌─────────────────────────────────────────────────────────┐  │
│ │          │ │  TOPBAR                                                  │  │
│ │  SIDEBAR │ │  [breadcrumb]        [⌘K search] [🔥7] [⚡2,480] [Lv 8] │  │
│ │  64px    │ ├─────────────────────────────────────────────────────────┤  │
│ │  ⇄ 240px │ │                                                          │  │
│ │          │ │  PAGE                                                    │  │
│ │  ◆ Home  │ │                                                          │  │
│ │  ▸ Learn │ │                                                          │  │
│ │  ⌘ Play  │ │                                                          │  │
│ │  ⚑ Pract │ │                                                          │  │
│ │  ▤ Proj  │ │                                                          │  │
│ │  ☰ Intvw │ │                                                          │  │
│ │  ⬡ Labs  │ │                                                          │  │
│ │  ▦ Cheat │ │                                                          │  │
│ │  ✦ Cards │ │                                                          │  │
│ │  ★ Caps  │ │                                                          │  │
│ │  ⬆ Board │ │                                                          │  │
│ │  ◔ Stats │ │                                                          │  │
│ └──────────┘ └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

Sidebar collapses to icon-rail at `< 1280px` and to a sheet at `< 768px`.
`⌘K` opens a command palette over everything: jump to any day, exercise, table, glossary
term, or run a saved query.

## 3. Dashboard

```
┌─ Good evening, Analyst ─────────────────────────  Day 6 of 14 ── 43% ──────┐
│                                                                            │
│ ┌─🔥 Streak──┐ ┌─⚡ XP──────┐ ┌─◎ Accuracy─┐ ┌─⏱ Avg time─┐ ┌─▤ Projects─┐ │
│ │  7 days    │ │ 2,480      │ │   74%      │ │   1m 52s   │ │   3 / 10   │ │
│ │ ▁▃▅▇▇▅▇    │ │ Lv 8 ▓▓▓░░ │ │ ▲ +6% wk   │ │ ▼ -18s wk  │ │            │ │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘ └────────────┘ │
│                                                                            │
│ ┌─ CONTINUE ────────────────────────────┐ ┌─ TODAY'S CHALLENGE ──────────┐ │
│ │ Day 6 · JOINs: INNER and LEFT         │ │ ⚑ Which keyword generated    │ │
│ │ ▓▓▓▓▓▓▓░░░  7/10 sections             │ │   the highest revenue?       │ │
│ │ Next: Assessment                      │ │   Medium · 120 XP · ⏱ 8:00   │ │
│ │                        [ Resume → ]   │ │              [ Start → ]     │ │
│ └───────────────────────────────────────┘ └──────────────────────────────┘ │
│                                                                            │
│ ┌─ ROADMAP ─────────────────────────────────────────────────────────────┐ │
│ │ ①──②──③──④──⑤──⑥──⑦──⑧──⑨──⑩──⑪──⑫──⑬──⑭                            │ │
│ │ ✓  ✓  ✓  ✓  ✓  ◐  ·  ·  ·  ·  ·  ·  ·  ·                            │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ ┌─ WEAK AREAS ──────────────┐ ┌─ AI RECOMMENDATIONS ────────────────────┐ │
│ │ null-handling    38% ▓░░░ │ │ ① 4 of your last 6 misses involved      │ │
│ │ join-fanout      44% ▓▓░░ │ │   LEFT JOIN + WHERE. Do drill 6.11.     │ │
│ │ having           51% ▓▓░░ │ │ ② You haven't revised `distinct` in     │ │
│ │ date-diff        58% ▓▓▓░ │ │   9 days. 6 cards are due.             │ │
│ └───────────────────────────┘ └─────────────────────────────────────────┘ │
│                                                                            │
│ ┌─ ACCURACY OVER TIME ──────────────────┐ ┌─ BADGES ──┐ ┌─ LEADERBOARD ─┐ │
│ │      ╭─╮      ╭──╮                     │ │ 🏅🥇🔥⚡  │ │ 1 Priya  4,120 │ │
│ │ ╭────╯ ╰──────╯  ╰───                  │ │ ▦▦▦░░░░░  │ │ 2 You    2,480 │ │
│ └───────────────────────────────────────┘ └───────────┘ └───────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

## 4. Day page (`/learn/[day]`)

Left rail is a 10-beat stepper; content column renders the active section; right rail
holds notes + the day's concepts.

```
┌── Day 6 · JOINs: INNER and LEFT ────────────────── 7/10 ─ 340 XP earned ──┐
│┌──────────────┐┌──────────────────────────────────┐┌──────────────────────┐│
││ ✓ 1 Theory   ││                                  ││  CONCEPTS            ││
││ ✓ 2 Visual   ││   ## Why joins exist             ││  inner-join          ││
││ ✓ 3 Examples ││                                  ││  left-join           ││
││ ✓ 4 Playgrnd ││   [prose, callouts, engine notes]││  anti-join           ││
││ ✓ 5 Practice ││                                  ││                      ││
││ ✓ 6 Quiz     ││   ┌─ worked example ───────────┐ ││  NOTES               ││
││ ✓ 7 Assess   ││   │ SQL + [Run] + result grid  │ ││  ┌────────────────┐  ││
││ ◐ 8 Challenge││   └────────────────────────────┘ ││  │ my notes…      │  ││
││ · 9 Reflect  ││                                  ││  └────────────────┘  ││
││ · 10 Project ││        [ ← Back ]  [ Continue → ]││  [🔖 Bookmark]       ││
│└──────────────┘└──────────────────────────────────┘└──────────────────────┘│
└────────────────────────────────────────────────────────────────────────────┘
```

## 5. Playground / exercise workspace

The same three-pane component serves the playground, every exercise, projects,
interviews and the capstone, only the header and the right pane's tabs change.

```
┌─ 3.14 · Wasted spend ─── Medium ─── ⚡80 ─── ⏱ 02:41 ── [Hint] [Reveal] [Run ⌘⏎]┐
│┌────────────────────┐┌────────────────────────────┐┌─────────────────────────┐│
││ SCHEMA             ││ 1  SELECT                  ││ Results  Expected  Hints││
││ ▾ marketing_analyt.││ 2    campaign_name,        ││ ┌─────────────────────┐ ││
││   ▸ orders      6k ││ 3    SUM(cost) AS spend    ││ │ campaign_name │spend│ ││
││   ▾ google_ads_… 14k││4  FROM google_ads_daily d ││ │ GB_Search_…   │ 4120│ ││
││     # campaign_id  ││ 5  JOIN google_ads_campai… ││ │ US_PMax_…     │ 3890│ ││
││     A campaign_name││ 6    ON …                  ││ └─────────────────────┘ ││
││     $ cost         ││ 7  GROUP BY 1              ││ ✓ 12 rows · 6 ms        ││
││   ▸ ga4_events  62k││                            ││ ┌─ COACH ─────────────┐ ││
││                    ││                            ││ │ Your row count is   │ ││
││ [Search tables ⌘/] ││                            ││ │ 18, expected 12.    │ ││
││                    ││                            ││ │ Look at your WHERE  │ ││
││ DOCS               ││                            ││ │ on an outer join…   │ ││
││ SAFE_DIVIDE(x, y)  ││                            ││ └─────────────────────┘ ││
│└────────────────────┘└────────────────────────────┘└─────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────────┘
```

Panes are resizable and persisted. In **Blind mode** the schema pane is hidden. In
**Timed mode** the timer turns amber at 60 s and red at 15 s.

## 6. Practice mode picker

Nine cards in a 3×3 grid. Each shows: name, one-line rule, exercise pool size, personal
best, and a coloured difficulty band. Interview / Timed / Blind cards carry a rule chip
("no schema panel", "8 minutes", "one attempt").

## 7. Projects

```
┌─ Project 3 · Marketing Dashboard ──────────────── 4/7 tasks ── 620 XP ─────┐
│ BRIEF                                        │ TASKS                        │
│ The CMO wants one page that answers…         │ ✓ 1 Channel scorecard        │
│ Deliverable: 7 queries + a written readout   │ ✓ 2 Spend trend              │
│                                              │ ✓ 3 CAC by channel           │
│ DATA: ad_spend_daily, orders, customers,     │ ✓ 4 Funnel                   │
│       ga4_sessions, attribution_touchpoints  │ ◐ 5 Cohort retention         │
│                                              │ · 6 LTV:CAC                  │
│ [ Open task 5 → ]                            │ · 7 Executive summary        │
└────────────────────────────────────────────────────────────────────────────┘
```

Completed tasks render their chart in a live dashboard preview built from the learner's
own query output, the project *is* the dashboard.

## 8. Interview

Full-bleed, distraction-free. One question, a timer, no schema panel by default, an
"ask a clarifying question" affordance that returns the kind of terse answer a real
interviewer gives. Debrief at the end scores correctness, speed and query quality, and
names the two concepts to revise.

## 9. Cheatsheets

Two-column: a searchable index of idioms on the left, an interactive card on the right
with a runnable snippet, a "run it" button that drops it into the playground, and a
worked marketing example. Filter chips by concept. `⌘F` scoped to the sheet.

## 10. Responsive rules

| Breakpoint | Behaviour |
|---|---|
| ≥ 1536 | Three panes, sidebar expanded |
| 1280–1535 | Three panes, sidebar rail |
| 1024–1279 | Editor + results side by side; schema becomes a drawer |
| 768–1023 | Vertical stack: editor over results; schema in a sheet |
| < 768 | Read/review only for lessons; editor available but with a warning that a keyboard is strongly recommended |

## 11. Motion

Purposeful only. Page transitions 140 ms. Join/window visualisers run 600–1800 ms with
scrubbing. XP gains use a spring counter. Every animation is wrapped in a
`useReducedMotion()` check that collapses it to an instant state change.

## 12. Keyboard map

| Key | Action |
|---|---|
| `⌘K` | Command palette |
| `⌘⏎` | Run query |
| `⌘⇧⏎` | Submit for grading |
| `⌘/` | Focus schema search |
| `⌘B` | Toggle sidebar |
| `⌘S` | Save note |
| `⌘⇧F` | Format SQL |
| `?` | Shortcut overlay |
| `H` | Next hint (outside editor) |
| `J`/`K` | Next/previous exercise |
| `⌘\` | Toggle results pane |
