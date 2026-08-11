# GrowthSQL Academy

**A multi-course platform for growth & performance marketers.** Interactive, gamified,
hands-on courses, starting with **SQL for Marketers** (live now), with **Meta Ads**,
**Google Ads**, and LinkedIn / Reddit / Snapchat Ads on the way.

Learners sign up (email + password, or Google), and their XP, streaks, badges and
per-course progress save to their account. A platform-wide leaderboard lets people
learn together and compete; an invite/share flow brings friends in.

## SQL for Marketers (the first course)

**Zero to marketing analyst in 14 days.** Takes a Growth / Performance Marketer from no
SQL to independently analysing marketing data in Google BigQuery: a real editor, a real
warehouse, an AI coach, and 300 graded exercises, all in one app.

Not another SQL tutorial. Every lesson, example and exercise is built on realistic
Growth / SaaS / e-commerce data: Google, Meta and LinkedIn ads, GA4, HubSpot,
Salesforce, Stripe, orders, subscriptions and attribution. You learn SQL by answering
the questions a growth team actually argues about: highest-ROAS campaign, lowest-CAC
channel, D7/D30 retention, MRR bridge, six attribution models side by side.

## What's inside

- **14-day curriculum** across 12 modules. Each day: theory, an interactive visual,
  worked examples, a playground, graded practice, a quiz, a timed assessment, a
  challenge, reflection, and a daily project.
- **300 graded exercises**, **10 projects**, **10 mock interviews** (Google → Zomato),
  **9 BigQuery labs**, a **100-question capstone**, **6 runnable cheatsheets**, a
  **~70-term glossary**, and **48 spaced-repetition flashcards**.
- **A real SQL playground**: Monaco editor, a browsable 28-table warehouse, live
  execution, and a dry-run cost estimator that teaches BigQuery economics.
- **An AI coach** that diagnoses mistakes and coaches with questions, never answers.
  deterministic by default, with an optional Anthropic-backed mentor.
- **Gamification**: XP, levels, coins, a 44-badge catalogue, streaks with freezes,
  weak-area detection, AI recommendations, and a live leaderboard.

## How it works

The headline trick: **real BigQuery SQL runs locally, with no cloud dependency.** A
token-level transpiler plus ~50 UDFs rewrite BigQuery dialect onto Node 22's built-in
SQLite, and a deterministic generator builds a ~240k-row marketing warehouse on disk.
Grading is by result-set comparison against a reference solution executed at grade time,
so answers can never drift from the data.

See [`docs/`](./docs) for the full design: `PRD.md`, `ARCHITECTURE.md`,
`DATA-MODEL.md`, `CURRICULUM.md`, `WIREFRAMES.md`, `COMPONENTS.md`, `ROADMAP.md`.

## Stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS v4 · Prisma + SQLite ·
Monaco · Framer Motion / Recharts · `node:sqlite` for the warehouse engine.

## Running locally

Requires **Node 22+** (for the built-in `node:sqlite` module).

```bash
npm install
npm run dev        # runs setup (db + warehouse) then starts on http://localhost:3000
```

`predev` / `prebuild` automatically create the SQLite learner DB, seed it, and build the
marketing warehouse on first run. The seed creates a ready-to-use demo account:

```
demo@growthsql.academy  /  demopass123
```

### Accounts & auth

Sign-in is email + password (scrypt-hashed) with HMAC-signed session cookies. No
external auth service, fully offline. Optional Google sign-in activates when
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set (see `.env`). Set `AUTH_SECRET` to a
long random value in production.

### Optional: the AI mentor

The coach works fully offline. To enable the natural-language mentor layer, set
`ANTHROPIC_API_KEY` in `.env` (optionally `COACH_MODEL`, default `claude-opus-5`).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run check` | typecheck + lint + engine smoke tests + content validation |
| `npm run smoke` | 41 query-engine cases against the warehouse |
| `npm run validate:content` | executes every reference solution (706 SQL items) |
| `npm run warehouse` | (re)build the marketing warehouse |

## Quality gates

- **41/41** engine smoke tests · **706/706** content SQL items execute cleanly ·
  **35** data-realism assertions · 0 type errors · 0 lint problems · clean production
  build.
