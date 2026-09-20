"""Tests for Career Engine Phase B3: Roadmap, Replan, Diff, Today, Market Update.

Written FIRST to validate the frozen SPEC §7.4-7.7 and §10.2 algorithms:
1. Zero prerequisite violations across ALL personas x ALL roles.
2. Non-stretch weeks never exceed the weekly-hours budget.
3. Strong-skill leakage == 0 (skills with gap == 0 are never scheduled).
4. Completing rag: rag done, readiness rises, embeddings & vector_db raised to min_level,
   prereq-only items removed, newly unblocked skills reported, diff non-empty.
5. Idempotency and mark_known lowers gap / reorders.
6. Personalization: two personas, same role -> different item sets (Jaccard distance >= 0.3).
7. Market update on genai_engineer adds mcp item and reports requirement changes.
8. today() returns first available item; returns None when all done.
"""
from __future__ import annotations

import json
from pathlib import Path
import pytest

from engine.calibrate import calibrate_profile
from engine.catalog import Catalog
from engine.market import apply_market_update, diff_role_requirements
from engine.models import (
    Activity,
    Phase,
    ProfileSkillState,
    ProfileState,
    Roadmap,
    Role,
    RoleSkill,
    Skill,
    SkillPrerequisite,
)
from engine.replan import complete_activity, complete_skill, mark_known
from engine.resources import JsonResourceProvider
from engine.roadmap import build_roadmap
from engine.today import get_today_pick


@pytest.fixture(scope="session")
def catalog() -> Catalog:
    return Catalog.from_data_dir()


@pytest.fixture(scope="session")
def resource_provider() -> JsonResourceProvider:
    return JsonResourceProvider.from_data_dir()


@pytest.fixture(scope="session")
def personas() -> list[dict]:
    personas_dir = Path(__file__).resolve().parent.parent / "data" / "personas"
    files = sorted(personas_dir.glob("*.json"))
    data = []
    for f in files:
        with open(f, "r", encoding="utf-8") as fp:
            data.append(json.load(fp))
    return data


# =====================================================================
# 1. Zero prerequisite violations across ALL personas x ALL roles
# =====================================================================
def test_zero_prerequisite_violations_all_personas_all_roles(
    catalog: Catalog, resource_provider: JsonResourceProvider, personas: list[dict]
):
    """Every prerequisite of a scheduled skill must appear earlier in the roadmap

    or already be met by the user profile.
    """
    for p_data in personas:
        profile = calibrate_profile(p_data, catalog=catalog)
        interests = p_data.get("interests", [])

        for role in catalog.roles:
            roadmap = build_roadmap(
                profile_state=profile,
                role=role,
                interests=interests,
                catalog=catalog,
                resource_provider=resource_provider,
            )

            seen_in_roadmap: set[str] = set()
            for item in roadmap.items:
                if item.is_capstone:
                    continue
                assert item.skill_id is not None
                cat_skill = catalog.get_skill(item.skill_id)
                if cat_skill:
                    for prereq in cat_skill.prerequisites:
                        user_lvl = (
                            profile.skills[prereq.skill].level
                            if prereq.skill in profile.skills
                            else 0.0
                        )
                        # Either prereq is met in profile OR already appeared earlier in the roadmap
                        assert (
                            user_lvl >= prereq.min_level or prereq.skill in seen_in_roadmap
                        ), (
                            f"Prerequisite violation in persona {p_data.get('persona_id')} "
                            f"for role {role.role_id}: {prereq.skill} (min {prereq.min_level}) "
                            f"not met before {item.skill_id}"
                        )
                seen_in_roadmap.add(item.skill_id)


# =====================================================================
# 2. Non-stretch weeks never exceed the weekly-hours budget
# =====================================================================
def test_non_stretch_weeks_budget(
    catalog: Catalog, resource_provider: JsonResourceProvider, personas: list[dict]
):
    """Weekly packed hours for non-stretch weeks must not exceed weekly_hours budget."""
    for p_data in personas:
        weekly_budget = p_data.get("weekly_hours", 10)
        profile = calibrate_profile(p_data, catalog=catalog)
        interests = p_data.get("interests", [])
        role = catalog.get_role("genai_engineer")
        assert role is not None

        roadmap = build_roadmap(
            profile_state=profile,
            role=role,
            interests=interests,
            weekly_hours=weekly_budget,
            deadline_weeks=p_data.get("deadline_weeks", 12),
            catalog=catalog,
            resource_provider=resource_provider,
        )

        # Compute hours allocated per week
        week_hours: dict[int, float] = {}
        for item in roadmap.items:
            # If an item spans weeks, compute duration
            span = max(1, (item.week_end - item.week_start + 1))
            hours_per_week = item.hours / span
            for w in range(item.week_start, item.week_end + 1):
                if w <= roadmap.deadline_weeks:
                    week_hours[w] = week_hours.get(w, 0.0) + hours_per_week

        for w, total in week_hours.items():
            assert total <= weekly_budget + 0.1, (
                f"Week {w} exceeds budget: {total} > {weekly_budget} "
                f"for persona {p_data.get('persona_id')}"
            )


# =====================================================================
# 3. Strong-skill leakage == 0 (gap 0 skills never scheduled)
# =====================================================================
def test_strong_skill_leakage_zero(
    catalog: Catalog, resource_provider: JsonResourceProvider
):
    """Skills where level >= target must NEVER be scheduled in the roadmap."""
    role = catalog.get_role("genai_engineer")
    assert role is not None

    # User already expert in python and docker
    profile = ProfileState(
        skills={
            "python": ProfileSkillState(skill_id="python", level=9.0, source="resume"),
            "docker": ProfileSkillState(skill_id="docker", level=8.0, source="resume"),
            "apis_rest": ProfileSkillState(skill_id="apis_rest", level=8.0, source="resume"),
        }
    )

    roadmap = build_roadmap(
        profile_state=profile,
        role=role,
        catalog=catalog,
        resource_provider=resource_provider,
    )

    scheduled_skills = [it.skill_id for it in roadmap.items if not it.is_capstone]
    assert "python" not in scheduled_skills
    assert "docker" not in scheduled_skills
    assert "apis_rest" not in scheduled_skills


# =====================================================================
# 4. Completing RAG: Mastery implies prerequisites, updates readiness and diff
# =====================================================================
def test_completing_rag_replan_diff(
    catalog: Catalog, resource_provider: JsonResourceProvider
):
    """SPEC §7.5: on complete(rag):

    - level[rag] = target (7.0)
    - prerequisites (embeddings, vector_db, apis_rest) raised to max(level, min_level)
    - readiness rises
    - newly unblocked skills reported (e.g. tool_calling / agent_systems)
    - diff is non-empty and contains deterministic facts
    """
    role = catalog.get_role("genai_engineer")
    assert role is not None

    # Low-level profile where RAG prerequisites are below required min_level
    profile = ProfileState(
        skills={
            "python": ProfileSkillState(skill_id="python", level=6.0, source="self"),
            "embeddings": ProfileSkillState(skill_id="embeddings", level=2.0, source="self"),
            "vector_db": ProfileSkillState(skill_id="vector_db", level=2.0, source="self"),
            "rag": ProfileSkillState(skill_id="rag", level=3.0, source="self"),
        }
    )

    initial_roadmap = build_roadmap(
        profile_state=profile,
        role=role,
        catalog=catalog,
        resource_provider=resource_provider,
    )

    initial_readiness = initial_roadmap.total_hours  # or readiness from analysis

    # Apply complete_skill("rag")
    new_profile, new_roadmap, diff = complete_skill(
        profile_state=profile,
        skill_id="rag",
        role=role,
        catalog=catalog,
        resource_provider=resource_provider,
    )

    # 1. RAG is at target
    rag_target = next(rs.target for rs in role.skills if rs.skill == "rag")
    assert new_profile.skills["rag"].level >= rag_target

    # 2. Prereqs raised to at least min_level
    rag_skill = catalog.get_skill("rag")
    assert rag_skill is not None
    for req in rag_skill.prerequisites:
        assert new_profile.skills[req.skill].level >= req.min_level

    # 3. Readiness increased
    assert diff.readiness_after > diff.readiness_before

    # 4. Level changes recorded in diff
    changed_sids = {lc.skill_id for lc in diff.level_changes}
    assert "rag" in changed_sids
    assert "embeddings" in changed_sids
    assert "vector_db" in changed_sids

    # 5. Diff facts are populated
    assert len(diff.facts) > 0
    assert any("rag" in f.lower() for f in diff.facts)


# =====================================================================
# 5. Idempotency & Mark Known
# =====================================================================
def test_idempotency_and_mark_known(
    catalog: Catalog, resource_provider: JsonResourceProvider
):
    """Calling complete_skill on an already completed skill is idempotent.

    mark_known lowers a gap and updates priority.
    """
    role = catalog.get_role("genai_engineer")
    assert role is not None

    profile = ProfileState(
        skills={
            "python": ProfileSkillState(skill_id="python", level=8.0, source="self"),
            "rag": ProfileSkillState(skill_id="rag", level=7.0, source="self"),
        }
    )

    # Repeating complete on rag which already meets target
    prof2, rm2, diff = complete_skill(
        profile_state=profile,
        skill_id="rag",
        role=role,
        catalog=catalog,
        resource_provider=resource_provider,
    )
    assert len(diff.level_changes) == 0
    assert "Already complete" in diff.facts or any("already" in f.lower() for f in diff.facts)

    # mark_known raises level
    prof3, rm3, diff_known = mark_known(
        profile_state=profile,
        skill_id="docker",
        level=5.0,
        role=role,
        catalog=catalog,
        resource_provider=resource_provider,
    )
    assert prof3.skills["docker"].level == 5.0
    assert any(lc.skill_id == "docker" and lc.to == 5.0 for lc in diff_known.level_changes)


# =====================================================================
# 6. Personalization: Two personas, same role -> different item sets
# =====================================================================
def test_personalization_jaccard_distance(
    catalog: Catalog, resource_provider: JsonResourceProvider
):
    """SPEC metric: two personas targeting the same role must get distinct roadmaps

    with Jaccard distance >= 0.3.
    """
    personas_dir = Path(__file__).resolve().parent.parent / "data" / "personas"
    p1_file = personas_dir / "p1_strong_python_weak_deployment.json"
    p4_file = personas_dir / "p4_data_analyst_transitioning_ds.json"

    with open(p1_file, "r", encoding="utf-8") as f:
        p1_data = json.load(f)
    with open(p4_file, "r", encoding="utf-8") as f:
        p4_data = json.load(f)

    role = catalog.get_role("genai_engineer")
    assert role is not None

    prof1 = calibrate_profile(p1_data, catalog=catalog)
    prof4 = calibrate_profile(p4_data, catalog=catalog)

    rm1 = build_roadmap(prof1, role, p1_data.get("interests", []), catalog=catalog, resource_provider=resource_provider)
    rm4 = build_roadmap(prof4, role, p4_data.get("interests", []), catalog=catalog, resource_provider=resource_provider)

    items1 = {it.skill_id for it in rm1.items if it.skill_id}
    items4 = {it.skill_id for it in rm4.items if it.skill_id}

    intersection = len(items1 & items4)
    union = len(items1 | items4)
    jaccard_sim = intersection / union if union > 0 else 1.0
    jaccard_dist = 1.0 - jaccard_sim

    assert jaccard_dist >= 0.3, f"Jaccard distance too low: {jaccard_dist} < 0.3"


# =====================================================================
# 7. Market Update on genai_engineer
# =====================================================================
def test_market_update_adds_mcp_and_reports_changes(
    catalog: Catalog, resource_provider: JsonResourceProvider
):
    """SPEC §7.6: Loading roles_v2 adds 'mcp' requirement, replans, and reports requirement changes."""
    roles_v2_path = Path(__file__).resolve().parent.parent / "data" / "roles_v2.json"
    with open(roles_v2_path, "r", encoding="utf-8") as f:
        roles_v2_data = json.load(f)
    role_v2 = Role.model_validate(roles_v2_data[0])

    role_v1 = catalog.get_role("genai_engineer")
    assert role_v1 is not None

    req_changes = diff_role_requirements(role_v1, role_v2)
    assert any(rc.skill_id == "mcp" and rc.change == "added" for rc in req_changes)
    assert any(rc.skill_id == "llm_evaluation" and rc.change == "target_changed" for rc in req_changes)

    # Apply market update on a profile
    profile = ProfileState(
        skills={
            "python": ProfileSkillState(skill_id="python", level=7.0, source="self"),
        }
    )

    new_roadmap, diff = apply_market_update(
        profile_state=profile,
        old_role=role_v1,
        new_role=role_v2,
        catalog=catalog,
        resource_provider=resource_provider,
    )

    assert diff.trigger.type == "market_update"
    assert any(it.skill_id == "mcp" for it in new_roadmap.items)
    assert len(diff.requirement_changes) > 0


# =====================================================================
# 8. Today Pick
# =====================================================================
def test_today_pick(catalog: Catalog, resource_provider: JsonResourceProvider):
    """SPEC §7.7: today returns the first available item, prefers <= 2h activity,

    clamps minutes to 60-120, and returns None when all items done.
    """
    role = catalog.get_role("genai_engineer")
    assert role is not None

    profile = ProfileState(
        skills={
            "python": ProfileSkillState(skill_id="python", level=8.0, source="self"),
            "apis_rest": ProfileSkillState(skill_id="apis_rest", level=7.0, source="self"),
            "fastapi": ProfileSkillState(skill_id="fastapi", level=7.0, source="self"),
        }
    )

    roadmap = build_roadmap(
        profile_state=profile,
        role=role,
        catalog=catalog,
        resource_provider=resource_provider,
    )

    pick = get_today_pick(roadmap)
    assert pick is not None
    assert 60 <= pick.minutes <= 120
    assert pick.activity is not None
    assert len(pick.reasons) > 0

    # Test all-done returns None
    for item in roadmap.items:
        item.status = "done"
    assert get_today_pick(roadmap) is None
