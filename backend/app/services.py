"""Application service orchestration layer per SPEC §10.3 & §10.4.

Orchestrates Career Engine, agents, ChromaDB retrieval, and SQLite repository.
Used by FastAPI routes and later by CoachAgent tools.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app import mappers
from app.errors import AppError
from app.schemas import (
    Activity,
    AnalyzeRequest,
    AnalyzeResponse,
    CompleteRequest,
    CustomRoleRequest,
    CustomRoleResponse,
    Diff,
    EducationInput,
    KnownRequest,
    MarketUpdateRequest,
    Meta,
    Profile,
    ProfileInput,
    ProfileResponse,
    ProfileSkill,
    ProgressResponse,
    RoleDetail,
    RoleRef,
    RolesResponse,
    RoleSummary,
    SelfSkillInput,
    TodayPick,
    TodayResponse,
)
from agents.explainer_agent import explain_diff, explain_items
from agents.profile_agent import extract_profile
from agents.resume_text import ResumeParseError, extract_resume_text
from agents.role_builder_agent import build_custom_role
from engine.calibrate import calibrate_skill_level
from engine.catalog import Catalog
from engine.gaps import analyze_gaps
from engine.market import apply_market_update
from engine.models import (
    ProfileSkillState,
    ProfileState,
    Roadmap as EngineRoadmap,
    Role,
)
from engine.readiness import compute_readiness
from engine.replan import complete_activity, complete_skill, mark_known
from engine.roadmap import build_roadmap
from engine.today import get_today_pick
from llm.provider import available_chain
from rag.retriever import ChromaResourceProvider
from store import repo


def _get_catalog() -> Catalog:
    return Catalog.from_data_dir()


def _get_resource_provider() -> ChromaResourceProvider:
    return ChromaResourceProvider()


# =====================================================================
# 1. Profile Services
# =====================================================================
async def create_profile(
    user_id: str,
    form_data: ProfileInput,
    resume_bytes: bytes | None = None,
    resume_filename: str | None = None,
) -> ProfileResponse:
    """Extract, calibrate, and save user profile."""
    cat = _get_catalog()
    resume_text = None

    if resume_bytes:
        try:
            resume_text = extract_resume_text(resume_bytes, resume_filename or "resume.pdf")
        except ResumeParseError as e:
            raise AppError(
                code="RESUME_PARSE_ERROR",
                message=str(e),
                status_code=422,
            )
    elif form_data.resume_text:
        resume_text = form_data.resume_text

    chain = available_chain()
    extracted_prof, meta = await extract_profile(
        resume_text=resume_text,
        form_data=form_data,
        chain=chain,
        catalog=cat,
    )

    profile = Profile(
        education=form_data.education,
        experience_years=form_data.experience_years,
        interests=form_data.interests,
        weekly_hours=10.0,
        deadline_weeks=12,
        target_role_id=None,
        skills=extracted_prof.skills,
        unmapped_skills=extracted_prof.unmapped_skills,
    )

    repo.save_profile(user_id, profile.model_dump())
    return ProfileResponse(profile=profile, meta=meta)


def get_profile(user_id: str) -> ProfileResponse:
    """Retrieve saved profile for user or raise NO_PROFILE."""
    p_dict = repo.get_profile(user_id)
    if not p_dict:
        raise AppError(
            code="NO_PROFILE",
            message="Create a profile first (POST /profile).",
            status_code=400,
        )

    profile = Profile.model_validate(p_dict)
    return ProfileResponse(
        profile=profile,
        meta=Meta(llm_provider="none", llm_used=False, fallback_used=False),
    )


# =====================================================================
# 2. Roles Services
# =====================================================================
def list_roles(user_id: str | None = None) -> RolesResponse:
    """List 4 curated roles + saved custom roles, checking market update availability."""
    cat = _get_catalog()
    roles_v2_path = Path(__file__).resolve().parent.parent / "data" / "roles_v2.json"
    v2_roles_by_id: dict[str, dict[str, Any]] = {}
    if roles_v2_path.exists():
        with open(roles_v2_path, "r", encoding="utf-8") as f:
            v2_list = json.load(f)
            v2_roles_by_id = {r["role_id"]: r for r in v2_list}

    user_applied_versions: set[tuple[str, str]] = set()
    if user_id:
        _, rm_dict = repo.get_latest_roadmap(user_id)
        if rm_dict and "role" in rm_dict:
            r_info = rm_dict["role"]
            user_applied_versions.add((r_info.get("role_id", ""), r_info.get("version", "")))

    summaries: list[RoleSummary] = []

    # Curated roles
    for role in cat.roles:
        # Top 5 skills by importance
        sorted_skills = sorted(role.skills, key=lambda s: s.importance, reverse=True)
        top_skills: list[str] = []
        for rs in sorted_skills[:5]:
            sk = cat.get_skill(rs.skill)
            top_skills.append(sk.name if sk else rs.skill)

        # Market update availability
        market_update_available = False
        if role.role_id in v2_roles_by_id:
            v2_ver = v2_roles_by_id[role.role_id]["version"]
            if (role.role_id, v2_ver) not in user_applied_versions:
                market_update_available = True

        summaries.append(
            RoleSummary(
                role_id=role.role_id,
                title=role.title,
                version=role.version,
                description=role.description,
                skill_count=len(role.skills),
                top_skills=top_skills,
                is_custom=False,
                market_update_available=market_update_available,
            )
        )

    # Saved custom roles
    custom_roles_data = repo.get_custom_roles()
    for cr in custom_roles_data:
        cr_skills = cr.get("skills", [])
        sorted_skills = sorted(cr_skills, key=lambda s: s.get("importance", 0.5), reverse=True)
        top_skills = [s.get("skill_name", s.get("skill", "")) for s in sorted_skills[:5]]
        summaries.append(
            RoleSummary(
                role_id=cr["role_id"],
                title=cr["title"],
                version=cr.get("version", "custom"),
                description=cr.get("description", ""),
                skill_count=len(cr_skills),
                top_skills=top_skills,
                is_custom=True,
                market_update_available=False,
            )
        )

    return RolesResponse(roles=summaries)


async def create_custom_role(req: CustomRoleRequest) -> CustomRoleResponse:
    """Build, save, and return a custom role specification."""
    cat = _get_catalog()
    chain = available_chain()
    role_detail, meta = await build_custom_role(
        title=req.title,
        description=req.description,
        chain=chain,
        catalog=cat,
    )

    # Save to role_versions with is_custom=True and version="custom"
    role_dict = role_detail.model_dump()
    repo.save_role_version(
        role_id=role_detail.role_id,
        version="custom",
        role_dict=role_dict,
        is_custom=True,
    )

    return CustomRoleResponse(role=role_detail, meta=meta)


# =====================================================================
# 3. Analyze & Roadmap Services
# =====================================================================
def analyze(user_id: str, req: AnalyzeRequest) -> AnalyzeResponse:
    """Execute gap analysis, topological roadmap generation, and narrative explanations."""
    p_dict = repo.get_profile(user_id)
    if not p_dict:
        raise AppError(
            code="NO_PROFILE",
            message="Create a profile first (POST /profile).",
            status_code=400,
        )

    cat = _get_catalog()
    role = cat.get_role(req.role_id)
    if not role:
        # Check custom roles
        custom_role_data = repo.get_role_version(req.role_id, "custom")
        if custom_role_data:
            role = Role.model_validate(custom_role_data)
        else:
            raise AppError(
                code="UNKNOWN_ROLE",
                message=f"Role '{req.role_id}' not found in catalog.",
                status_code=404,
            )

    # Validate skill overrides
    if req.skill_overrides:
        for sid, lvl in req.skill_overrides.items():
            if cat.get_skill(sid) is None:
                raise AppError(
                    code="UNKNOWN_SKILL",
                    message=f"Skill '{sid}' not found in catalog.",
                    status_code=404,
                )
            if lvl < 0 or lvl > 10:
                raise AppError(
                    code="VALIDATION_ERROR",
                    message=f"Override level for '{sid}' must be between 0 and 10, got {lvl}.",
                    status_code=422,
                )

    # Update profile in DB
    profile = Profile.model_validate(p_dict)
    profile.weekly_hours = float(req.weekly_hours)
    profile.deadline_weeks = int(req.deadline_weeks)
    profile.target_role_id = req.role_id

    # Apply overrides to profile skills
    if req.skill_overrides:
        skills_by_id = {s.skill_id: s for s in profile.skills}
        for sid, lvl in req.skill_overrides.items():
            sk = cat.get_skill(sid)
            s_name = sk.name if sk else sid
            rounded_lvl = round(float(lvl), 1)
            if sid in skills_by_id:
                skills_by_id[sid].level = rounded_lvl
                skills_by_id[sid].source = "override"
            else:
                skills_by_id[sid] = ProfileSkill(
                    skill_id=sid,
                    skill_name=s_name,
                    level=rounded_lvl,
                    source="override",
                )
        profile.skills = list(skills_by_id.values())

    repo.save_profile(user_id, profile.model_dump())

    # Build engine ProfileState
    skills_map: dict[str, ProfileSkillState] = {}
    for ps in profile.skills:
        skills_map[ps.skill_id] = ProfileSkillState(
            skill_id=ps.skill_id,
            skill_name=ps.skill_name,
            self=ps.self,
            evidence=ps.evidence,
            level=ps.level,
            flag=ps.flag,
            snippet=ps.snippet,
            source=ps.source,
        )

    prof_state = ProfileState(
        experience_years=profile.experience_years,
        interests=profile.interests,
        weekly_hours=int(req.weekly_hours),
        deadline_weeks=int(req.deadline_weeks),
        skills=skills_map,
        unmapped_skills=profile.unmapped_skills,
    )

    # Engine math: analyze gaps & generate roadmap
    res_provider = _get_resource_provider()
    analysis = analyze_gaps(prof_state, role, interests=profile.interests, catalog=cat)
    roadmap = build_roadmap(
        prof_state,
        role,
        interests=profile.interests,
        weekly_hours=int(req.weekly_hours),
        deadline_weeks=int(req.deadline_weeks),
        catalog=cat,
        resource_provider=res_provider,
    )

    # Bump version
    latest_version, _ = repo.get_latest_roadmap(user_id)
    new_version = (latest_version or 0) + 1
    roadmap.version = new_version

    # Explain items
    chain = available_chain()
    meta = Meta(llm_provider="none", llm_used=False, fallback_used=True)
    if chain:
        explanations = explain_items(roadmap.items, role.title, chain=chain)
        llm_used_any = False
        for item in roadmap.items:
            if item.item_id in explanations and item.why:
                narr, src = explanations[item.item_id]
                item.why.narrative = narr
                item.why.narrative_source = src
                if src == "llm":
                    llm_used_any = True
        meta = Meta(
            llm_provider=chain[0],
            llm_used=llm_used_any,
            fallback_used=not llm_used_any,
        )

    analyze_response = AnalyzeResponse(
        role=RoleRef(role_id=role.role_id, title=role.title, version=role.version),
        analysis=mappers.to_schema_analysis(analysis),
        roadmap=mappers.to_schema_roadmap(roadmap),
        meta=meta,
    )

    repo.save_roadmap(user_id, new_version, analyze_response.model_dump())
    return analyze_response


def get_state(user_id: str) -> AnalyzeResponse:
    """Retrieve latest roadmap analysis state."""
    latest_version, rm_dict = repo.get_latest_roadmap(user_id)
    if not rm_dict:
        raise AppError(
            code="NO_ROADMAP",
            message="No roadmap found. Run POST /analyze first.",
            status_code=400,
        )
    return AnalyzeResponse.model_validate(rm_dict)


# =====================================================================
# 4. Progress & Replan Services
# =====================================================================
def complete(user_id: str, req: CompleteRequest) -> ProgressResponse:
    """Mark a skill or individual activity as complete and trigger adaptive replan."""
    current_state = get_state(user_id)
    cat = _get_catalog()

    if cat.get_skill(req.skill_id) is None:
        raise AppError(
            code="UNKNOWN_SKILL",
            message=f"Skill '{req.skill_id}' not found in catalog.",
            status_code=404,
        )

    res_provider = _get_resource_provider()
    if req.activity_id:
        res_file = Path(__file__).resolve().parent.parent / "data" / "resources.json"
        with open(res_file, "r", encoding="utf-8") as f:
            resources_data = json.load(f)
        if not any(a["activity_id"] == req.activity_id for a in resources_data):
            raise AppError(
                code="UNKNOWN_ACTIVITY",
                message=f"Activity '{req.activity_id}' not found.",
                status_code=404,
            )

    p_dict = repo.get_profile(user_id)
    assert p_dict is not None
    profile = Profile.model_validate(p_dict)

    skills_map: dict[str, ProfileSkillState] = {
        ps.skill_id: ProfileSkillState(
            skill_id=ps.skill_id,
            skill_name=ps.skill_name,
            self=ps.self,
            evidence=ps.evidence,
            level=ps.level,
            flag=ps.flag,
            snippet=ps.snippet,
            source=ps.source,
        )
        for ps in profile.skills
    }

    prof_state = ProfileState(
        experience_years=profile.experience_years,
        interests=profile.interests,
        weekly_hours=int(profile.weekly_hours),
        deadline_weeks=int(profile.deadline_weeks),
        skills=skills_map,
        unmapped_skills=profile.unmapped_skills,
    )

    role = cat.get_role(current_state.role.role_id) or cat.get_role("genai_engineer")
    assert role is not None

    events = repo.get_events(user_id)
    completed_activity_ids = {
        e["payload"]["activity_id"]
        for e in events
        if e.get("type") == "complete_activity" and "activity_id" in e.get("payload", {})
    }

    if req.activity_id:
        new_prof_state, new_rm, diff = complete_activity(
            prof_state,
            req.activity_id,
            role,
            catalog=cat,
            resource_provider=res_provider,
            completed_activity_ids=completed_activity_ids,
        )
        event_type = "complete_activity"
        event_payload = {"skill_id": req.skill_id, "activity_id": req.activity_id}
    else:
        new_prof_state, new_rm, diff = complete_skill(
            prof_state,
            req.skill_id,
            role,
            catalog=cat,
            resource_provider=res_provider,
            completed_activity_ids=completed_activity_ids,
        )
        event_type = "complete_skill"
        event_payload = {"skill_id": req.skill_id}

    # Idempotency check
    if diff.facts == ["Already complete"]:
        return ProgressResponse(
            state=current_state,
            diff=mappers.to_schema_diff(diff),
            narrative="Skill is already complete.",
            narrative_source="template",
            meta=Meta(llm_provider="none", llm_used=False, fallback_used=False),
        )

    # Narrative explanation for diff
    chain = available_chain()
    narrative, narrative_source = explain_diff(diff, role.title, chain=chain)
    exp_meta = Meta(
        llm_provider=chain[0] if chain and narrative_source == "llm" else "none",
        llm_used=(narrative_source == "llm"),
        fallback_used=(narrative_source != "llm"),
    )

    # Recompute analysis & roadmap
    new_analysis = analyze_gaps(new_prof_state, role, interests=profile.interests, catalog=cat)
    new_version = current_state.roadmap.version + 1
    new_rm.version = new_version

    new_state = AnalyzeResponse(
        role=current_state.role,
        analysis=mappers.to_schema_analysis(new_analysis),
        roadmap=mappers.to_schema_roadmap(new_rm),
        meta=exp_meta,
    )

    # Update profile in DB
    prof_skills_dict = {s.skill_id: s for s in profile.skills}
    for sid, ps_state in new_prof_state.skills.items():
        if sid in prof_skills_dict:
            prof_skills_dict[sid].level = round(float(ps_state.level), 1)
        else:
            prof_skills_dict[sid] = ProfileSkill(
                skill_id=sid,
                skill_name=ps_state.skill_name,
                level=round(float(ps_state.level), 1),
                source="self",
            )
    profile.skills = list(prof_skills_dict.values())
    repo.save_profile(user_id, profile.model_dump())

    # Save roadmap & progress event
    repo.save_roadmap(user_id, new_version, new_state.model_dump())
    repo.append_event(user_id, event_type, event_payload)

    return ProgressResponse(
        state=new_state,
        diff=mappers.to_schema_diff(diff),
        narrative=narrative,
        narrative_source=narrative_source,
        meta=exp_meta,
    )


def mark_known_skill(user_id: str, req: KnownRequest) -> ProgressResponse:
    """Manually update proficiency level of a skill."""
    current_state = get_state(user_id)
    cat = _get_catalog()

    if cat.get_skill(req.skill_id) is None:
        raise AppError(
            code="UNKNOWN_SKILL",
            message=f"Skill '{req.skill_id}' not found in catalog.",
            status_code=404,
        )

    if req.level < 0 or req.level > 10:
        raise AppError(
            code="VALIDATION_ERROR",
            message=f"Level must be between 0 and 10, got {req.level}.",
            status_code=422,
        )

    p_dict = repo.get_profile(user_id)
    assert p_dict is not None
    profile = Profile.model_validate(p_dict)

    skills_map: dict[str, ProfileSkillState] = {
        ps.skill_id: ProfileSkillState(
            skill_id=ps.skill_id,
            skill_name=ps.skill_name,
            self=ps.self,
            evidence=ps.evidence,
            level=ps.level,
            flag=ps.flag,
            snippet=ps.snippet,
            source=ps.source,
        )
        for ps in profile.skills
    }

    prof_state = ProfileState(
        experience_years=profile.experience_years,
        interests=profile.interests,
        weekly_hours=int(profile.weekly_hours),
        deadline_weeks=int(profile.deadline_weeks),
        skills=skills_map,
        unmapped_skills=profile.unmapped_skills,
    )

    role = cat.get_role(current_state.role.role_id) or cat.get_role("genai_engineer")
    assert role is not None

    res_provider = _get_resource_provider()
    events = repo.get_events(user_id)
    completed_activity_ids = {
        e["payload"]["activity_id"]
        for e in events
        if e.get("type") == "complete_activity" and "activity_id" in e.get("payload", {})
    }

    new_prof_state, new_rm, diff = mark_known(
        prof_state,
        req.skill_id,
        req.level,
        role,
        catalog=cat,
        resource_provider=res_provider,
        completed_activity_ids=completed_activity_ids,
    )

    chain = available_chain()
    narrative, narrative_source = explain_diff(diff, role.title, chain=chain)
    exp_meta = Meta(
        llm_provider=chain[0] if chain and narrative_source == "llm" else "none",
        llm_used=(narrative_source == "llm"),
        fallback_used=(narrative_source != "llm"),
    )

    new_analysis = analyze_gaps(new_prof_state, role, interests=profile.interests, catalog=cat)
    new_version = current_state.roadmap.version + 1
    new_rm.version = new_version

    new_state = AnalyzeResponse(
        role=current_state.role,
        analysis=mappers.to_schema_analysis(new_analysis),
        roadmap=mappers.to_schema_roadmap(new_rm),
        meta=exp_meta,
    )

    prof_skills_dict = {s.skill_id: s for s in profile.skills}
    for sid, ps_state in new_prof_state.skills.items():
        if sid in prof_skills_dict:
            prof_skills_dict[sid].level = round(float(ps_state.level), 1)
        else:
            prof_skills_dict[sid] = ProfileSkill(
                skill_id=sid,
                skill_name=ps_state.skill_name,
                level=round(float(ps_state.level), 1),
                source="override",
            )
    profile.skills = list(prof_skills_dict.values())
    repo.save_profile(user_id, profile.model_dump())

    repo.save_roadmap(user_id, new_version, new_state.model_dump())
    repo.append_event(user_id, "mark_known", {"skill_id": req.skill_id, "level": req.level})

    return ProgressResponse(
        state=new_state,
        diff=mappers.to_schema_diff(diff),
        narrative=narrative,
        narrative_source=narrative_source,
        meta=exp_meta,
    )


# =====================================================================
# 5. Today Recommendation
# =====================================================================
def get_today(user_id: str) -> TodayResponse:
    """Retrieve today's high-impact learning recommendation."""
    current_state = get_state(user_id)
    # Convert schema roadmap items to engine roadmap
    engine_items = [
        item.model_dump()
        for item in current_state.roadmap.items
    ]
    # Build a lightweight engine Roadmap for get_today_pick
    cat = _get_catalog()
    p_dict = repo.get_profile(user_id)
    profile = Profile.model_validate(p_dict)
    role = cat.get_role(current_state.role.role_id) or cat.get_role("genai_engineer")

    skills_map = {
        ps.skill_id: ProfileSkillState(
            skill_id=ps.skill_id,
            skill_name=ps.skill_name,
            level=ps.level,
        )
        for ps in profile.skills
    }
    prof_state = ProfileState(
        experience_years=profile.experience_years,
        interests=profile.interests,
        weekly_hours=int(profile.weekly_hours),
        deadline_weeks=int(profile.deadline_weeks),
        skills=skills_map,
    )
    res_provider = _get_resource_provider()
    engine_rm = build_roadmap(
        prof_state,
        role,
        interests=profile.interests,
        weekly_hours=int(profile.weekly_hours),
        deadline_weeks=int(profile.deadline_weeks),
        catalog=cat,
        resource_provider=res_provider,
    )

    pick = get_today_pick(engine_rm)
    if not pick:
        return TodayResponse(
            today=None,
            message="All roadmap items are completed or in progress!",
            meta=Meta(llm_provider="none", llm_used=False, fallback_used=False),
        )

    return TodayResponse(
        today=mappers.to_schema_today_pick(pick),
        message=None,
        meta=Meta(llm_provider="none", llm_used=False, fallback_used=False),
    )


# =====================================================================
# 6. Market Update
# =====================================================================
def market_update(user_id: str, req: MarketUpdateRequest) -> ProgressResponse:
    """Apply updated market requirements and adaptively replan the roadmap."""
    current_state = get_state(user_id)
    target_role_id = req.role_id or current_state.role.role_id
    cat = _get_catalog()

    old_role = cat.get_role(target_role_id)
    if not old_role:
        raise AppError(
            code="UNKNOWN_ROLE",
            message=f"Role '{target_role_id}' not found in catalog.",
            status_code=404,
        )

    roles_v2_path = Path(__file__).resolve().parent.parent / "data" / "roles_v2.json"
    v2_role_data = None
    if roles_v2_path.exists():
        with open(roles_v2_path, "r", encoding="utf-8") as f:
            v2_list = json.load(f)
            for r in v2_list:
                if r["role_id"] == target_role_id:
                    v2_role_data = r
                    break

    if not v2_role_data:
        raise AppError(
            code="NO_MARKET_UPDATE",
            message=f"No market update available for role '{target_role_id}'.",
            status_code=400,
        )

    if current_state.role.version == v2_role_data["version"]:
        raise AppError(
            code="NO_MARKET_UPDATE",
            message=f"Market update {v2_role_data['version']} has already been applied.",
            status_code=400,
        )

    v2_role = Role.model_validate(v2_role_data)

    p_dict = repo.get_profile(user_id)
    assert p_dict is not None
    profile = Profile.model_validate(p_dict)

    skills_map: dict[str, ProfileSkillState] = {
        ps.skill_id: ProfileSkillState(
            skill_id=ps.skill_id,
            skill_name=ps.skill_name,
            self=ps.self,
            evidence=ps.evidence,
            level=ps.level,
            flag=ps.flag,
            snippet=ps.snippet,
            source=ps.source,
        )
        for ps in profile.skills
    }

    prof_state = ProfileState(
        experience_years=profile.experience_years,
        interests=profile.interests,
        weekly_hours=int(profile.weekly_hours),
        deadline_weeks=int(profile.deadline_weeks),
        skills=skills_map,
        unmapped_skills=profile.unmapped_skills,
    )

    res_provider = _get_resource_provider()
    events = repo.get_events(user_id)
    completed_activity_ids = {
        e["payload"]["activity_id"]
        for e in events
        if e.get("type") == "complete_activity" and "activity_id" in e.get("payload", {})
    }

    new_rm, diff = apply_market_update(
        prof_state,
        old_role,
        v2_role,
        catalog=cat,
        resource_provider=res_provider,
        completed_activity_ids=completed_activity_ids,
    )

    chain = available_chain()
    narrative, narrative_source = explain_diff(diff, v2_role.title, chain=chain)
    exp_meta = Meta(
        llm_provider=chain[0] if chain and narrative_source == "llm" else "none",
        llm_used=(narrative_source == "llm"),
        fallback_used=(narrative_source != "llm"),
    )

    new_analysis = analyze_gaps(prof_state, v2_role, interests=profile.interests, catalog=cat)
    new_version = current_state.roadmap.version + 1
    new_rm.version = new_version

    new_role_ref = RoleRef(
        role_id=v2_role.role_id,
        title=v2_role.title,
        version=v2_role.version,
    )

    new_state = AnalyzeResponse(
        role=new_role_ref,
        analysis=mappers.to_schema_analysis(new_analysis),
        roadmap=mappers.to_schema_roadmap(new_rm),
        meta=exp_meta,
    )

    repo.save_roadmap(user_id, new_version, new_state.model_dump())
    repo.save_role_version(target_role_id, v2_role.version, v2_role.model_dump(), is_custom=False)
    repo.append_event(user_id, "market_update", {"role_id": target_role_id, "version": v2_role.version})

    return ProgressResponse(
        state=new_state,
        diff=mappers.to_schema_diff(diff),
        narrative=narrative,
        narrative_source=narrative_source,
        meta=exp_meta,
    )
