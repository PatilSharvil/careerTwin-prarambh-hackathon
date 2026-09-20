"""Unit and integration tests for CoachAgent, tools, fallback router, and /coach endpoint.

Verifies SPEC §5.2, §8, §10.3, and §13.3.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from google.adk.evaluation.eval_config import EvalConfig
from google.adk.evaluation.eval_set import EvalSet

from agents.coach_agent import fallback_coach_router
from agents.navigator import root_agent
from app.config import settings
from app.main import app
from store.db import init_db


@pytest.fixture(autouse=True)
def setup_test_environment(tmp_path, monkeypatch):
    """Setup isolated test sqlite database and mock provider environment."""
    test_db = tmp_path / "test_careertwin.db"
    monkeypatch.setenv("DATABASE_PATH", str(test_db))
    monkeypatch.setattr(settings, "DATABASE_PATH", str(test_db))
    monkeypatch.setenv("LLM_PROVIDER_CHAIN", "none")
    monkeypatch.setattr(settings, "LLM_PROVIDER_CHAIN", "none")
    monkeypatch.setenv("DEFAULT_USER_ID", "test_coach_user")
    monkeypatch.setattr(settings, "DEFAULT_USER_ID", "test_coach_user")
    init_db(test_db)


def test_root_agent_export():
    """Verify that agents.navigator.root_agent exists and is configured."""
    assert root_agent is not None
    assert root_agent.name == "CoachAgent"
    assert len(root_agent.tools) == 5
    tool_names = {t.__name__ for t in root_agent.tools}
    assert tool_names == {
        "mark_complete",
        "get_today_priority",
        "explain_item",
        "set_target_role",
        "apply_market_update",
    }


def test_evalset_and_config_schemas():
    """Verify that coach.evalset.json and test_config.json follow ADK schemas."""
    evalset_path = Path(__file__).resolve().parent.parent / "agents" / "evalsets" / "coach.evalset.json"
    assert evalset_path.exists()
    with open(evalset_path, "r", encoding="utf-8") as f:
        data = f.read()
    eval_set = EvalSet.model_validate_json(data)
    assert len(eval_set.eval_cases) == 8

    # Verify expected test cases are present
    case_ids = {c.eval_id for c in eval_set.eval_cases}
    assert "eval_complete_rag" in case_ids
    assert "eval_today_priority" in case_ids
    assert "eval_explain_docker" in case_ids
    assert "eval_switch_ml" in case_ids
    assert "eval_market_update" in case_ids
    assert "eval_complete_rag_paraphrase" in case_ids
    assert "eval_today_paraphrase" in case_ids
    assert "eval_explain_docker_paraphrase" in case_ids

    # Verify test_config.json
    config_path = Path(__file__).resolve().parent.parent / "agents" / "evalsets" / "test_config.json"
    assert config_path.exists()
    with open(config_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    eval_cfg = EvalConfig.model_validate(cfg)
    assert eval_cfg.criteria["tool_trajectory_avg_score"] == 1.0
    assert eval_cfg.criteria["response_match_score"] == 0.3


def test_fallback_router_unmatched():
    """Verify fallback router returns helpful guidance on unrecognized inputs."""
    reply, tool_calls, state_changed, last_diff = fallback_coach_router(
        message="Can you write a poem about artificial intelligence?",
        user_id="test_coach_user",
    )
    assert "Career Coach" in reply
    assert len(tool_calls) == 0
    assert state_changed is False
    assert last_diff is None


def test_coach_endpoint_no_roadmap_400():
    """Verify /coach returns 400 NO_ROADMAP when no roadmap exists."""
    client = TestClient(app)
    res = client.post(
        "/api/coach",
        json={"message": "What should I learn today?", "session_id": "sess_1"},
        headers={"X-User-Id": "nonexistent_user"},
    )
    assert res.status_code == 400
    data = res.json()
    assert data["error"]["code"] == "NO_ROADMAP"


def test_coach_endpoint_full_lifecycle():
    """Verify /coach endpoint end-to-end with stateful tools."""
    client = TestClient(app)
    user_header = {"X-User-Id": "coach_tester"}

    # 1. Create profile
    profile_data = {
        "education": {"degree": "B.S. Computer Science", "year": 2022},
        "experience_years": 2.0,
        "interests": ["agents", "rag"],
        "self_skills": [
            {"name": "Python", "self": 8.0},
            {"name": "Docker", "self": 2.0},
            {"name": "RAG", "self": 3.0},
        ],
        "resume_text": "Python developer working with FastAPI, Docker, and LLM applications.",
    }
    res_prof = client.post("/api/profile", data={"data": json.dumps(profile_data)}, headers=user_header)
    assert res_prof.status_code == 200

    # 2. Analyze
    analyze_payload = {
        "role_id": "genai_engineer",
        "weekly_hours": 10.0,
        "deadline_weeks": 12,
    }
    res_an = client.post("/api/analyze", json=analyze_payload, headers=user_header)
    assert res_an.status_code == 200

    # 3. Ask today's priority
    res_today = client.post(
        "/api/coach",
        json={"message": "What should I learn today?", "session_id": "sess_coach"},
        headers=user_header,
    )
    assert res_today.status_code == 200
    today_data = res_today.json()
    assert today_data["state_changed"] is False
    assert len(today_data["tool_calls"]) == 1
    assert today_data["tool_calls"][0]["name"] == "get_today_priority"
    assert "focus for today" in today_data["reply"].lower() or "recommended" in today_data["reply"].lower()

    # 4. Explain why an item is prioritized
    res_why = client.post(
        "/api/coach",
        json={"message": "Why Docker?", "session_id": "sess_coach"},
        headers=user_header,
    )
    assert res_why.status_code == 200
    why_data = res_why.json()
    assert len(why_data["tool_calls"]) == 1
    assert why_data["tool_calls"][0]["name"] == "explain_item"
    assert "docker" in why_data["reply"].lower()

    # 5. Mark complete RAG
    res_comp = client.post(
        "/api/coach",
        json={"message": "I completed RAG", "session_id": "sess_coach"},
        headers=user_header,
    )
    assert res_comp.status_code == 200
    comp_data = res_comp.json()
    assert comp_data["state_changed"] is True
    assert len(comp_data["tool_calls"]) == 1
    assert comp_data["tool_calls"][0]["name"] == "mark_complete"
    assert comp_data["state"] is not None
    assert comp_data["diff"] is not None
    assert comp_data["diff"]["trigger"]["type"] == "complete_skill"

    # 6. Switch role
    res_role = client.post(
        "/api/coach",
        json={"message": "Switch to ML engineer", "session_id": "sess_coach"},
        headers=user_header,
    )
    assert res_role.status_code == 200
    role_data = res_role.json()
    assert role_data["state_changed"] is True
    assert len(role_data["tool_calls"]) == 1
    assert role_data["tool_calls"][0]["name"] == "set_target_role"
    assert role_data["state"] is not None
    assert role_data["state"]["role"]["role_id"] == "ml_engineer"
