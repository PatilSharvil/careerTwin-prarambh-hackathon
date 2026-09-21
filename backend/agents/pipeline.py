"""Initial analysis pipeline per SPEC §5.3 & §8.

Coordinates ProfileAgent -> Skill Normalization -> Level Calibration ->
EngineAgent -> ExplainerAgent with fallback guarantees and multi-provider failover.
"""
from __future__ import annotations

import logging
from typing import Any, Sequence

from app.config import settings
from app.schemas import AnalyzeResponse, Meta, ProfileInput, RoleRef
from agents.engine_agent import EngineAgent
from agents.explainer_agent import build_explainer_agent, explain_items
from agents.profile_agent import build_profile_agent, extract_profile
from engine.catalog import Catalog
from engine.gaps import analyze_gaps
from engine.models import Analysis, ProfileSkillState, ProfileState, Roadmap
from engine.roadmap import build_roadmap
from llm.provider import available_chain, get_model
from engine.resources import JsonResourceProvider

logger = logging.getLogger("careertwin.agents.pipeline")

try:
    from google.adk.agents import SequentialAgent
except ImportError:
    SequentialAgent = None  # type: ignore[assignment,misc]


def build_pipeline(model: Any = None) -> Any:
    """Construct sequential ADK pipeline: ProfileAgent -> EngineAgent -> ExplainerAgent."""
    if SequentialAgent is None:
        return None

    profile_agent = build_profile_agent(model)
    engine_agent = EngineAgent()
    explainer_agent = build_explainer_agent(model)

    return SequentialAgent(
        name="CareerTwinPipeline",
        description="Sequential pipeline for profile extraction, engine math, and explanation",
        sub_agents=[profile_agent, engine_agent, explainer_agent],
    )


async def run_analysis(
    resume_text: str | None,
    form_data: ProfileInput | dict[str, Any],
    role_id: str = "genai_engineer",
    weekly_hours: float = 10.0,
    deadline_weeks: int = 12,
    skill_overrides: dict[str, float] | None = None,
    chain: Sequence[str] | None = None,
    catalog: Catalog | None = None,
    resource_provider: Any = None,
) -> AnalyzeResponse:
    """Execute complete initial analysis pipeline with deterministic fallback guarantees."""
    cat = catalog or Catalog.from_data_dir()
    res_provider = resource_provider or JsonResourceProvider.from_data_dir()
    overrides = skill_overrides or {}

    role = cat.get_role(role_id)
    if not role:
        role = cat.get_role("genai_engineer")
    assert role is not None, f"Target role '{role_id}' not found in catalog"

    # 1. Step 1 & 2: Profile Extraction + Normalization + Calibration
    profile, profile_meta = await extract_profile(
        resume_text=resume_text,
        form_data=form_data,
        chain=chain,
        catalog=cat,
    )

    # Convert Profile to engine ProfileState
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

    # Apply manual overrides (overrides beat calibrated levels, source="override")
    for sid, ov in overrides.items():
        sk = cat.get_skill(sid)
        s_name = sk.name if sk else sid
        skills_map[sid] = ProfileSkillState(
            skill_id=sid,
            skill_name=s_name,
            level=float(ov),
            source="override",
        )

    profile_state = ProfileState(
        experience_years=profile.experience_years,
        interests=profile.interests,
        weekly_hours=int(weekly_hours),
        deadline_weeks=int(deadline_weeks),
        skills=skills_map,
        unmapped_skills=profile.unmapped_skills,
    )

    # 2. Step 3: Deterministic Engine Math (gaps, priority, readiness)
    analysis: Analysis = analyze_gaps(
        profile_state=profile_state,
        role=role,
        interests=profile.interests,
        catalog=cat,
    )

    # 3. Step 4: Roadmap Generation with ChromaResourceProvider
    roadmap: Roadmap = build_roadmap(
        profile_state=profile_state,
        role=role,
        interests=profile.interests,
        weekly_hours=int(weekly_hours),
        deadline_weeks=int(deadline_weeks),
        catalog=cat,
        resource_provider=res_provider,
    )

    # 4. Step 5: ExplainerAgent with number validation and caching
    explain_meta_llm_used = False
    explain_provider = profile_meta.llm_provider

    if profile_meta.llm_provider != "none" and not profile_meta.fallback_used:
        explanations = explain_items(
            items=roadmap.items,
            role_title=role.title,
            chain=[profile_meta.llm_provider],
        )
        for item in roadmap.items:
            if item.item_id in explanations and item.why:
                narr, src = explanations[item.item_id]
                item.why.narrative = narr
                item.why.narrative_source = src
                if src == "llm":
                    explain_meta_llm_used = True

    role_ref = RoleRef(
        role_id=role.role_id,
        title=role.title,
        version=role.version,
    )

    meta = Meta(
        llm_provider=profile_meta.llm_provider,
        llm_used=profile_meta.llm_used or explain_meta_llm_used,
        fallback_used=profile_meta.fallback_used,
    )

    return AnalyzeResponse(
        role=role_ref,
        analysis=analysis.model_dump(),  # type: ignore[arg-type]
        roadmap=roadmap.model_dump(),    # type: ignore[arg-type]
        meta=meta,
    )
