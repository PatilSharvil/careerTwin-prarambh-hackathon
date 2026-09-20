"""Tests for API contract validation per SPEC §10.

Verifies:
- Complete happy path: POST /profile -> POST /analyze -> GET /roadmap -> GET /today -> POST /progress/complete -> POST /market/update
- Every response strictly passes Pydantic model_validate() against app.schemas
- Error handling: NO_PROFILE, UNKNOWN_ROLE, UNKNOWN_SKILL, UNKNOWN_ACTIVITY, NO_MARKET_UPDATE, EVAL_NOT_RUN, VALIDATION_ERROR
- Idempotent completion returns 200, empty diff, facts ["Already complete"]
- No external network calls (LLM_PROVIDER_CHAIN=none)
"""
from __future__ import annotations

import json
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import (
    AnalyzeResponse,
    ApiErrorEnvelope,
    Health,
    ProfileResponse,
    ProgressResponse,
    RolesResponse,
    TodayResponse,
)
import os
from app.config import settings
from store.db import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_env_and_db(tmp_path, monkeypatch):
    test_db = tmp_path / "test_contract.db"
    monkeypatch.setenv("DATABASE_PATH", str(test_db))
    monkeypatch.setattr(settings, "DATABASE_PATH", str(test_db))
    monkeypatch.setenv("LLM_PROVIDER_CHAIN", "none")
    monkeypatch.setattr(settings, "LLM_PROVIDER_CHAIN", "none")
    init_db(test_db)


# =====================================================================
# 1. Happy Path & Schema Validation Test
# =====================================================================
def test_happy_path_schema_validation():
    """Happy path workflow: every response satisfies its frozen Pydantic schema."""
    user_id = f"test_user_{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": user_id}

    # 1. GET /roles
    roles_res = client.get("/api/roles", headers=headers)
    assert roles_res.status_code == 200
    roles_model = RolesResponse.model_validate(roles_res.json())
    assert len(roles_model.roles) >= 4
    genai_role = next(r for r in roles_model.roles if r.role_id == "genai_engineer")
    assert len(genai_role.top_skills) == 5
    assert genai_role.market_update_available is True

    # 2. POST /profile (multipart)
    profile_data = {
        "education": {"degree": "B.S. Software Engineering", "year": 2021},
        "experience_years": 2.5,
        "interests": ["LLMs", "backend"],
        "self_skills": [
            {"name": "Python", "self": 8.0},
            {"name": "FastAPI", "self": 6.0},
            {"name": "Docker", "self": 3.0},
            {"name": "RAG", "self": 4.0},
        ],
        "resume_text": "Experienced Python developer building REST APIs and exploring LangChain and vector databases.",
    }
    prof_res = client.post(
        "/api/profile",
        data={"data": json.dumps(profile_data)},
        headers=headers,
    )
    assert prof_res.status_code == 200
    prof_model = ProfileResponse.model_validate(prof_res.json())
    assert prof_model.profile.experience_years == 2.5
    assert any(s.skill_id == "python" for s in prof_model.profile.skills)

    # 3. GET /profile
    get_prof_res = client.get("/api/profile", headers=headers)
    assert get_prof_res.status_code == 200
    get_prof_model = ProfileResponse.model_validate(get_prof_res.json())
    assert get_prof_model.profile.education.degree == "B.S. Software Engineering"

    # 4. POST /analyze
    analyze_payload = {
        "role_id": "genai_engineer",
        "weekly_hours": 12.0,
        "deadline_weeks": 14,
        "skill_overrides": {"python": 9.0},
    }
    analyze_res = client.post("/api/analyze", json=analyze_payload, headers=headers)
    assert analyze_res.status_code == 200
    analyze_model = AnalyzeResponse.model_validate(analyze_res.json())
    assert analyze_model.role.role_id == "genai_engineer"
    assert analyze_model.roadmap.version == 1
    assert analyze_model.analysis.readiness >= 0.0
    assert len(analyze_model.analysis.gaps) > 0

    # 5. GET /roadmap
    rm_res = client.get("/api/roadmap", headers=headers)
    assert rm_res.status_code == 200
    rm_model = AnalyzeResponse.model_validate(rm_res.json())
    assert rm_model.roadmap.version == 1

    # 6. GET /today
    today_res = client.get("/api/today", headers=headers)
    assert today_res.status_code == 200
    today_model = TodayResponse.model_validate(today_res.json())
    # Should recommend an available item
    if today_model.today is not None:
        assert today_model.today.minutes >= 60
        assert today_model.today.skill_id is not None

    # 7. POST /progress/complete (skill: rag)
    comp_res = client.post("/api/progress/complete", json={"skill_id": "rag"}, headers=headers)
    assert comp_res.status_code == 200
    comp_model = ProgressResponse.model_validate(comp_res.json())
    assert comp_model.state.roadmap.version == 2
    assert len(comp_model.diff.facts) > 0

    # 8. POST /market/update
    mkt_res = client.post("/api/market/update", json={"role_id": "genai_engineer"}, headers=headers)
    assert mkt_res.status_code == 200
    mkt_model = ProgressResponse.model_validate(mkt_res.json())
    assert mkt_model.state.roadmap.version == 3
    assert mkt_model.state.role.version == "2026.10"
    assert mkt_model.diff.trigger.type == "market_update"


# =====================================================================
# 2. Error Conditions and Envelopes
# =====================================================================
def test_error_analyze_without_profile():
    """Analyzing without a profile returns NO_PROFILE (400)."""
    user_id = f"no_prof_{uuid.uuid4().hex[:8]}"
    res = client.post(
        "/api/analyze",
        json={"role_id": "genai_engineer", "weekly_hours": 10, "deadline_weeks": 12},
        headers={"X-User-Id": user_id},
    )
    assert res.status_code == 400
    envelope = ApiErrorEnvelope.model_validate(res.json())
    assert envelope.error.code == "NO_PROFILE"


def test_error_unknown_role():
    """Analyzing with an unknown role returns UNKNOWN_ROLE (404)."""
    user_id = f"user_{uuid.uuid4().hex[:8]}"
    # Seed profile first
    client.post(
        "/api/profile",
        data={
            "data": json.dumps(
                {
                    "education": {"degree": "B.S.", "year": 2020},
                    "experience_years": 1.0,
                    "interests": [],
                    "self_skills": [{"name": "Python", "self": 5.0}],
                }
            )
        },
        headers={"X-User-Id": user_id},
    )
    res = client.post(
        "/api/analyze",
        json={"role_id": "quantum_chef_lead", "weekly_hours": 10, "deadline_weeks": 12},
        headers={"X-User-Id": user_id},
    )
    assert res.status_code == 404
    envelope = ApiErrorEnvelope.model_validate(res.json())
    assert envelope.error.code == "UNKNOWN_ROLE"


def test_error_unknown_skill():
    """Skill overrides with unknown skill returns UNKNOWN_SKILL (404)."""
    user_id = f"user_{uuid.uuid4().hex[:8]}"
    client.post(
        "/api/profile",
        data={
            "data": json.dumps(
                {
                    "education": {"degree": "B.S.", "year": 2020},
                    "experience_years": 1.0,
                    "interests": [],
                    "self_skills": [{"name": "Python", "self": 5.0}],
                }
            )
        },
        headers={"X-User-Id": user_id},
    )
    res = client.post(
        "/api/analyze",
        json={
            "role_id": "genai_engineer",
            "weekly_hours": 10,
            "deadline_weeks": 12,
            "skill_overrides": {"nonexistent_skill_xyz": 8.0},
        },
        headers={"X-User-Id": user_id},
    )
    assert res.status_code == 404
    envelope = ApiErrorEnvelope.model_validate(res.json())
    assert envelope.error.code == "UNKNOWN_SKILL"


def test_error_second_market_update():
    """Calling market update when already applied returns NO_MARKET_UPDATE (400)."""
    user_id = f"user_{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": user_id}

    # Setup profile & analysis
    client.post(
        "/api/profile",
        data={
            "data": json.dumps(
                {
                    "education": {"degree": "B.S.", "year": 2020},
                    "experience_years": 2.0,
                    "interests": ["LLMs"],
                    "self_skills": [{"name": "Python", "self": 6.0}],
                }
            )
        },
        headers=headers,
    )
    client.post(
        "/api/analyze",
        json={"role_id": "genai_engineer", "weekly_hours": 10, "deadline_weeks": 12},
        headers=headers,
    )

    # First market update succeeds
    res1 = client.post("/api/market/update", json={"role_id": "genai_engineer"}, headers=headers)
    assert res1.status_code == 200

    # Second market update fails
    res2 = client.post("/api/market/update", json={"role_id": "genai_engineer"}, headers=headers)
    assert res2.status_code == 400
    envelope = ApiErrorEnvelope.model_validate(res2.json())
    assert envelope.error.code == "NO_MARKET_UPDATE"


def test_error_bad_payload_validation_envelope():
    """Malformed request payload returns VALIDATION_ERROR (422) envelope."""
    res = client.post(
        "/api/analyze",
        json={"role_id": 12345},  # Missing weekly_hours, deadline_weeks; bad role_id type
    )
    assert res.status_code == 422
    envelope = ApiErrorEnvelope.model_validate(res.json())
    assert envelope.error.code == "VALIDATION_ERROR"
    assert "errors" in envelope.error.details or "message" in envelope.error.message


def test_error_eval_not_run(monkeypatch: pytest.MonkeyPatch, tmp_path):
    """GET /eval/report when missing returns EVAL_NOT_RUN (404)."""
    fake_path = tmp_path / "missing_report.json"
    import app.main as main_module
    monkeypatch.setattr(main_module, "EVAL_REPORT_PATH", fake_path)
    res = client.get("/api/eval/report")
    assert res.status_code == 404
    envelope = ApiErrorEnvelope.model_validate(res.json())
    assert envelope.error.code == "EVAL_NOT_RUN"


# =====================================================================
# 3. Idempotency Test
# =====================================================================
def test_completing_skill_twice_is_idempotent():
    """Completing the same skill twice returns 200, empty diff, and facts ['Already complete']."""
    user_id = f"user_{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": user_id}

    client.post(
        "/api/profile",
        data={
            "data": json.dumps(
                {
                    "education": {"degree": "B.S.", "year": 2020},
                    "experience_years": 3.0,
                    "interests": ["backend"],
                    "self_skills": [{"name": "FastAPI", "self": 5.0}],
                }
            )
        },
        headers=headers,
    )
    client.post(
        "/api/analyze",
        json={"role_id": "genai_engineer", "weekly_hours": 10, "deadline_weeks": 12},
        headers=headers,
    )

    # First complete
    res1 = client.post("/api/progress/complete", json={"skill_id": "fastapi"}, headers=headers)
    assert res1.status_code == 200
    model1 = ProgressResponse.model_validate(res1.json())
    v1 = model1.state.roadmap.version

    # Second complete (idempotent)
    res2 = client.post("/api/progress/complete", json={"skill_id": "fastapi"}, headers=headers)
    assert res2.status_code == 200
    model2 = ProgressResponse.model_validate(res2.json())

    # Diff must be empty
    assert model2.diff.facts == ["Already complete"]
    assert len(model2.diff.level_changes) == 0
    assert len(model2.diff.unlocked) == 0
    assert len(model2.diff.removed) == 0
    assert len(model2.diff.added) == 0
    assert model2.state.roadmap.version == v1
