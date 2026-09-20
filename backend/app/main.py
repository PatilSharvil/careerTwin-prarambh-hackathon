from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    ProfileResponse,
    ProgressResponse,
    RolesResponse,
    TodayResponse,
)

app = FastAPI(title="CareerTwin API", version="0.1.0")

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
async def get_roles() -> RolesResponse:
    raise AppError(code="NOT_IMPLEMENTED", message="GET /roles is not implemented yet", status_code=501)

# 3. POST /roles/custom
@api_router.post("/roles/custom", response_model=CustomRoleResponse)
async def create_custom_role(payload: CustomRoleRequest | None = None) -> CustomRoleResponse:
    raise AppError(code="NOT_IMPLEMENTED", message="POST /roles/custom is not implemented yet", status_code=501)

# 4. POST /profile
@api_router.post("/profile", response_model=ProfileResponse)
async def create_profile() -> ProfileResponse:
    raise AppError(code="NOT_IMPLEMENTED", message="POST /profile is not implemented yet", status_code=501)

# 5. GET /profile
@api_router.get("/profile", response_model=ProfileResponse)
async def get_profile() -> ProfileResponse:
    raise AppError(code="NOT_IMPLEMENTED", message="GET /profile is not implemented yet", status_code=501)

# 6. POST /analyze
@api_router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_profile(payload: AnalyzeRequest | None = None) -> AnalyzeResponse:
    raise AppError(code="NOT_IMPLEMENTED", message="POST /analyze is not implemented yet", status_code=501)

# 7. GET /roadmap
@api_router.get("/roadmap", response_model=AnalyzeResponse)
async def get_roadmap() -> AnalyzeResponse:
    raise AppError(code="NOT_IMPLEMENTED", message="GET /roadmap is not implemented yet", status_code=501)

# 8. POST /progress/complete
@api_router.post("/progress/complete", response_model=ProgressResponse)
async def complete_progress(payload: CompleteRequest | None = None) -> ProgressResponse:
    raise AppError(code="NOT_IMPLEMENTED", message="POST /progress/complete is not implemented yet", status_code=501)

# 9. POST /progress/known
@api_router.post("/progress/known", response_model=ProgressResponse)
async def mark_known(payload: KnownRequest | None = None) -> ProgressResponse:
    raise AppError(code="NOT_IMPLEMENTED", message="POST /progress/known is not implemented yet", status_code=501)

# 10. GET /today
@api_router.get("/today", response_model=TodayResponse)
async def get_today() -> TodayResponse:
    raise AppError(code="NOT_IMPLEMENTED", message="GET /today is not implemented yet", status_code=501)

# 11. POST /market/update
@api_router.post("/market/update", response_model=ProgressResponse)
async def market_update(payload: MarketUpdateRequest | None = None) -> ProgressResponse:
    raise AppError(code="NOT_IMPLEMENTED", message="POST /market/update is not implemented yet", status_code=501)

# 12. POST /coach
@api_router.post("/coach", response_model=CoachResponse)
async def coach(payload: CoachRequest | None = None) -> CoachResponse:
    raise AppError(code="NOT_IMPLEMENTED", message="POST /coach is not implemented yet", status_code=501)

# 13. GET /eval/report
@api_router.get("/eval/report", response_model=EvalReport)
async def get_eval_report() -> EvalReport:
    raise AppError(code="NOT_IMPLEMENTED", message="GET /eval/report is not implemented yet", status_code=501)

app.include_router(api_router)
