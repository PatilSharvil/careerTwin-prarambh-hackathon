"""FastAPI application entry point per SPEC §10.

Implements frozen API contract routes, error envelopes, CORS, and startup lifecycle.
"""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import json
import logging
from pathlib import Path
import time
from typing import Any
import uuid

from fastapi import APIRouter, Depends, FastAPI, File, Form, Header, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app import services
from app.config import settings
from app.errors import AppError, register_error_handlers
from app.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    CoachRequest,
    CoachResponse,
    CompleteRequest,
    CustomRoleRequest,
    CustomRoleResponse,
    Diff,
    EvalReport,
    Health,
    KnownRequest,
    LlmHealth,
    MarketUpdateRequest,
    Meta,
    ProfileInput,
    ProfileResponse,
    ProgressResponse,
    RolesResponse,
    TodayResponse,
)
from agents.coach_agent import run_coach
from engine.catalog import Catalog
from llm.provider import available_chain
from rag.chroma_client import get_chroma_client
from rag.indexer import index_knowledge_base
from store import repo
from store.db import init_db

logger = logging.getLogger("careertwin.app")
EVAL_REPORT_PATH = Path(__file__).resolve().parent.parent / "eval" / "report.json"


def get_user_id(x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> str:
    """Resolve demo user ID from optional X-User-Id header or settings."""
    return x_user_id or settings.DEFAULT_USER_ID or "demo"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle per SPEC §10.1 & §16."""
    # 1. Initialize & verify DB schema
    init_db()
    with repo.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]
        logger.info("[SELF-CHECK] SQLite DB initialized successfully: %d tables (%s)", len(tables), ", ".join(tables))

    # 2. Validate Catalog knowledge base and acyclic DAG
    cat = Catalog.from_data_dir()
    cat.prerequisite_closure(["rag", "agent_systems", "model_evaluation", "data_pipelines"])
    logger.info(
        "[SELF-CHECK] Catalog validated: %d skills, %d curated roles. DAG topological closure verified.",
        len(cat.skills),
        len(cat.roles),
    )

    # 3. Run ChromaDB index check in background daemon thread so Uvicorn port opens in 0.05s
    import threading
    def _bg_index_check():
        try:
            idx_res = index_knowledge_base()
            logger.info("[SELF-CHECK] ChromaDB index verified: %s", idx_res)
        except Exception as exc:
            logger.warning("[SELF-CHECK] ChromaDB index encountered: %s", exc)

    threading.Thread(target=_bg_index_check, daemon=True).start()

    # 4. Check LLM provider chain
    chain = settings.provider_chain()
    avail = available_chain()
    logger.info("[SELF-CHECK] LLM chain configured: %s; available with API keys: %s", chain, avail)

    yield


app = FastAPI(title="CareerTwin API", version="0.1.0", lifespan=lifespan)

# Request-ID and access logging middleware
@app.middleware("http")
async def request_id_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()
    logger.info("--> %s %s [req_id=%s]", request.method, request.url.path, request_id)
    try:
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "<-- %s %s status=%d elapsed=%.2fms [req_id=%s]",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            request_id,
        )
        response.headers["X-Request-Id"] = request_id
        return response
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.error(
            "<-- %s %s error=%s elapsed=%.2fms [req_id=%s]",
            request.method,
            request.url.path,
            exc,
            elapsed_ms,
            request_id,
        )
        raise

# Configure CORS
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:.*|http://127\.0\.0\.1:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

api_router = APIRouter(prefix="/api")


# 1. GET /health
@api_router.get("/health", response_model=Health)
async def get_health() -> Health:
    chain = settings.provider_chain()
    primary = chain[0] if chain else "none"

    # Probe DB
    db_status = "ok"
    try:
        with repo.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception as exc:
        logger.error("Health probe DB failed: %s", exc)
        db_status = "error"

    # Probe ChromaDB
    chroma_status = "ok"
    try:
        client = get_chroma_client()
        client.heartbeat()
    except Exception as exc:
        logger.error("Health probe Chroma failed: %s", exc)
        chroma_status = "error"

    return Health(
        status="ok",
        version="0.1.0",
        llm=LlmHealth(chain=chain, primary=primary),
        chroma=chroma_status,
        db=db_status,
    )


# 2. GET /roles
@api_router.get("/roles", response_model=RolesResponse)
async def get_roles(user_id: str = Depends(get_user_id)) -> RolesResponse:
    return services.list_roles(user_id=user_id)


# 3. POST /roles/custom
@api_router.post("/roles/custom", response_model=CustomRoleResponse)
async def create_custom_role(payload: CustomRoleRequest) -> CustomRoleResponse:
    return await services.create_custom_role(payload)


# 4. POST /profile
@api_router.post("/profile", response_model=ProfileResponse)
async def create_profile(
    data: str = Form(...),
    resume: UploadFile | None = File(default=None),
    user_id: str = Depends(get_user_id),
) -> ProfileResponse:
    try:
        data_dict = json.loads(data)
        profile_input = ProfileInput.model_validate(data_dict)
    except Exception as exc:
        raise AppError(
            code="VALIDATION_ERROR",
            message=f"Invalid profile input payload: {exc}",
            status_code=422,
        )

    resume_bytes = None
    resume_filename = None
    if resume is not None and resume.filename:
        resume_bytes = await resume.read()
        resume_filename = resume.filename

    return await services.create_profile(
        user_id=user_id,
        form_data=profile_input,
        resume_bytes=resume_bytes,
        resume_filename=resume_filename,
    )


# 5. GET /profile
@api_router.get("/profile", response_model=ProfileResponse)
async def get_profile(user_id: str = Depends(get_user_id)) -> ProfileResponse:
    return services.get_profile(user_id=user_id)


# 6. POST /analyze
@api_router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_profile(
    payload: AnalyzeRequest,
    user_id: str = Depends(get_user_id),
) -> AnalyzeResponse:
    return services.analyze(user_id=user_id, req=payload)


# 7. GET /roadmap
@api_router.get("/roadmap", response_model=AnalyzeResponse)
async def get_roadmap(user_id: str = Depends(get_user_id)) -> AnalyzeResponse:
    return services.get_state(user_id=user_id)


# 8. POST /progress/complete
@api_router.post("/progress/complete", response_model=ProgressResponse)
async def complete_progress(
    payload: CompleteRequest,
    user_id: str = Depends(get_user_id),
) -> ProgressResponse:
    return services.complete(user_id=user_id, req=payload)


# 9. POST /progress/known
@api_router.post("/progress/known", response_model=ProgressResponse)
async def mark_known(
    payload: KnownRequest,
    user_id: str = Depends(get_user_id),
) -> ProgressResponse:
    return services.mark_known_skill(user_id=user_id, req=payload)


# 10. GET /today
@api_router.get("/today", response_model=TodayResponse)
async def get_today(user_id: str = Depends(get_user_id)) -> TodayResponse:
    return services.get_today(user_id=user_id)


# 11. POST /market/update
@api_router.post("/market/update", response_model=ProgressResponse)
async def market_update(
    payload: MarketUpdateRequest | None = None,
    user_id: str = Depends(get_user_id),
) -> ProgressResponse:
    req = payload or MarketUpdateRequest()
    return services.market_update(user_id=user_id, req=req)


# 12. POST /coach
@api_router.post("/coach", response_model=CoachResponse)
async def coach(
    payload: CoachRequest,
    user_id: str = Depends(get_user_id),
) -> CoachResponse:
    # 1. Require an existing roadmap per SPEC §10.3
    _, roadmap_dict = repo.get_latest_roadmap(user_id)
    if roadmap_dict is None:
        raise AppError(
            code="NO_ROADMAP",
            message="Generate a roadmap first (POST /analyze).",
            status_code=400,
        )

    # 2. Run coach agent with session and failover/fallback
    reply, tool_calls, state_changed, last_diff, provider, fallback_used = await run_coach(
        message=payload.message,
        session_id=payload.session_id,
        user_id=user_id,
    )

    # 3. If state changed, retrieve fresh state and diff per SPEC §10.4
    fresh_state = None
    diff_obj = None
    if state_changed:
        fresh_state = services.get_state(user_id=user_id)
        if isinstance(last_diff, dict):
            try:
                diff_obj = Diff.model_validate(last_diff)
            except Exception:
                diff_obj = None

    return CoachResponse(
        reply=reply,
        tool_calls=tool_calls,
        state_changed=state_changed,
        state=fresh_state,
        diff=diff_obj,
        meta=Meta(
            llm_provider=provider,
            llm_used=(provider != "none" and not fallback_used),
            fallback_used=fallback_used,
        ),
    )


# 13. GET /eval/report
@api_router.get("/eval/report", response_model=EvalReport)
async def get_eval_report() -> EvalReport:
    report_file = EVAL_REPORT_PATH
    if not report_file.exists() or report_file.stat().st_size <= 2:
        raise AppError(
            code="EVAL_NOT_RUN",
            message="Evaluation report not found. Run 'make eval' first.",
            status_code=404,
        )
    try:
        with open(report_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not data or "generated_at" not in data:
            raise AppError(
                code="EVAL_NOT_RUN",
                message="Evaluation report not found. Run 'make eval' first.",
                status_code=404,
            )
        return EvalReport.model_validate(data)
    except AppError:
        raise
    except Exception:
        raise AppError(
            code="EVAL_NOT_RUN",
            message="Evaluation report not found. Run 'make eval' first.",
            status_code=404,
        )


app.include_router(api_router)
