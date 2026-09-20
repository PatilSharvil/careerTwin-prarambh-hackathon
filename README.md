# CareerTwin — Personalized Career & Skill Navigator Agent

> **One line:** Profile → Gaps → Roadmap → Learn → Track → **Replan**. The loop is the product.

CareerTwin is an adaptive, measurable career-learning system built for a 12-hour hackathon. Tell it who you are (skills, resume, interests, time available) and where you want to go (e.g. GenAI Engineer), and it:

1. **Finds your skill gaps** with deterministic math (not LLM guesswork),
2. **Builds a week-by-week roadmap** that respects prerequisites,
3. **Explains every recommendation** ("why this skill, why now"),
4. **Adapts when you progress** (mark complete → replan diff) or when job requirements change (market update),
5. **Proves its quality** with a built-in Eval dashboard.

**Core principle:** *LLM for language, code for logic.* Gaps, priorities, and ordering are pure Python and fully tested. The LLM only parses resumes, personalizes wording, and powers chat — with deterministic fallbacks so the app works even with no API keys.

---

## Table of Contents

- [Who Is This For?](#who-is-this-for)
- [What Can It Do? (Features)](#what-can-it-do-features)
- [How It Works (5-Minute Mental Model)](#how-it-works-5-minute-mental-model)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Using the App (Step-by-Step User Journey)](#using-the-app-step-by-step-user-journey)
- [API Overview (13 Endpoints)](#api-overview-13-endpoints)
- [Configuration (Environment Variables)](#configuration-environment-variables)
- [Evaluation & Quality Proof](#evaluation--quality-proof)
- [Testing & Verification Commands](#testing--verification-commands)
- [Troubleshooting](#troubleshooting)
- [Further Documentation](#further-documentation)

---

## Who Is This For?

- **Learners / career switchers** who want a concrete, ordered plan instead of generic "learn AI" advice.
- **New contributors** who have never seen this repo: if you can run Python + Node, you can run the whole product locally in ~10 minutes (see [Quick Start](#quick-start)).
- **Judges / reviewers** who want measurable proof: open the `/eval` tab for pass rates, not claims.

---

## What Can It Do? (Features)

| Area | What you get |
|---|---|
| **Structured profile** | Form + resume PDF upload → extracted skills with `evidence_level` + snippet. Editable chips; user can correct levels. |
| **Target roles** | 4 curated roles: `GenAI Engineer`, `ML Engineer`, `Backend Engineer`, `Data Scientist` (~15–18 skills each over a 60-skill DAG) + **custom role builder** (LLM picks only from the catalog). |
| **Gap analysis** | `gap = target − level`, calibrated level = `0.6*evidence + 0.4*self`, priority = `importance × gap × dependency_impact × interest_boost` (normalized 0–100, labeled Critical/High/Medium/Low). Readiness score + category sub-scores + radar chart. |
| **Personalized roadmap** | Prerequisite closure + topological sort + packing into `weekly_hours`. Phases: Foundation → Core → Applied → Capstone. Timeline + dependency-graph views, activities (course/project/doc/cert), completion criteria. |
| **Replan diff** | Mark skill/activity complete or "already known" → new roadmap version + `Diff` banner: readiness before/after, unlocked skills, removed/added/reordered items. |
| **Today card** | "What should I do today?" — first available item fitting a 60–120 min slot, with reasons. |
| **Coach chat** | Natural-language interface (`CoachAgent` via Google ADK) calling the same engine tools: complete, today, why, switch role, market update. |
| **Market update** | Simulates changing job requirements (`roles_v2.json`, e.g. MCP added) → replan with requirement-change diff. |
| **Explanations** | Every item has structured `why` (level, target, gap, importance, unblocks, priority) + LLM narrative validated against numbers, with template fallback. |
| **Eval tab** | Precision/Recall@3 on 6 hand-labeled personas, 0 prereq violations, budget compliance, personalization distance, resource relevance, ADK tool-trajectory scores. Served from `backend/eval/report.json`. |

Knowledge base: **60 skills** (`skills.json`), **4 roles** (`roles.json`), **92 resources** (`resources.json`), 6 golden personas.

---

## How It Works (5-Minute Mental Model)

```
React UI ──REST──▶ FastAPI ──┬──▶ Career Engine (pure Python, deterministic)
                              └──▶ ADK Runner ──▶ Profile / Explainer / Coach / RoleBuilder agents (LLM)
ChromaDB: (1) skill normalization  (2) level-banded resource retrieval
SQLite: profiles, roadmaps, progress events  +  JSON seeds: skills / roles / resources
```

**Analysis pipeline:**

```
Resume + form + target role
 → ProfileAgent (LLM): skills + evidence
 → Chroma normalization ("ReactJS" → react)
 → Level calibration (evidence + self-rating)
 → Engine (deterministic): gaps, priority, readiness
 → Roadmap builder (prereq closure, topo sort, week packing)
 → Chroma retrieval (resources filtered by skill + level band)
 → ExplainerAgent (LLM, facts-only) → Validator → template fallback if needed
 → Save + return to UI
```

**Adaptive loop (the demo moment):**

```
Profile → Gap analysis → Roadmap → Learn → Track progress → Replan → (loop)
Market update (role requirements change) ────────────────────────▶ Replan
```

> The LLM never invents skills, prerequisites, levels, resources, or URLs. It selects from and explains the catalog files.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | Python 3.11+, FastAPI, Google ADK 2.9.2, LiteLLM failover (Gemini → Groq → OpenRouter), Pydantic v2 |
| Deterministic core | Pure-Python Career Engine (`backend/engine/`, no ADK/Chroma/FastAPI imports) |
| Retrieval | ChromaDB (local persistent, ONNX MiniLM default embeddings), SQLite app storage |
| Frontend | React 18 + Vite 5 + TypeScript (strict) + Tailwind + Recharts + `@xyflow/react` (React Flow), Zustand, React Router, lucide-react |
| LLM providers | All from `.env`: Gemini (native ADK), Groq + OpenRouter free models (via LiteLLM), `none` = fully deterministic mode |
| Contract | Frozen API in `docs/SPEC.md` §10 → `backend/app/schemas.py` ↔ `frontend/src/types/api.ts` |

---

## Repository Layout

```
careerTwin-prarambh-hackathon/
├─ README.md                  # this file
├─ Makefile                   # root: verify / test / run
├─ docs/
│  ├─ SPEC.md                 # source of truth (12-hour plan, algorithms, frozen contract)
│  ├─ AGENTS.md               # 10 guardrails for contributors/agents
│  ├─ CONTRACT_ISSUES.md      # contract problem log
│  └─ sample_responses/       # real API outputs (13 endpoints) used to refresh mocks
├─ backend/                   # FastAPI + ADK + Engine + ChromaDB
│  ├─ .env.example  requirements.txt  Makefile
│  ├─ app/        # main.py, config.py, schemas.py, services.py, errors.py
│  ├─ api/        # route modules per endpoint group
│  ├─ data/       # skills.json, roles.json, roles_v2.json, resources.json, personas/
│  ├─ engine/     # PURE PYTHON: catalog, calibrate, gaps, readiness, roadmap, replan, today, etc.
│  ├─ llm/        # provider.py, failover.py, parsing.py
│  ├─ agents/     # profile / explainer / engine / coach / role_builder + navigator + evalsets
│  ├─ rag/        # chroma_client, indexer, normalizer, retriever
│  ├─ store/      # db.py, repo.py (SQLite)
│  ├─ eval/       # metrics.py, run_eval.py, report.json
│  ├─ scripts/    # seed_demo, verify_contract, validate_data, etc.
│  └─ tests/      # pytest suite (contract, health, coach, role_builder, eval_report, ...)
└─ frontend/                  # React + Vite + TS
   ├─ .env.example            # VITE_API_BASE_URL, VITE_USE_MOCK
   └─ src/
      ├─ api/                 # client.ts + endpoints (all HTTP goes through here)
      ├─ types/api.ts         # TS mirror of SPEC §10.2
      ├─ mocks/ + mocks/sample_responses/  # typed fixtures for backend-free dev
      ├─ store/               # Zustand store
      ├─ components/          # ui/ + analysis/ + roadmap/ + progress/ + eval/ + profile/
      └─ pages/               # Landing, Profile, Analysis, Roadmap, Progress, Eval
```

---

## Prerequisites

- **Python 3.11+** (`py --version` / `python3 --version`)
- **Node.js 18+** and npm (`node --version`, `npm --version`)
- **Git**
- No LLM keys required to start — the app runs in deterministic fallback mode. For full LLM features, add free keys later (see [Configuration](#configuration-environment-variables)).
- Ports **8000** (backend) and **5173** (frontend) free. CORS is preconfigured for `http://localhost:5173`.

---

## Quick Start

### 0. Clone and enter

```bash
git clone https://github.com/PatilSharvil/careerTwin-prarambh-hackathon.git
cd careerTwin-prarambh-hackathon
git checkout main
git pull origin main
```

### 1. Backend setup (serves on http://localhost:8000)

```bash
cd backend

# Create and activate virtual environment (Python 3.11+)
py -3.11 -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Windows (no cp): Copy-Item .env.example .env
# At minimum you can leave keys empty -> deterministic mode (LLM_PROVIDER_CHAIN=none also works)

# Run tests (should be green before you continue)
make test
# or: pytest

# Start the API server
make run
# or: uvicorn app.main:app --reload --port 8000
```

Health check (new terminal): `curl http://localhost:8000/api/health` → `{"status":"ok",...}`.
Interactive docs: http://localhost:8000/docs

### 2. Frontend setup (serves on http://localhost:5173)

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Windows: Copy-Item .env.example .env
```

`frontend/.env`:

```ini
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_MOCK=true   # true = work without backend (typed fixtures); false = call real backend
```

```bash
# Type check (must pass)
npm run typecheck

# Start dev server
npm run dev
# Production build check:
# npm run build
```

Open http://localhost:5173. If `VITE_USE_MOCK=false`, ensure the backend is running first; the footer shows `API: OK` vs `Mock Mode`.

> **Fastest demo (no backend):** keep `VITE_USE_MOCK=true` + `npm run dev` — all 6 screens work on real sample responses in `frontend/src/mocks/sample_responses/`.

---

## Using the App (Step-by-Step User Journey)

The header shows the 5-step flow. Follow it in order:

1. **Landing (`/`)** — one CTA → Start.
2. **Profile (`/profile`)** — fill education, experience, interests, weekly hours, deadline; add self-rated skills; optionally upload resume PDF (or paste text). Review extracted skills as editable chips + evidence snippets, correct any level, pick a target role.
3. **Analysis (`/analysis`)** — `POST /analyze` runs. See readiness gauge (skill-alignment score, *not* a hiring prediction), radar (current vs target, top 8 skills), gap bars sorted by priority, "top 3 gaps and why".
4. **Roadmap (`/roadmap`)** — phases/weeks timeline + dependency graph. Click any item for drawer: resources, hours, prerequisites, completion criteria, **Why?**.
5. **Progress (`/progress`)** — "Mark complete" (whole skill or single activity), "already known", **Today card** ("What should I do today?"), **diff banner** after each replan (readiness 58 → 66, unlocked, removed, reordered), **Market update** button when available, **Coach chat** for natural language.
6. **Eval (`/eval`)** — pass-rate dashboard: per-metric results, persona table (expected vs predicted top gaps), ADK trajectory score. If it says "not run", run `make eval` in `backend/`.

**Golden demo (5 min):** upload resume → pick GenAI Engineer → readiness ~58% → open Roadmap graph → Mark `RAG` complete → watch diff banner (Agents unlocked, items removed/reordered) → apply Market Update (MCP added) → ask Coach "What should I do today?" → show Eval tab.

---

## API Overview (13 Endpoints)

Base URL: `http://localhost:8000/api` · JSON, `snake_case` · Single demo user via `X-User-Id: demo` (default `demo`).

| # | Method | Path | Purpose |
|---|---|---|---|
| 1 | GET | `/health` | Status, version, LLM chain, Chroma/DB health |
| 2 | GET | `/roles` | List 4 curated + saved custom roles |
| 3 | POST | `/roles/custom` | Build custom role from title + description (catalog-only skills) |
| 4 | POST | `/profile` | Create profile (`multipart`: `data` JSON + optional `resume` PDF) |
| 5 | GET | `/profile` | Get current profile |
| 6 | POST | `/analyze` | Gaps + roadmap for `role_id`, `weekly_hours`, `deadline_weeks` (+ optional overrides) |
| 7 | GET | `/roadmap` | Latest analyzed state |
| 8 | POST | `/progress/complete` | Complete skill (`skill_id`) or activity (`activity_id`) → new version + diff |
| 9 | POST | `/progress/known` | Mark skill known at level → replan + diff |
| 10 | GET | `/today` | Single best activity for today + why |
| 11 | POST | `/market/update` | Apply role v2 requirements → replan + requirement-change diff |
| 12 | POST | `/coach` | Chat (`message`, `session_id`) → reply + tool calls + state/diff when changed |
| 13 | GET | `/eval/report` | Eval report (run `make eval` first) |

Order: `POST /profile` → `POST /analyze` → everything else. `GET /roles`, `GET /health` work anytime. Every state change bumps roadmap `version` and returns full state. Errors use `{ "error": { "code", "message", "details" } }` (`NO_PROFILE`, `NO_ROADMAP`, `UNKNOWN_ROLE/SKILL/ACTIVITY`, `NO_MARKET_UPDATE`, `EVAL_NOT_RUN`, `LLM_UNAVAILABLE`, ...). Full types: `docs/SPEC.md` §10.2; Pydantic mirror: `backend/app/schemas.py`; TS mirror: `frontend/src/types/api.ts`. Real examples: `docs/sample_responses/*.json`.

---

## Configuration (Environment Variables)

**Backend (`backend/.env`):**

| Var | Meaning |
|---|---|
| `LLM_PROVIDER_CHAIN` | Priority order, e.g. `gemini,groq,openrouter`; `none` = deterministic mode (no LLM calls, tests + demo-safe fallback) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini via native ADK (default model `gemini-2.5-flash`) |
| `GROQ_API_KEY` / `GROQ_MODEL` | Groq via LiteLLM (default `llama-3.3-70b-versatile`) |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | OpenRouter free models via LiteLLM |
| `LLM_TIMEOUT_SECONDS` | Per-step timeout (default 30) |
| `CHROMA_PATH` | Chroma persistence dir (default `./chroma_data`) |
| `DATABASE_PATH` | SQLite file (default `./careertwin.db`) |
| `CORS_ORIGINS` | Allowed origins (default `http://localhost:5173`) |
| `DEFAULT_USER_ID` | Demo user (default `demo`) |

Failover is per LLM step (Profile → Explainer → Coach → RoleBuilder): retry once → next provider → deterministic fallback. Responses carry `meta.llm_provider` / `llm_used` / `fallback_used` so you can see what served the request. `adk eval` runs on Gemini only.

**Frontend (`frontend/.env`):**

| Var | Meaning |
|---|---|
| `VITE_API_BASE_URL` | Backend base (default `http://localhost:8000/api`) |
| `VITE_USE_MOCK` | `true` = typed fixtures, no backend needed; `false` = real API |

---

## Evaluation & Quality Proof

Instead of claims, CareerTwin ships a pass-rate dashboard:

- **6 golden personas** (`backend/data/personas/`): strong-Python/weak-deploy, CS beginner, backend→ML, analyst→DS, experienced ML→GenAI, meets-all-targets (empty-gap edge case).
- **Metrics** (`backend/eval/metrics.py`): Gap Precision/Recall@3 ≥ 0.8, Kendall τ ≥ 0.6, 0 prereq violations, 100% budget compliance, personalization Jaccard distance ≥ 0.3, 0 strong-skill leakage, 100% adaptability + market-update response + resource skill match, level-band fit ≥ 90%, normalization hit rate ≥ 90%, 100% explainability completeness + numeric consistency.
- **ADK evalset** (`backend/agents/evalsets/coach.evalset.json`): ~8 Coach cases (complete, today, why, switch role, market update + paraphrases); trajectory score matters, response-match threshold kept low (ROUGE is brittle).

```bash
cd backend
make eval   # pytest + custom metrics + adk eval -> eval/report.json
```

Then open `/eval` in the UI or `GET /api/eval/report`.

---

## Testing & Verification Commands

From repo root:

```bash
make verify   # contract check: SPEC §10 vs schemas vs live/mocked API (scripts/verify_contract.py)
make test     # cd backend && pytest
make run      # cd backend && uvicorn app.main:app --reload --port 8000
```

Backend (`cd backend`): `make test` · `make run` · `make eval` · `make verify` · `make seed` / `make warm` (placeholders).
Frontend (`cd frontend`): `npm run typecheck` · `npm run build` · `npm run dev`.

Acceptance checks:

```bash
curl http://localhost:8000/api/health
curl -X POST http://localhost:8000/api/analyze   # without profile -> expected NO_PROFILE error
cd frontend && npm run typecheck
cd frontend && npm run build
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Backend won't start / `pytest` fails | Recreate `.venv` with Python 3.11+, reinstall `requirements.txt`, ensure you run from `backend/` |
| `EVAL_NOT_RUN` on `/eval/report` | `cd backend && make eval`, then retry |
| `NO_PROFILE` / `NO_ROADMAP` errors | Follow order: `POST /profile` → `POST /analyze` → progress/today/coach/market |
| Frontend shows `API: Down` | Start backend first, set `VITE_USE_MOCK=false` + `VITE_API_BASE_URL=http://localhost:8000/api`, restart `npm run dev` |
| Want frontend without backend | Set `VITE_USE_MOCK=true` |
| LLM errors / rate limits | Add keys to `backend/.env` or set `LLM_PROVIDER_CHAIN=none` for deterministic mode; check `meta.fallback_used` |
| Chroma / embedding download slow | Pre-warm offline; DB persists in `./chroma_data`; venue Wi-Fi not required after first index |
| Port in use | Free 8000/5173 or change ports + `CORS_ORIGINS` / `VITE_API_BASE_URL` accordingly |

---

## Further Documentation

- **`docs/SPEC.md`** — source of truth: requirements, algorithms, data shapes, frozen contract §10, UI, eval, schedule, demo script, risks.
- **`docs/AGENTS.md`** — 10 contributor guardrails (engine purity, LLM limits, `.env`-only config, strict TS, small commits).
- **`docs/CONTRACT_ISSUES.md`** — contract change log/process (frozen after hour 1; changes need both teams + one joint commit).
- **`docs/sample_responses/`** — real outputs for all 13 endpoints; source for refreshing `frontend/src/mocks/sample_responses/`.
- Interactive API docs (backend running): http://localhost:8000/docs

Built with Google ADK · FastAPI · ChromaDB · React + Vite. *Not a chatbot: a measurable adaptive system.*
