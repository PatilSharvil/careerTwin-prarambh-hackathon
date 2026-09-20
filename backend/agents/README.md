# CareerTwin Agents (`backend/agents/`)

> The LLM layer of CareerTwin. If you only work in `backend/agents/`, this file is all you need.

**What this folder is:** Google ADK agents + the `run_analysis` pipeline that turn *resume text + form input* into *structured profile → deterministic engine math → grounded explanations*, plus the chat **Coach** and the **Custom Role Builder**. Golden rule: **LLMs never invent skills, prerequisites, levels, resources, or URLs** — they only parse text, pick from the catalog, and word explanations from provided facts. Every LLM step has a deterministic fallback, so `LLM_PROVIDER_CHAIN=none` runs the whole app with no keys.

Engine math lives in `backend/engine/` (pure Python, no ADK imports). API wiring lives in `backend/app/` (`services.py` + `main.py`). This folder only does language + orchestration.

---

## Table of Contents

- [File Map](#file-map)
- [The 5 Agents (4 LLM + 1 Deterministic)](#the-5-agents-4-llm--1-deterministic)
- [Pipeline: How an Analysis Runs](#pipeline-how-an-analysis-runs)
- [Coach Tools (Chat → Engine)](#coach-tools-chat--engine)
- [Providers & Failover](#providers--failover)
- [Helpers: Resume Text + Validator](#helpers-resume-text--validator)
- [Navigator Root Agent (`adk web` / `adk eval`)](#navigator-root-agent-adk-web--adk-eval)
- [Evalsets (Coach Test Cases)](#evalsets-coach-test-cases)
- [Setup & Running](#setup--running)
- [Tests](#tests)
- [Rules for Contributors](#rules-for-contributors)
- [Troubleshooting](#troubleshooting)

---

## File Map

```
backend/agents/
├─ README.md               # this file
├─ __init__.py             # re-exports: extract_profile, heuristic_profile, explain_items/diff,
│                          # validate_narrative_numbers, EngineAgent, build_pipeline, run_analysis, ...
├─ profile_agent.py        # ProfileAgent (LlmAgent) + heuristic_profile fallback + extract_profile()
├─ engine_agent.py         # EngineAgent (BaseAgent, NO LLM) — runs deterministic engine in ADK state
├─ explainer_agent.py      # ExplainerAgent (LlmAgent) + explain_items() + explain_diff() + SQLite cache
├─ coach_agent.py          # CoachAgent (root LlmAgent) + run_coach() + fallback_coach_router()
├─ coach_tools.py          # 5 plain-Python tools Coach calls (same services.py as the API routes)
├─ role_builder_agent.py   # RoleBuilderAgent (LlmAgent) + validate/normalize + Chroma nearest-role fallback
├─ pipeline.py             # build_pipeline() (SequentialAgent) + run_analysis() orchestrator
├─ resume_text.py          # extract_resume_text() via pypdf, ResumeParseError
├─ validator.py            # validate_narrative_numbers() — anti-hallucination number check
├─ navigator/
│  ├─ agent.py             # builds + exports root_agent (Coach) for `adk web` / `adk eval`
│  └─ __init__.py
└─ evalsets/
   ├─ coach.evalset.json   # 8 Coach eval cases (complete, today, why, switch role, market + paraphrases)
   └─ test_config.json     # thresholds: tool_trajectory_avg_score 1.0, response_match_score 0.3
```

---

## The 5 Agents (4 LLM + 1 Deterministic)

| Agent | File | Type | Job | Output |
|---|---|---|---|---|
| **ProfileAgent** | `profile_agent.py` | `LlmAgent`, tool-free, `output_schema=ProfileOut`, `output_key="profile_out"` | Resume/form text → skills with `evidence_level` (0–10 rubric) + ≤15-word `snippet` | Pydantic `ProfileOut` (`education`, `experience_years`, `interests`, `skills[]`) |
| **EngineAgent** | `engine_agent.py` | Custom `BaseAgent` (**no LLM**) | Reads ADK session state (`profile`, `role_id`, hours, overrides) → calls `analyze_gaps` + `build_roadmap` (via `ChromaResourceProvider`) → writes `analysis` + `roadmap` to state | `Event` with `readiness`, `total_weeks`, `items_count` |
| **ExplainerAgent** | `explainer_agent.py` | `LlmAgent`, tool-free, `output_schema=ExplanationsOut` | Writes 1–2 sentence `why` narratives **from facts only**, batched + cached | `item_id → (narrative, "llm" \| "template")`, plus `explain_diff()` for replan banners |
| **CoachAgent** | `coach_agent.py` | `LlmAgent` + 5 tools (**root agent**) | NL interface: complete, today, why, switch role, market update | Tool calls + short factual reply (`run_coach()`) |
| **RoleBuilderAgent** *(optional/SHOULD)* | `role_builder_agent.py` | `LlmAgent`, tool-free, `output_schema=RoleBuilderOut` | Custom role title+description → 8–20 skills chosen **only from catalog IDs** + importance/target | Draft role → validated `RoleDetail` (`custom_<slug>`) |

**Deterministic fallbacks (every LLM step has one):**

| Step | Fallback when chain is `none` or all providers fail |
|---|---|
| ProfileAgent | `heuristic_profile()`: alias-match over resume text (evidence 4.0 + 1.0 per extra mention, max 7.0), ≤15-word snippet, then Chroma `SkillNormalizer` + `calibrate_skill_level` |
| ExplainerAgent | Template narratives from structured `why` facts (`engine/narrative.py`), `narrative_source="template"` |
| CoachAgent | `fallback_coach_router()`: keyword/regex intents calling the **same** 5 tool functions |
| RoleBuilderAgent | Nearest curated role via Chroma (`roles` collection) → lexical Jaccard fallback → `clone_role_under_title()` under `custom_<slug>` |

---

## Pipeline: How an Analysis Runs

`pipeline.py::run_analysis()` (used by `POST /profile` → `POST /analyze` via `app/services.py`):

```
1. extract_profile(resume_text, form_data)   # LLM failover -> heuristic fallback
     -> Chroma SkillNormalizer ("ReactJS" -> react)
     -> calibrate_skill_level (0.6*evidence + 0.4*self; unverified discount; "override" wins)
2. analyze_gaps(profile_state, role)         # deterministic: gap, priority, readiness
3. build_roadmap(...)                        # deterministic: prereq closure, topo sort,
                                             # hours x experience multiplier, week packing, phases,
                                             # ChromaResourceProvider activities, capstone
4. explain_items(roadmap.items, role_title)  # batched LLM + SQLite llm_cache +
                                             # validate_narrative_numbers -> template on mismatch
5. return AnalyzeResponse(role, analysis, roadmap, meta)
```

`build_pipeline()` exposes the same flow as an ADK `SequentialAgent` named `CareerTwinPipeline` (`ProfileAgent → EngineAgent → ExplainerAgent`) for `adk web` inspection. Note: agents with `output_schema` are tool-free by ADK convention — data passes via `output_key` / session state, and all factories take a `model` so failover just rebuilds with the next provider.

---

## Coach Tools (Chat → Engine)

`coach_tools.py` — plain Python functions with type hints + docstrings (ADK generates function declarations from them). Each reads `user_id` from `tool_context.state` (default `"demo"`), calls the **same** `app/services.py` functions as the FastAPI routes, and returns a **compact dict** (never full state):

| Tool | Args | Does |
|---|---|---|
| `mark_complete` | `skill_id` | `services.complete()` → readiness before/after, `facts`, `unlocked`; sets `state["last_diff"]` |
| `get_today_priority` | — | `services.get_today()` → skill, activity title, minutes, URL, reasons |
| `explain_item` | `item_id` | `services.get_state()` → match `rm_<skill>` / skill name → priority, gap text, `unblocks`, narrative |
| `set_target_role` | `role_id` | Alias map (`ml`→`ml_engineer`, `genai`→`genai_engineer`, ...) → `services.analyze()` → new readiness, weeks, top gaps |
| `apply_market_update` | — | `services.market_update()` → role version, readiness before/after, facts |

`coach_agent.py::run_coach(message, session_id, user_id)` runs them via ADK `Runner(app_name="careertwin", agent, session_service=InMemorySessionService, auto_create_session=True)` with per-provider failover; on total failure it uses `fallback_coach_router()` intents: market-update → today → complete (`"I completed RAG"`) → why (`"Why Docker?"`) → switch-role → help text. Returns `(reply, tool_calls, state_changed, last_diff, provider, fallback_used)` so `POST /coach` can refresh UI state without another call.

---

## Providers & Failover

- Config comes only from `backend/.env`: `LLM_PROVIDER_CHAIN` (e.g. `gemini,groq,openrouter`; `none` = deterministic), `GEMINI_API_KEY/MODEL` (native ADK), `GROQ_API_KEY/MODEL` + `OPENROUTER_API_KEY/MODEL` (via `LiteLlm`), `LLM_TIMEOUT_SECONDS`.
- `backend/llm/provider.py`: `get_model(provider)`, `available_chain()` (skips providers with no key). `config.py` maps `GEMINI_API_KEY` → ADK's `GOOGLE_API_KEY`; LiteLLM reads Groq/OpenRouter keys directly.
- `backend/llm/failover.py`: `run_with_failover(step_name, make_call, chain)` — 1 retry per provider → next provider → raise `AllProvidersFailed` → caller runs its deterministic fallback above.
- `backend/llm/parsing.py`: `parse_and_validate()` — strips code fences, tolerant JSON parse, Pydantic validation, one retry.
- Every response carries `meta { llm_provider, llm_used, fallback_used }`; `/health` lists the chain. Model IDs change often (esp. free tiers) — verify on provider sites, never hard-code.
- `adk eval` runs on **Gemini only** (LiteLLM trajectory scoring has known issues; Groq/OpenRouter are runtime failover only).

---

## Helpers: Resume Text + Validator

- **`resume_text.py`** — `extract_resume_text(file_bytes, filename, raw_text)`: raw text wins if non-empty; else `pypdf.PdfReader` page text joined + stripped. Raises `ResumeParseError` (`RESUME_PARSE_ERROR`) on empty/unreadable PDFs — surfaced as the API's `RESUME_PARSE_ERROR`.
- **`validator.py`** — `validate_narrative_numbers(narrative, why)`: regex-extracts all numbers from LLM prose; passes only if every number ∈ `{level, target, gap, importance, importance*100, priority, 10.0, len(unblocks)}` (rounded). Any invented number → `False` → template fallback. This is how explanations "never contradict the scoring."

---

## Navigator Root Agent (`adk web` / `adk eval`)

`navigator/agent.py` builds the Coach with the primary available provider and exports **`root_agent`** (re-exported by `navigator/__init__.py`). ADK discovers it for:

```bash
cd backend
adk web agents/navigator    # visual debugger with traces (Coach + tools)
adk eval agents/navigator agents/evalsets/coach.evalset.json --config=agents/evalsets/test_config.json
```

---

## Evalsets (Coach Test Cases)

`evalsets/coach.evalset.json` — 8 cases: `eval_complete_rag` ("I completed RAG" → `mark_complete(rag)`), `eval_today_priority` ("What should I learn today?" → `get_today_priority`), `eval_explain_docker` ("Why Docker?" → `explain_item`), `eval_switch_ml` ("Switch to ML engineer" → `set_target_role(ml_engineer)`), `eval_market_update` ("Requirements changed" → `apply_market_update`), + 3 paraphrase variants (`complete_rag`, `today`, `explain_docker`).

`evalsets/test_config.json`:

```json
{ "criteria": { "tool_trajectory_avg_score": 1.0, "response_match_score": 0.3 } }
```

Trajectory score is the important one; response-match is ROUGE word overlap (brittle for LLM prose → low threshold). Results feed `backend/eval/report.json → adk` block → frontend `/eval` tab.

---

## Setup & Running

Agents live inside the backend; no separate install:

```bash
cd backend
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1        # Windows | source .venv/bin/activate (macOS/Linux)
pip install -r requirements.txt   # includes google-adk==2.9.2, litellm, chromadb, pypdf, ...
cp .env.example .env              # set LLM_PROVIDER_CHAIN + keys (or leave empty for fallback mode)
```

Try the agents end-to-end via the API (backend running with `make run`):

```bash
curl http://localhost:8000/api/health
# POST /profile -> POST /analyze -> POST /coach {"message":"What should I do today?","session_id":"s1"}
```

Or directly in ADK: `adk web agents/navigator` (needs `GEMINI_API_KEY` for live LLM; without keys the app still works via fallbacks, but `adk eval` needs Gemini).

---

## Tests

```bash
cd backend
pytest tests/test_coach.py tests/test_role_builder.py -v   # agent unit tests
pytest -q                                                  # full suite (engine + API + agents)
LLM_PROVIDER_CHAIN=none pytest -q                          # prove deterministic fallbacks
python -m eval.run_eval                                    # engine metrics + adk eval -> eval/report.json
```

---

## Rules for Contributors

From `docs/AGENTS.md` + `docs/SPEC.md` (agents-relevant):

1. `docs/SPEC.md` is the source of truth — no new agents, tools, files, or fields outside it.
2. LLMs never invent skills/prereqs/levels/resources/URLs — only parse, select from catalogs, explain facts.
3. Every LLM step keeps a deterministic fallback; `LLM_PROVIDER_CHAIN=none` must run.
4. All models/keys/timeouts from `.env` — no secrets or model names in code; agents come from factories taking a `model`.
5. Tool-free agents use `output_schema` + `output_key`; only Coach has tools.
6. Small commits; each phase ends by running its acceptance commands.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `adk web/eval` import errors | Run from `backend/` (so `agents.*`, `app.*`, `llm.*` resolve); `navigator/agent.py` inserts backend root into `sys.path` automatically |
| All LLM calls fall back to templates | Check `backend/.env` keys + `LLM_PROVIDER_CHAIN`; `/api/health` shows the active chain; responses show `meta.fallback_used=true` |
| Profile misses skills | Heuristic needs exact alias match — add aliases in `backend/data/skills.json`, or check Chroma `skills` collection normalization + `unmapped_skills` in the response |
| Explainer returns template narratives | Expected when numbers fail `validate_narrative_numbers` or providers fail — check logs for `Narrative validation failed` / `all providers failed` |
| Coach says "not found" for an item | Use canonical `skill_id` or `rm_<skill_id>` (e.g. `docker` / `rm_docker`); tools normalize via Chroma, but custom text may not map |
| `adk eval` scores low on response-match | Normal — threshold is intentionally 0.3; focus on `tool_trajectory_avg_score` = 1.0 |
| Role builder rejects output (< 8 valid skills) | LLM invented IDs — `validate_and_normalize_skills` drops unknowns; fallback clones nearest curated role instead |

Related docs: repo-root `README.md` (full product) · `docs/SPEC.md` (§3 ADK decision, §3.1 providers, §5 agents, §8 sketches, §12 explainability, §13.3 evalsets) · `docs/AGENTS.md` · `backend/README.md` (if present) · live API docs at http://localhost:8000/docs.
