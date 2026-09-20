# CareerTwin Frontend

> UI for **CareerTwin** — Personalized Career & Skill Navigator. If you only work in `frontend/`, this file is all you need.

**What this folder is:** a React + Vite + TypeScript single-page app with 6 screens: Landing → Profile → Analysis → Roadmap → Progress → Eval. It never computes gaps, priorities, or schedules itself — it renders exactly what the backend API (`http://localhost:8000/api`) returns, per the frozen contract in `docs/SPEC.md` §10.

**You can run it with zero backend:** mock mode serves typed fixtures + real sample responses, so the full user journey works offline.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Screens (6 Routes)](#screens-6-routes)
- [Folder Structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [How It Talks to the Backend](#how-it-talks-to-the-backend)
- [Mock Mode (Backend-Free Development)](#mock-mode-backend-free-development)
- [State Management](#state-management)
- [Routes & Guards](#routes--guards)
- [Components Guide](#components-guide)
- [Scripts](#scripts)
- [Rules for Contributors](#rules-for-contributors)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Piece | Choice |
|---|---|
| UI | React 18 + Vite 5 (dev server on port **5173**) |
| Language | TypeScript **strict** (`noImplicitAny`, `noUnusedLocals/Parameters`, `noFallthroughCasesInSwitch`) |
| Routing | `react-router-dom` v6 |
| State | `zustand` v4 (`src/store/useStore.ts`) |
| Styling | Tailwind CSS v3 + PostCSS + Autoprefixer (custom `primary` / `priority` / `status` colors in `tailwind.config.js`) |
| Charts / Graphs | `recharts` (radar, bars, gauge) + `@xyflow/react` v12 (roadmap dependency graph) |
| Icons | `lucide-react` |
| HTTP | Native `fetch` via `src/api/client.ts` (always sends `X-User-Id: demo`) |

---

## Screens (6 Routes)

| Route | File | What it does |
|---|---|---|
| `/` | `src/pages/LandingPage.tsx` | One CTA → Start. |
| `/profile` | `src/pages/ProfilePage.tsx` | 4-step flow: About you → Skills input → Target role → Extracted-skills review. Form + resume PDF upload → editable chips with evidence snippets. Calls `POST /profile`, `GET /roles`, `POST /roles/custom`, `POST /analyze`. |
| `/analysis` | `src/pages/AnalysisPage.tsx` | **Protected.** Readiness gauge, radar (current vs target, top 8), gap bars sorted by priority, top-3 gaps + strengths. Reads `state.analysis` from store. |
| `/roadmap` | `src/pages/RoadmapPage.tsx` | **Protected.** Timeline (`RoadmapTimelineView`) + dependency graph (`RoadmapGraphView` via React Flow) + summary strip. Item drawer shows resources, hours, prerequisites, criteria, `why`. |
| `/progress` | `src/pages/ProgressPage.tsx` | **Protected.** Checklist to mark skill/activity complete or "already known", `DiffBanner` after each replan, `TodayCard`, market-update button, `CoachPanel` chat. Calls `/progress/*`, `/today`, `/market/update`, `/coach`. |
| `/eval` | `src/pages/EvalPage.tsx` | **Public.** Pass-rate dashboard: summary card, per-category metrics, persona table (expected vs predicted gaps), ADK trajectory block. Calls `GET /eval/report`; shows `EvalNotRunState` when missing. |

Header shows a 5-step indicator (Profile → Analysis → Roadmap → Progress → Eval) with real completion state; footer shows LLM provider chip (`meta`), `Reset demo` button, and `API: OK / Down / Mock Mode` status.

---

## Folder Structure

```
frontend/
├─ README.md                  # this file
├─ package.json               # scripts + deps (react, vite, zustand, recharts, @xyflow/react, ...)
├─ vite.config.ts             # Vite + React plugin, server.port = 5173
├─ tsconfig.json              # strict TS, include: ["src"]
├─ tailwind.config.js         # content: index.html + src/**, theme.extend.colors (primary/priority/status)
├─ postcss.config.js
├─ index.html                 # #root mount, /src/main.tsx entry, favicon.svg
├─ .env.example               # VITE_API_BASE_URL, VITE_USE_MOCK
├─ public/favicon.svg
└─ src/
   ├─ main.tsx                # ReactDOM root + <App/> + index.css
   ├─ App.tsx                 # BrowserRouter, Navigation, Footer, Routes + RouteGuard wiring
   ├─ index.css               # Tailwind directives
   ├─ vite-env.d.ts
   ├─ api/
   │  ├─ client.ts            # apiClient<T> + ApiError + dev contract-drift warnings
   │  └─ endpoints.ts         # 13 typed functions (getHealth ... getEvalReport), mock/real switch
   ├─ types/api.ts            # TS mirror of SPEC §10.2 (Profile, Gap, RoadmapItem, Diff, Coach, EvalReport, ...)
   ├─ mocks/
   │  ├─ mockService.ts       # Stateful fake backend (latency 300-600ms, RAG/market flows, custom roles)
   │  ├─ fixtures.ts          # Re-exports of sample_responses as typed mocks
   │  ├─ index.ts
   │  └─ sample_responses/    # Real backend outputs: analyze, roadmap, profile, roles(_custom),
   │                          # progress_complete/_known, market_update, today, coach, eval_report, health
   ├─ store/
   │  ├─ useStore.ts          # Zustand: profile, roles, state, lastDiff, today, coachMessages, evalReport, ...
   │  └─ index.ts
   ├─ components/
   │  ├─ RouteGuard.tsx       # Protected-route wrapper (tries GET /roadmap, else -> /profile)
   │  ├─ ui/                 # Badge, Button, Card, Drawer, EmptyState, ErrorBanner, Gauge,
   │  │                      # ProgressBar, Skeleton, Spinner, Stat, Toast (+ ToastProvider)
   │  ├─ profile/            # AboutYouStep, SkillsInputStep, TargetRoleSelector, ExtractedSkillsReview
   │  ├─ analysis/           # TopGapsSummary, GapList, RadarChartCard, CategoryScoreBars, StrengthsCard
   │  ├─ roadmap/            # RoadmapSummaryStrip, RoadmapTimelineView, RoadmapGraphView, RoadmapItemDrawer
   │  ├─ progress/           # RoadmapChecklist, DiffBanner, TodayCard, FocusNextUpCard, CoachPanel
   │  └─ eval/               # EvalSummaryCard, CategoryMetricsList, PersonasTable, AdkEvalBlock, EvalNotRunState
   └─ pages/                  # Landing, Profile, Analysis, Roadmap, Progress, Eval (see table above)
```

---

## Prerequisites

- **Node.js 18+** and npm (`node --version`, `npm --version`)
- **Git**
- Backend **optional**: needed only when `VITE_USE_MOCK=false` (then run backend on `http://localhost:8000` first — see repo-root `README.md`).

---

## Quick Start

```bash
# 1. From repo root, go to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Windows (no cp): Copy-Item .env.example .env

# 4. Type check (must pass before dev/build)
npm run typecheck

# 5a. Fastest: mock mode, no backend needed
# .env: VITE_USE_MOCK=true
npm run dev
# open http://localhost:5173

# 5b. Real backend mode
# .env: VITE_USE_MOCK=false + VITE_API_BASE_URL=http://localhost:8000/api
# start backend first (repo root README), then:
npm run dev

# 6. Production build check
npm run build
# optional local preview of the build:
# npm run preview
```

> After `npm run dev`, the footer badge tells you the mode: `Mock Mode` vs `API: OK` vs `API: Down`.

---

## Environment Variables

File: `frontend/.env` (created from `.env.example`).

| Var | Default | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | Backend base URL used by `apiClient`. Trailing slash is stripped automatically. |
| `VITE_USE_MOCK` | `true` | `true` = use `mockService` + `sample_responses` (offline, with simulated latency); `false` = call the real backend. |

Change → restart `npm run dev` (Vite embeds `import.meta.env` at startup).

---

## How It Talks to the Backend

- **Single entry point:** all HTTP goes through `src/api/endpoints.ts` → `apiClient<T>` in `src/api/client.ts`. Components/pages never call `fetch` directly.
- **13 functions** map 1:1 to the frozen contract: `getHealth`, `getRoles`, `createCustomRole`, `createProfile` (multipart `FormData`: `data` JSON + optional `resume` file), `getProfile`, `analyzeProfile`, `getRoadmap`, `completeProgress`, `markKnown`, `getToday`, `updateMarket`, `sendCoachMessage`, `getEvalReport`.
- **Headers:** every request sends `X-User-Id: demo` (single demo user). JSON bodies get `Content-Type: application/json` automatically; profile upload uses `FormData` (no manual content-type).
- **Errors:** non-2xx responses parse the backend envelope `{ error: { code, message, details } }` and throw `ApiError` (`code`, `status`, `details`). Common codes: `NO_PROFILE`, `NO_ROADMAP`, `UNKNOWN_ROLE/SKILL/ACTIVITY`, `NO_MARKET_UPDATE`, `EVAL_NOT_RUN`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
- **Contract drift guard (dev only):** `validateResponseShape()` in `client.ts` checks required top-level keys per endpoint (e.g. `/analyze` → `role, analysis, roadmap, meta`) and `console.warn`s on mismatch. It runs in `import.meta.env.DEV` only — silent in production.
- **Types:** `src/types/api.ts` is the TypeScript mirror of `docs/SPEC.md` §10.2 and must match `backend/app/schemas.py` exactly. If the contract changes, this file + `endpoints.ts` + mocks change in one joint commit (see `docs/CONTRACT_ISSUES.md`).

---

## Mock Mode (Backend-Free Development)

When `VITE_USE_MOCK=true`, `endpoints.ts` delegates to `mockService` (`src/mocks/mockService.ts`):

- **Data:** `src/mocks/sample_responses/*.json` — real backend outputs for all 13 endpoints (`analyze`, `roadmap`, `profile`, `roles`, `roles_custom`, `progress_complete`, `progress_known`, `market_update`, `today`, `coach`, `eval_report`, `health`), re-exported via `fixtures.ts`.
- **Stateful demo flows:** completing skill `rag` swaps in `mockAnalyzeAfterRag` + diff; market update swaps in `mockAnalyzeAfterMarket`; custom-role creation generates `custom_<slug>` roles; coach replies pick from `mockCoachReplies` by keyword.
- **Latency:** 300–600 ms simulated per call, so loading skeletons/spinners behave like production.
- **Reset:** footer `Reset demo` clears the Zustand store (mock service resets on reload).

Use mock mode for UI work, then flip to `false` and re-test against the real backend before a PR.

---

## State Management

Zustand store (`src/store/useStore.ts`, `create<AppState>`):

| Key | Type | Set by |
|---|---|---|
| `profile` | `Profile \| null` | `POST/GET /profile` |
| `roles` | `RoleSummary[]` | `GET /roles` |
| `state` | `AnalyzeResponse \| null` | `POST /analyze`, `GET /roadmap`, progress/market/coach updates |
| `lastDiff` / `lastNarrative` | `Diff \| null` / `{ narrative, source } \| null` | progress / market / coach responses → `DiffBanner` |
| `today` / `todayMessage` | `TodayPick \| null` / `string \| null` | `GET /today` → `TodayCard` |
| `coachMessages` / `sessionId` | message list / `sess_xxxxxxxx` | `CoachPanel` via `POST /coach` |
| `evalReport` | `EvalReport \| null` | `GET /eval/report` → Eval page |
| `isLoading` / `error` | `boolean` / `string \| null` | page-level loading + `ErrorBanner` / toasts |

Actions: `setProfile`, `setRoles`, `setState`, `setLastDiff`, `setLastNarrative`, `setToday`, `setTodayMessage`, `addCoachMessage`, `clearCoachMessages`, `setSessionId`, `setEvalReport`, `setIsLoading`, `setError`, `reset`.

---

## Routes & Guards

Defined in `src/App.tsx`:

- Public: `/` (Landing), `/profile`, `/eval`.
- Protected by `<RouteGuard>`: `/analysis`, `/roadmap`, `/progress`.
- `RouteGuard` behavior: if `state !== null` → render; else try `GET /roadmap` (works in both mock and real mode) → on success store + render, on failure show `Skeleton`s while loading then `<Navigate to="/profile" />`.
- Document titles update per route (e.g. `CareerTwin — Progress & Replan`).

---

## Components Guide

- **`ui/`** — primitives: `Button`, `Card`, `Badge`, `Gauge` (readiness), `ProgressBar`, `Stat`, `Skeleton`/`Spinner` (loading), `Drawer` (roadmap item detail), `ErrorBanner`/`EmptyState`/`Toast` (+ `ToastProvider`, `useToast`).
- **`profile/`** — the 4-step wizard: `AboutYouStep` (education, experience, hours, deadline), `SkillsInputStep`, `TargetRoleSelector` (curated + custom-role form), `ExtractedSkillsReview` (editable chips + snippets + overrides).
- **`analysis/`** — `TopGapsSummary`, `GapList` (priority-sorted bars), `RadarChartCard` (recharts), `CategoryScoreBars`, `StrengthsCard`.
- **`roadmap/`** — `RoadmapSummaryStrip` (version, weeks, hours), `RoadmapTimelineView` (phases/weeks), `RoadmapGraphView` (`@xyflow/react` dependency graph), `RoadmapItemDrawer` (activities, criteria, `why` narrative + source).
- **`progress/`** — `RoadmapChecklist` (complete / known actions), `DiffBanner` (readiness before→after, unlocked, added/removed/reordered), `TodayCard` + `FocusNextUpCard`, `CoachPanel` (chat + tool-call display).
- **`eval/`** — `EvalSummaryCard` (pass rate), `CategoryMetricsList`, `PersonasTable` (expected vs predicted top-3), `AdkEvalBlock` (tool-trajectory score), `EvalNotRunState` (CTA to run `make eval` in `backend/`).

Design rules: loading skeletons, error toasts, every number traceable to its `why`.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server on http://localhost:5173 |
| `npm run typecheck` | `tsc --noEmit` — must pass (strict mode) |
| `npm run build` | `tsc && vite build` — type check + production bundle to `dist/` |
| `npm run preview` | Preview the `dist/` build locally |

---

## Rules for Contributors

From `docs/AGENTS.md` + `docs/SPEC.md` (frontend-relevant):

1. **TypeScript strict, no `any`.** Fix `noUnusedLocals/Parameters` errors instead of suppressing.
2. **All HTTP through `src/api/client.ts`** (via `endpoints.ts`). No direct `fetch` in components.
3. **Nothing computed client-side** — render what the API returns (gaps, priorities, weeks, diffs).
4. **Contract is frozen** (`docs/SPEC.md` §10). `src/types/api.ts` must mirror it; problems go in `docs/CONTRACT_ISSUES.md`, never local patches.
5. **Mocks stay typed** — fixtures must satisfy `src/types/api.ts`; refresh from `docs/sample_responses/*.json` once backend `make verify` is green.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `npm run typecheck` fails | Read the `tsc` error (often unused var or implicit `any`); fix, don't add `// @ts-ignore`. |
| Page redirects to `/profile` | Expected when `state === null` and `GET /roadmap` fails — complete Profile → Analyze first. |
| Footer shows `API: Down` | Backend not running or wrong `VITE_API_BASE_URL`. Start backend on :8000 or set `VITE_USE_MOCK=true` + restart `npm run dev`. |
| Stuck in mock data | Set `VITE_USE_MOCK=false`, confirm backend health (`curl http://localhost:8000/api/health`), restart dev server. |
| `EVAL_NOT_RUN` / empty Eval tab | Normal without backend eval run — in `backend/`: `make eval`, then reload (real mode). Mock mode always has a sample report. |
| Port 5173 in use | Stop the other Vite instance or run `npx vite --port 5174` (then update backend `CORS_ORIGINS` if using real API). |
| Styles not applying | Ensure `src/index.css` has Tailwind directives and the file is under `content` globs in `tailwind.config.js`; restart dev server. |

Related docs: repo-root `README.md` (full product + backend setup) · `docs/SPEC.md` (contract §10, UI §11) · `docs/AGENTS.md` · `docs/CONTRACT_ISSUES.md` · live API docs at http://localhost:8000/docs (backend running).
