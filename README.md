# CareerTwin — Personalized Career & Skill Navigator Agent

CareerTwin is an adaptive, measurable career and skill navigation system that computes skill gaps, topological roadmaps, and replan diffs.

## Architecture & Layout

- **`backend/`**: FastAPI wrapping Google ADK runner + pure Python Career Engine + ChromaDB.
- **`frontend/`**: React + Vite + TypeScript (strict) + Tailwind CSS + Recharts + @xyflow/react.
- **`docs/`**: Frozen specification (`docs/SPEC.md`), agent guardrails (`docs/AGENTS.md`), and contract issues log (`docs/CONTRACT_ISSUES.md`).

---

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create and activate Python 3.11+ virtual environment
py -3.11 -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# Run tests
make test

# Start the API server (serves on http://localhost:8000)
make run
```

### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Configure environment
cp .env.example .env

# Run type checking
npm run typecheck

# Build for production
npm run build

# Start the Vite development server (serves on http://localhost:5173)
npm run dev
```

---

## Acceptance Checks

- Backend health check: `curl http://localhost:8000/api/health`
- Backend not implemented test: `curl -X POST http://localhost:8000/api/analyze`
- Frontend typecheck: `cd frontend && npm run typecheck`
- Frontend build: `cd frontend && npm run build`
