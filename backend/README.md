# CareerTwin Backend

> API + deterministic Career Engine + Google ADK agents + ChromaDB retrieval + SQLite storage. If you only work in `backend/`, this file is all you need.

**What this folder is:** a FastAPI server (port **8000**) exposing **13 frozen endpoints** under `/api`. Scoring, ordering, and replanning are **pure-Python deterministic code** (`engine/`, fully tested). LLMs (`agents/` + `llm/`) only parse resumes, pick from catalogs, and word explanations — every LLM step has a fallback so `LLM_PROVIDER_CHAIN=none` runs the whole app with no keys. Retrieval (`rag/`) does skill normalization + level-banded resource lookup on local ChromaDB. State lives in SQLite (`store/`).

**Core principle:** *LLM for language, code for logic.*

---

## Table of Contents

- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration (Environment Variables)](#configuration-environment-variables)
- [API (13 Endpoints)](#api-13-endpoints)
- [Layer Guide](#layer-guide)
- [Knowledge Base (`data/`)](#knowledge-base-data)
- [Evaluation (`eval/`)](#evaluation-eval)
- [Scripts (`scripts/`)](#scripts-scripts)
- [Tests (`tests/`)](#tests-tests)
- [Commands (Makefile)](#commands-makefile)
- [Rules for Contributors](#rules-for-contributors)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
                ┌────────────── React frontend (:5173) ──────────────┐
                │  GET/POST /api/*  +  X-User-Id: demo               │
                └────────────────────────┬──────────────────────────┘
                                         │ REST / JSON snake_case
┌────────────────────────────────────────▼────────────────────────────────────────┐
│ backend/ FastAPI (app/main.py, :8000)                                           │
│  routes → services.py (orchestrator, also reused by Coach tools)                │
│   ├─ agents/  Profile / Explainer / Coach / RoleBuilder (LLM) + EngineAgent     │
│   │           (deterministic) + pipeline.py run_analysis + validator             │
│   │           see backend/agents/README.md                                      │
│   ├─ engine/  PURE PYTHON: calibrate, gaps, readiness, roadmap, replan,         │
│   │           today, market, why, narrative (no adk/chroma/fastapi imports)     │
│   ├─ llm/     provider.py (Gemini/Groq/OpenRouter) + failover.py + parsing.py  │
│   ├─ rag/     ChromaDB: skill normalization + resource retrieval                │
│   ├─ store/   SQLite: users, profiles, roadmaps, progress_events,               │
│   │           role_versions, llm_cache                                           │
│   └─ eval/    metrics.py + run_eval.py → eval/report.json → GET /eval/report   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Startup (`lifespan` in `app/main.py`) self-checks: SQLite schema → catalog DAG validation → Chroma index → LLM chain logging. Every request gets `X-Request-Id` + timing logs; CORS allows the frontend origin.

---

## Folder Structure

```
backend/
├─ README.md                 # this file
├─ requirements.txt          # fastapi, uvicorn, pydantic(+settings), multipart, pypdf,
│                            # google-adk==2.9.2, litellm, chromadb, pytest(+asyncio), httpx
├─ Makefile                  # run / test / eval / verify (+ seed, warm placeholders)
├─ .env.example              # copy to .env (see Configuration)
├─ app/                      # FastAPI entrypoint + contract
│  ├─ main.py                # 13 routes under /api, lifespan checks, CORS, request-id middleware
│  ├─ config.py              # Settings (.env) + provider_chain() + GOOGLE/GROQ/OPENROUTER env sync
│  ├─ schemas.py             # Pydantic v2 mirror of SPEC §10.2 (frozen contract)
│  ├─ services.py            # orchestration used by routes AND Coach tools (profile, analyze,
│  │                         # complete/known, today, market, custom role, eval)
│  ├─ errors.py              # AppError + envelope handlers { error: { code, message, details } }
│  └─ mappers.py
├─ api/                      # per-endpoint route modules (health, roles, profile, analyze,
│                            # progress, today, market, coach, eval)
├─ engine/                   # DETERMINISTIC core — pure Python, no framework imports
│  ├─ catalog.py · calibrate.py · gaps.py · readiness.py · roadmap.py · replan.py
│  └─ today.py · market.py · why.py · narrative.py · resources.py · models.py
├─ agents/                   # ADK LLM layer — see backend/agents/README.md
│  ├─ profile/explainer/coach/role_builder + engine_agent + pipeline + validator + resume_text
│  └─ navigator/ (root_agent for adk web/eval) + evalsets/ (8 coach cases)
├─ llm/                      # provider.py (get_model/available_chain), failover.py
│                            # (run_with_failover), parsing.py (tolerant JSON+Pydantic)
├─ rag/                      # chroma_client.py (persistent + ONNX MiniLM), indexer.py,
│                            # normalizer.py, retriever.py (ChromaResourceProvider)
├─ store/                    # db.py (sqlite3, no ORM, init + seed demo user), repo.py
│                            # (profiles, versioned roadmaps, events, roles, llm_cache)
├─ data/                     # skills.json (60) · roles.json (4) · roles_v2.json (market update) ·
│                            # resources.json (92) · personas/ (6 golden)
├─ eval/                     # metrics.py, run_eval.py → report.json (served by GET /eval/report)
├─ scripts/                  # validate_data, check_links, warm_models, smoke_llm, seed_demo,
│                            # demo_pipeline, demo_roadmap_p1, evaluate_personas, verify_contract
└─ tests/                    # 12 files: engine_core/roadmap, data, rag, llm_layer, agents,
                             # coach, role_builder, storage, api_contract, health, eval_report
```

Runtime artifacts (git-ignored, created locally): `.venv/`, `careertwin.db`, `chroma_data/`.

---

## Prerequisites

- **Python 3.11+** (`py --version` / `python3 --version`)
- **Git**
- Ports **8000** free; frontend on **5173** (already in `CORS_ORIGINS`)
- No LLM keys required — deterministic fallback mode works out of the box

---

## Quick Start

```bash
# 1. From repo root
cd backend

# 2. Virtual environment (Python 3.11+)
py -3.11 -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Windows: Copy-Item .env.example .env
# Leave keys empty for deterministic mode, or add free keys (see Configuration)

# 5. Tests must be green before you continue
make test
# or: pytest

# 6. Run the API (reload, port 8000)
make run
# or: uvicorn app.main:app --reload --port 8000
```

Verify:

```bash
curl http://localhost:8000/api/health
# -> {"status":"ok","version":"0.1.0","llm":{...},"chroma":"ok","db":"ok"}
# Interactive docs: http://localhost:8000/docs
```

Call order: `POST /profile` → `POST /analyze` → everything else (`GET /roles`, `GET /health` work anytime).

---

## Configuration (Environment Variables)

File: `backend/.env` (from `.env.example`). All model/provider choices come from here — never hard-code keys or model names.

| Var | Default | Meaning |
|---|---|---|
| `LLM_PROVIDER_CHAIN` | `gemini,groq,openrouter` | Priority order; `none` = fully deterministic (no LLM calls) |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | _(empty)_ / `gemini-2.5-flash` | Gemini via native ADK (`GOOGLE_API_KEY` synced automatically; `GOOGLE_GENAI_USE_VERTEXAI=FALSE`) |
| `GROQ_API_KEY` / `GROQ_MODEL` | _(empty)_ / `llama-3.3-70b-versatile` | Groq via `LiteLlm("groq/...")` |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | _(empty)_ / `meta-llama/llama-3.3-70b-instruct:free` | OpenRouter free models via `LiteLlm("openrouter/...")` |
| `LLM_TIMEOUT_SECONDS` | `30` | Per LLM-step timeout |
| `CHROMA_PATH` | `./chroma_data` | Chroma persistent dir |
| `DATABASE_PATH` | `./careertwin.db` | SQLite file |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
| `DEFAULT_USER_ID` | `demo` | Single demo user (frontend always sends `X-User-Id: demo`) |

Failover is per LLM step (Profile → Explainer → Coach → RoleBuilder): 1 retry on same provider → next provider → deterministic fallback. Responses carry `meta { llm_provider, llm_used, fallback_used }`. Free-model IDs change often — verify on provider sites. `adk eval` runs on **Gemini only**.

---

## API (13 Endpoints)

Base: `http://localhost:8000/api` · JSON UTF-8, `snake_case` · numbers: `level/target/gap` 0–10 (1dp), `importance` 0–1 (2dp), `priority` 0–100 int, `readiness` 0–100 (1dp) · IDs: `skill_id` snake_case, `role_id` (custom: `custom_<slug>`), `item_id = rm_<skill_id>` (capstone `rm_capstone`, stable across replans) · every state change bumps roadmap `version` +1 and returns full state.

| # | Method | Path | Request | Response | Key errors |
|---|---|---|---|---|---|
| 1 | GET | `/health` | — | `Health` (status, version, llm chain/primary, chroma, db) | — |
| 2 | GET | `/roles` | — | `RolesResponse` (4 curated + saved custom; `top_skills`, `market_update_available`) | — |
| 3 | POST | `/roles/custom` | `CustomRoleRequest{title, description}` | `CustomRoleResponse{role, meta}` | 422 |
| 4 | POST | `/profile` | `multipart`: `data` = `ProfileInput` JSON, `resume` = optional PDF | `ProfileResponse{profile, meta}` | `RESUME_PARSE_ERROR`, 422 |
| 5 | GET | `/profile` | — | `ProfileResponse` | `NO_PROFILE` |
| 6 | POST | `/analyze` | `AnalyzeRequest{role_id, weekly_hours, deadline_weeks, skill_overrides?}` | `AnalyzeResponse{role, analysis, roadmap, meta}` | `NO_PROFILE`, `UNKNOWN_ROLE/SKILL`, 422 |
| 7 | GET | `/roadmap` | — | `AnalyzeResponse` (latest) | `NO_ROADMAP` |
| 8 | POST | `/progress/complete` | `CompleteRequest{skill_id, activity_id?}` | `ProgressResponse{state, diff, narrative, narrative_source, meta}` | `NO_ROADMAP`, `UNKNOWN_SKILL/ACTIVITY` |
| 9 | POST | `/progress/known` | `KnownRequest{skill_id, level}` | `ProgressResponse` | `NO_ROADMAP`, `UNKNOWN_SKILL`, 422 |
| 10 | GET | `/today` | — | `TodayResponse{today, message, meta}` | `NO_ROADMAP` |
| 11 | POST | `/market/update` | `MarketUpdateRequest{role_id?}` | `ProgressResponse` (+ `requirement_changes`) | `NO_ROADMAP`, `NO_MARKET_UPDATE`, `UNKNOWN_ROLE` |
| 12 | POST | `/coach` | `CoachRequest{message, session_id}` | `CoachResponse{reply, tool_calls, state_changed, state?, diff?, meta}` | `NO_ROADMAP` |
| 13 | GET | `/eval/report` | — | `EvalReport` (from `eval/report.json`) | `EVAL_NOT_RUN` (run `make eval`) |

Behavior rules: re-`POST /analyze` rebuilds roadmap (bumps version, clears completions); `skill_overrides` beat calibrated levels (`source="override"`); complete without `activity_id` = whole skill (level→target, prereqs raised to `min_level`), with `activity_id` = level += `level_gain`; repeats are idempotent (`facts: ["Already complete"]`); market update only when `market_update_available`, then flips false; `POST /coach` includes fresh `state`/`diff` when `state_changed` so UI needs no extra call. Errors always `{ "error": { "code", "message", "details": {} } }` with codes `VALIDATION_ERROR, NO_PROFILE, NO_ROADMAP, UNKNOWN_ROLE/SKILL/ACTIVITY, RESUME_PARSE_ERROR, NO_MARKET_UPDATE, EVAL_NOT_RUN, LLM_UNAVAILABLE, NOT_IMPLEMENTED, INTERNAL_ERROR`. Full types: `docs/SPEC.md` §10.2 ↔ `app/schemas.py` ↔ `frontend/src/types/api.ts`; real examples: `docs/sample_responses/*.json`.

---

## Layer Guide

**`app/` — HTTP + orchestration.** `main.py` = all routes + lifespan + error handlers + CORS; `services.py` = business logic shared by routes and Coach tools (create/get profile, analyze, get state, complete/known, today, market update, custom role); `schemas.py` = frozen Pydantic v2 contract; `errors.py` = `AppError` envelope mapping (400/404/409/422/500/501/503); `config.py` = `.env` settings + chain resolution (providers without keys are skipped).

**`engine/` — deterministic math (pure Python; never imports adk/chromadb/fastapi/llm/app).** `catalog.py` (load + DAG utils), `calibrate.py` (§7.1: `0.6*evidence+0.4*self`, unverified discount, `unverified` flag), `gaps.py` (§7.2: `gap`, `dependency_impact`, `interest_boost`, normalized `priority` + Critical/High/Medium/Low), `readiness.py` (§7.3: importance-weighted alignment, *not* a hiring prediction), `roadmap.py` (§7.4: prereq closure, Kahn topo + priority tiebreak, hours × experience multiplier, week packing with `week_start..week_end`, phases Foundation/Core/Applied/Capstone, stretch flag, capstone of top-3), `replan.py` (§7.5: complete/known semantics + `Diff`), `today.py` (§7.7: first available 60–120 min pick), `market.py` (§7.6: role-version diff → replan), `why.py` + `narrative.py` (§12 template), `resources.py` (provider interface), `models.py` (internal Pydantic).

**`agents/` — LLM layer (details: `backend/agents/README.md`).** ProfileAgent (resume → evidence + snippet) → EngineAgent (state → gaps/roadmap) → ExplainerAgent (facts-only narratives + `validator.py` number check + `llm_cache`) via `pipeline.py::run_analysis` / `CareerTwinPipeline`; CoachAgent (root, 5 tools in `coach_tools.py` wrapping `services.py`, `run_coach` + regex fallback router); RoleBuilderAgent (catalog-only 8–20 skills, Chroma nearest-role fallback); `resume_text.py` (pypdf); `navigator/agent.py` exports `root_agent` for `adk web`/`adk eval`; `evalsets/` holds 8 coach cases.

**`llm/` — provider plumbing.** `provider.py` (`get_model`, `available_chain`), `failover.py` (`run_with_failover`: retry once → next → `AllProvidersFailed`), `parsing.py` (strip fences → JSON → Pydantic → retry once). Factories take a model so failover = rebuild agent.

**`rag/` — two real jobs (§9).** (1) Skill normalization (`skills` collection: `name+aliases` embeddings, threshold + `unmapped` passthrough); (2) resource retrieval (`resources` as one record per (resource, skill): filter `skill_id` + level band, widen ±1 if sparse, diversify course+project). `chroma_client.py` (persistent client + ONNX MiniLM default embeddings + cosine), `indexer.py` (startup indexing), `normalizer.py`, `retriever.py` (`ChromaResourceProvider`). Chroma metadata can't hold lists — hence the per-pair records. Pre-download embeddings (`warm_models.py`) so venue Wi-Fi isn't a dependency.

**`store/` — SQLite via stdlib `sqlite3`, no ORM.** `db.py` (`init_db`, transactional `get_connection`, seeds `demo` user); `repo.py` (profile save/get, immutable versioned roadmaps, `progress_events`, `role_versions` incl. custom, `llm_cache` get/set for explainer). DB file: `./careertwin.db`.

---

## Knowledge Base (`data/`)

| File | Contents |
|---|---|
| `skills.json` | **60** skills — global DAG: `id, name, category, aliases, prerequisites[{skill, min_level}], hours_per_level, tags, mastery_criteria` |
| `roles.json` | **4** curated roles (`genai_engineer`, `ml_engineer`, `backend_engineer`, `data_scientist`), ~15–18 weighted skills each (`skill, importance, target`), `version`, provenance `source` |
| `roles_v2.json` | Market-update delta (e.g. add MCP 0.6, raise evaluation target 5→7) → `requirement_changes` diff |
| `resources.json` | **92** resources (`course/project/doc/certification`, `skills[]`, `level_from/to`, `hours`, `level_gain`); URLs hand-verified, `verified` flipped only after checking — LLMs never generate links |
| `personas/` | **6** hand-labeled golden personas (p1 strong-Python/weak-deploy … p6 meets-all-targets edge case) for eval |

Validate with `python scripts/validate_data.py`; check URLs with `python scripts/check_links.py`.

---

## Evaluation (`eval/`)

`metrics.py` computes all judging-category metrics (Gap Precision/Recall@3 ≥ 0.8, Kendall τ ≥ 0.6, **0** prereq violations, 100% budget compliance, personalization Jaccard ≥ 0.3, **0** strong-skill leakage, 100% adaptability/market-update/skill-match, level-band ≥ 90%, normalization ≥ 90%, 100% explainability + numeric consistency); `run_eval.py` runs engine + Chroma over the 6 personas, optionally merges `adk eval` (Gemini) results, writes `eval/report.json` served by `GET /eval/report` and shown in the frontend `/eval` tab.

```bash
make eval   # pytest -q && python -m eval.run_eval
```

---

## Scripts (`scripts/`)

| Script | Purpose |
|---|---|
| `verify_contract.py` | `make verify`: SPEC §10 vs `schemas.py` vs live API vs `docs/sample_responses` (also at repo root `scripts/`) |
| `validate_data.py` | Schema + DAG-acyclicity checks for `data/*.json` |
| `check_links.py` | Helper to hand-verify `resources.json` URLs |
| `warm_models.py` | Pre-download Chroma ONNX embeddings before the event |
| `smoke_llm.py` | Quick provider-chain smoke test |
| `seed_demo.py` | Seed demo user/profile (+ backup demo path) |
| `demo_pipeline.py` / `demo_roadmap_p1.py` | Rehearsal helpers |
| `evaluate_personas.py` | Persona-judging helper |

---

## Tests (`tests/`)

12 files covering every layer: `test_engine_core`, `test_engine_roadmap`, `test_data`, `test_rag`, `test_llm_layer`, `test_agents`, `test_coach`, `test_role_builder`, `test_storage`, `test_api_contract`, `test_health`, `test_eval_report` (+ `data/` fixtures). Engine tests first — every `engine/` function has a pytest case.

```bash
pytest -q                              # full suite
pytest tests/test_coach.py tests/test_role_builder.py -v
LLM_PROVIDER_CHAIN=none pytest -q      # prove deterministic fallbacks
```

---

## Commands (Makefile)

| Command | Runs |
|---|---|
| `make run` | `uvicorn app.main:app --reload --port 8000` |
| `make test` | `pytest` |
| `make eval` | `pytest -q && python -m eval.run_eval` → `eval/report.json` |
| `make verify` | `python scripts/verify_contract.py` |
| `make seed` / `make warm` | placeholders (`@echo not implemented yet`) — use `scripts/seed_demo.py` / `warm_models.py` directly |

Root `Makefile` mirrors `verify/test/run` from the repo root.

---

## Rules for Contributors

From `docs/AGENTS.md` + `docs/SPEC.md` (backend-relevant):

1. `docs/SPEC.md` is the source of truth — no new endpoints, fields, skills logic, or files outside it.
2. Contract (§10) is **frozen**: `app/schemas.py` must match exactly; problems → `docs/CONTRACT_ISSUES.md`, never local patches.
3. `engine/` stays pure Python (no `google.adk`, `chromadb`, `fastapi`, `llm`, `app.*`); resources arrive via provider interface.
4. LLMs never invent skills/prereqs/levels/resources/URLs; every LLM step keeps its deterministic fallback.
5. All config from `.env`; engine tests first; small commits with acceptance commands per phase.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `pytest` fails on fresh clone | Recreate `.venv` with Python 3.11+, reinstall `requirements.txt`, run from `backend/` |
| `uvicorn: command not found` | Activate `.venv` first (`.venv\Scripts\Activate.ps1` / `source .venv/bin/activate`) |
| `RESUME_PARSE_ERROR` | PDF has no extractable text — paste text via `resume_text` field instead |
| `NO_PROFILE` / `NO_ROADMAP` | Follow order `POST /profile` → `POST /analyze` → progress/today/coach/market |
| `EVAL_NOT_RUN` | `make eval`, then retry `GET /eval/report` |
| Everything returns templates (`fallback_used=true`) | No keys in `.env` or chain `none` — add keys or keep deterministic mode intentionally |
| Chroma slow on first run | One-time ONNX download + indexing; pre-run `warm_models.py`, DB persists in `./chroma_data` |
| Contract drift warnings/failures | Run `make verify`; fix `schemas.py`/code to match SPEC §10 — don't patch the frontend around it |

Related docs: repo-root `README.md` (full product) · `backend/agents/README.md` (LLM layer deep-dive) · `docs/SPEC.md` (algorithms §7, contract §10, eval §13) · `docs/AGENTS.md` · `docs/CONTRACT_ISSUES.md` · live API docs at http://localhost:8000/docs (server running) · frontend consuming this API: `frontend/README.md`.
