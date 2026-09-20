1. docs/SPEC.md is the source of truth. Do not add features, endpoints, fields, screens, libraries or files that are not in it.
2. The API contract (SPEC §10) is FROZEN. backend/app/schemas.py and frontend/src/types/api.ts must match it exactly. Contract problems go in docs/CONTRACT_ISSUES.md; never patch around them locally.
3. backend/engine is pure Python: never import google.adk, chromadb, fastapi, llm, or app.* there. Resources arrive through a provider interface.
4. LLMs never invent skills, prerequisites, levels, resources or URLs. An LLM only parses text, words explanations from provided facts, and picks from provided catalogs.
5. Every LLM step has a deterministic fallback. LLM_PROVIDER_CHAIN=none must run the whole app.
6. All model/provider/config choices come from .env. No secrets or model names in code.
7. Every function in backend/engine has a pytest case; write engine tests first.
8. Frontend: TypeScript strict, no `any`, all HTTP through src/api/client.ts, nothing computed or invented client-side; render what the API returns.
9. Small commits. Every phase ends by running its acceptance commands and reporting output.
10. When unsure, ask instead of inventing.
