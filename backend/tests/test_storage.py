"""Tests for SQLite persistence and repository operations."""
from __future__ import annotations

import tempfile
from pathlib import Path
import pytest

from store.db import init_db
from store.repo import (
    append_event,
    cache_get,
    cache_set,
    get_events,
    get_latest_roadmap,
    get_profile,
    get_roadmap_version,
    get_role_version,
    list_role_versions,
    save_profile,
    save_roadmap,
    save_role_version,
)


@pytest.fixture
def temp_db():
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmpdir:
        db_path = Path(tmpdir) / "test_careertwin.db"
        init_db(db_path)
        yield db_path


def test_profile_round_trip(temp_db):
    """Save and retrieve a user profile."""
    user_id = "test_user_1"
    assert get_profile(user_id, db_path=temp_db) is None

    profile_data = {
        "education": {"degree": "B.Tech CSE", "year": 4},
        "experience_years": 2.0,
        "interests": ["LLMs", "rag"],
        "skills": {"python": {"level": 7.5, "source": "resume"}},
    }
    save_profile(user_id, profile_data, db_path=temp_db)

    retrieved = get_profile(user_id, db_path=temp_db)
    assert retrieved is not None
    assert retrieved["education"]["degree"] == "B.Tech CSE"
    assert retrieved["skills"]["python"]["level"] == 7.5


def test_roadmap_versioning(temp_db):
    """Save multiple roadmap versions and retrieve latest or by specific version."""
    user_id = "test_user_2"
    assert get_latest_roadmap(user_id, db_path=temp_db) == (None, None)

    rm_v1 = {"version": 1, "total_weeks": 10, "items": [{"skill_id": "python"}]}
    save_roadmap(user_id, version=1, roadmap_dict=rm_v1, db_path=temp_db)

    v, latest = get_latest_roadmap(user_id, db_path=temp_db)
    assert v == 1
    assert latest["total_weeks"] == 10

    rm_v2 = {"version": 2, "total_weeks": 8, "items": [{"skill_id": "rag"}]}
    save_roadmap(user_id, version=2, roadmap_dict=rm_v2, db_path=temp_db)

    v_new, latest_new = get_latest_roadmap(user_id, db_path=temp_db)
    assert v_new == 2
    assert latest_new["total_weeks"] == 8

    # Specific version lookup
    old_rm = get_roadmap_version(user_id, version=1, db_path=temp_db)
    assert old_rm is not None
    assert old_rm["total_weeks"] == 10


def test_progress_events(temp_db):
    """Append and list progress events."""
    user_id = "test_user_3"
    assert get_events(user_id, db_path=temp_db) == []

    append_event(user_id, "complete_skill", {"skill": "rag", "level": 7.0}, db_path=temp_db)
    append_event(user_id, "complete_activity", {"activity_id": "res_rag_001"}, db_path=temp_db)

    events = get_events(user_id, db_path=temp_db)
    assert len(events) == 2
    assert events[0]["type"] == "complete_skill"
    assert events[0]["payload"]["skill"] == "rag"
    assert events[1]["type"] == "complete_activity"


def test_role_versions(temp_db):
    """Save and retrieve standard and custom role versions."""
    role_dict_v1 = {"role_id": "custom_agent_eng", "title": "Agent Engineer", "skills": []}
    save_role_version("custom_agent_eng", "2026.09", role_dict_v1, is_custom=True, db_path=temp_db)

    retrieved = get_role_version("custom_agent_eng", "2026.09", db_path=temp_db)
    assert retrieved is not None
    assert retrieved["title"] == "Agent Engineer"

    versions = list_role_versions("custom_agent_eng", db_path=temp_db)
    assert len(versions) == 1
    assert versions[0]["is_custom"] is True


def test_llm_cache_hit_and_miss(temp_db):
    """Test LLM cache set, hit, and miss."""
    cache_key = "hash_step_explain_rag_v1"
    assert cache_get(cache_key, db_path=temp_db) is None

    cached_content = {"narrative": "RAG is critical for semantic search."}
    cache_set(cache_key, cached_content, db_path=temp_db)

    hit = cache_get(cache_key, db_path=temp_db)
    assert hit is not None
    assert hit["narrative"] == "RAG is critical for semantic search."
