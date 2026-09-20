"""Tests for RoleBuilderAgent and custom role API per SPEC §5.2, §10.3, & §16.

Verifies:
- Validator drops unknown skill IDs and logs warnings
- Validator enforces 8-20 skills bounds
- Deterministic fallback path when chain is 'none'
- Nearest role matching by Chroma similarity
- POST /api/roles/custom returns valid CustomRoleResponse
- Custom role appears in subsequent GET /api/roles
- Custom role is fully usable in POST /api/analyze
"""
from __future__ import annotations

import json
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import CustomRoleRequest, CustomRoleResponse, RolesResponse, AnalyzeResponse
from agents.role_builder_agent import (
    RoleSkillDraft,
    clone_role_under_title,
    find_nearest_curated_role,
    slugify_title,
    validate_and_normalize_skills,
)
from engine.catalog import Catalog
from store.db import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_env_and_db(monkeypatch):
    from app.config import settings
    monkeypatch.setenv("LLM_PROVIDER_CHAIN", "none")
    monkeypatch.setattr(settings, "LLM_PROVIDER_CHAIN", "none")
    init_db()


def test_slugify_title():
    assert slugify_title("AI Platform Engineer") == "ai_platform_engineer"
    assert slugify_title("GenAI & LLM Specialist!!!") == "genai_llm_specialist"
    assert slugify_title("") == "role"


def test_validator_drops_unknown_skill_ids_and_enforces_bounds():
    cat = Catalog.from_data_dir()
    
    # 1. Provide a mix of known skills, unknown skills, and duplicates
    drafts = [
        RoleSkillDraft(skill_id="python", importance=0.9, target=8.0),
        RoleSkillDraft(skill_id="invented_magic_skill_99", importance=0.8, target=7.0),
        RoleSkillDraft(skill_id="rag", importance=0.85, target=7.0),
        RoleSkillDraft(skill_id="vector_db", importance=0.8, target=7.0),
        RoleSkillDraft(skill_id="docker", importance=0.75, target=6.0),
        RoleSkillDraft(skill_id="fastapi", importance=0.7, target=7.0),
        RoleSkillDraft(skill_id="git", importance=0.6, target=6.0),
        RoleSkillDraft(skill_id="sql", importance=0.7, target=6.0),
        RoleSkillDraft(skill_id="linux_basics", importance=0.65, target=6.0),
        RoleSkillDraft(skill_id="another_fake_skill_123", importance=0.9, target=9.0),
        RoleSkillDraft(skill_id="python", importance=0.5, target=5.0),  # duplicate
    ]

    validated = validate_and_normalize_skills(drafts, catalog=cat)
    # The two unknown skills should be dropped and duplicate ignored
    assert len(validated) == 8
    val_ids = [s.skill_id for s in validated]
    assert "invented_magic_skill_99" not in val_ids
    assert "another_fake_skill_123" not in val_ids
    assert "python" in val_ids
    assert "rag" in val_ids


def test_validator_raises_when_fewer_than_8_valid_skills():
    cat = Catalog.from_data_dir()
    too_few_drafts = [
        RoleSkillDraft(skill_id="python", importance=0.9, target=8.0),
        RoleSkillDraft(skill_id="unknown_skill_a", importance=0.8, target=7.0),
        RoleSkillDraft(skill_id="rag", importance=0.85, target=7.0),
    ]
    with pytest.raises(ValueError, match="minimum required is 8"):
        validate_and_normalize_skills(too_few_drafts, catalog=cat)


def test_validator_truncates_when_more_than_20_skills():
    cat = Catalog.from_data_dir()
    # Take 25 valid skills from catalog
    many_drafts = [
        RoleSkillDraft(skill_id=s.id, importance=0.5 + (i * 0.01), target=6.0)
        for i, s in enumerate(cat.skills[:25])
    ]
    validated = validate_and_normalize_skills(many_drafts, catalog=cat)
    assert len(validated) == 20
    # Verified top by importance
    assert validated[0].importance >= validated[-1].importance


def test_chroma_nearest_role_fallback_and_cloning():
    cat = Catalog.from_data_dir()
    nearest = find_nearest_curated_role(
        title="Agentic Workflow Specialist",
        description="Builds autonomous LLM agent systems and RAG pipelines",
        catalog=cat,
    )
    assert nearest is not None
    # Agentic workflows should map closest to genai_engineer
    assert nearest.role_id == "genai_engineer"

    cloned = clone_role_under_title(
        nearest,
        title="Agentic Workflow Specialist",
        description="Builds autonomous LLM agent systems and RAG pipelines",
        catalog=cat,
    )
    assert cloned.role_id == "custom_agentic_workflow_specialist"
    assert cloned.title == "Agentic Workflow Specialist"
    assert cloned.is_custom is True
    assert 8 <= cloned.skill_count <= 20
    assert len(cloned.top_skills) == 5


def test_post_roles_custom_api_end_to_end():
    # 1. Create custom role
    req_body = {
        "title": "Fullstack AI Engineer",
        "description": "Develops production web applications integrated with LLM agents, vector search, and scalable backend APIs",
    }
    res = client.post("/api/roles/custom", json=req_body)
    assert res.status_code == 200
    custom_resp = CustomRoleResponse.model_validate(res.json())
    assert custom_resp.role.role_id == "custom_fullstack_ai_engineer"
    assert custom_resp.role.is_custom is True
    assert 8 <= custom_resp.role.skill_count <= 20
    assert custom_resp.meta.fallback_used is True

    # 2. Verify it appears in GET /api/roles
    res_roles = client.get("/api/roles")
    assert res_roles.status_code == 200
    roles_resp = RolesResponse.model_validate(res_roles.json())
    custom_ids = [r.role_id for r in roles_resp.roles if r.is_custom]
    assert "custom_fullstack_ai_engineer" in custom_ids

    # 3. Create a profile and analyze against this custom role
    user_id = f"user_{uuid.uuid4().hex[:8]}"
    headers = {"X-User-Id": user_id}

    profile_payload = {
        "education": {"degree": "B.S. Computer Science", "year": 2024},
        "experience_years": 2.0,
        "interests": ["agent_systems", "rag", "fastapi"],
        "self_skills": [
            {"name": "Python", "self": 7.0},
            {"name": "FastAPI", "self": 6.0},
            {"name": "SQL", "self": 5.0},
        ],
    }
    client.post(
        "/api/profile",
        data={"data": json.dumps(profile_payload)},
        headers=headers,
    )

    analyze_payload = {
        "role_id": "custom_fullstack_ai_engineer",
        "weekly_hours": 10.0,
        "deadline_weeks": 12,
    }
    res_analyze = client.post("/api/analyze", json=analyze_payload, headers=headers)
    assert res_analyze.status_code == 200
    analyze_resp = AnalyzeResponse.model_validate(res_analyze.json())
    assert analyze_resp.role.role_id == "custom_fullstack_ai_engineer"
    assert len(analyze_resp.roadmap.items) > 0
    assert analyze_resp.analysis.readiness >= 0.0

