"""FastAPI application entry point per SPEC §10.

Implements frozen API contract routes, error envelopes, CORS, and startup lifecycle.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, FastAPI, File, Form, Header, UploadFile
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
    EvalReport,
    Health,
    KnownRequest,
    LlmHealth,
    MarketUpdateRequest,
    ProfileInput,
    ProfileResponse,
    ProgressResponse,
    RolesResponse,
    TodayResponse,
)
from engine.catalog import Catalog
from rag.indexer import index_knowledge_base
from store.db import init_db

logger = logging.getLogger("careertwin.app")


def get_user_id(x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> str:
    """Resolve demo user ID from optional X-User-Id header or settings."""
    return x_user_id or settings.DEFAULT_USER_ID or "demo"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle per SPEC §10.1."""
    # 1. Initialize DB tables
    init_db()
    # 2. Load catalog
    Catalog.from_data_dir()
    # 3. Index ChromaDB (idempotent)
    try:
        index_knowledge_base()
    except Exception as exc:
        logger.warning("ChromaDB index on startup encountered: %s", exc)
    yield


app = FastAPI(title="CareerTwin API", version="0.1.0", lifespan=lifespan)

# Configure CORS
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
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
    return Health(
        status="ok",
        version="0.1.0",
        llm=LlmHealth(chain=chain, primary=primary),
        chroma="ok",
        db="ok",
    )


# 2. GET /roles
@api_router.get("/roles", response_model=RolesResponse)
async def get_roles(user_id: str = Depends(get_user_id)) -> RolesResponse:
    return services.list_roles(user_id=user_id)


# 3. POST /roles/custom (stay 501 until B9)
@api_router.post("/roles/custom", response_model=CustomRoleResponse)
async def create_custom_role(payload: CustomRoleRequest | None = None) -> CustomRoleResponse:
    raise AppError(code="NOT_IMPLEMENTED", message="POST /roles/custom is not implemented yet", status_code=501)


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


# 12. POST /coach (stay 501 until B7)
@api_router.post("/coach", response_model=CoachResponse)
async def coach(payload: CoachRequest | None = None) -> CoachResponse:
    raise AppError(code="NOT_IMPLEMENTED", message="POST /coach is not implemented yet", status_code=501)


# 13. GET /eval/report
@api_router.get("/eval/report", response_model=EvalReport)
async def get_eval_report() -> EvalReport:
    report_file = Path(__file__).resolve().parent.parent / "eval" / "report.json"
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
