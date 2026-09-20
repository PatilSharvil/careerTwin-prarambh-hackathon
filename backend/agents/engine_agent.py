"""EngineAgent per SPEC §5.2.

Custom ADK BaseAgent (no LLM) that invokes the deterministic Career Engine
with ChromaResourceProvider and stores results into the ADK session state.
"""
from __future__ import annotations

import logging
from typing import Any, AsyncGenerator
from engine.catalog import Catalog
from engine.gaps import analyze_gaps
from engine.models import Analysis, ProfileSkillState, ProfileState, Roadmap, Role
from engine.roadmap import build_roadmap
from rag.retriever import ChromaResourceProvider

logger = logging.getLogger("careertwin.agents.engine")

try:
    from google.adk.agents import BaseAgent, InvocationContext
    from google.adk.events import Event
except ImportError:
    BaseAgent = object  # type: ignore[assignment,misc]
    InvocationContext = Any
    Event = Any


class EngineAgent(BaseAgent):
    """Deterministic Career Engine execution agent."""

    name: str = "EngineAgent"
    description: str = "Deterministic Career Engine computing gaps, readiness, and roadmap"

    async def _run_async_impl(
        self,
        ctx: InvocationContext,
    ) -> AsyncGenerator[Event, None]:
        """Execute deterministic engine algorithms on data in session state."""
        state = ctx.session.state

        # Retrieve profile and role from state
        profile_data = state.get("profile")
        role_id = state.get("role_id", "genai_engineer")
        weekly_hours = state.get("weekly_hours", 10)
        deadline_weeks = state.get("deadline_weeks", 12)
        skill_overrides = state.get("skill_overrides", {})

        catalog = Catalog.from_data_dir()
        role = catalog.get_role(role_id)
        if not role:
            role = catalog.get_role("genai_engineer")
        assert role is not None

        # Convert profile_data to ProfileState if necessary
        profile_state = _convert_to_profile_state(profile_data, skill_overrides, catalog)

        interests = state.get("interests") or getattr(profile_state, "interests", [])

        # 1. Gap and readiness analysis
        analysis: Analysis = analyze_gaps(
            profile_state=profile_state,
            role=role,
            interests=interests,
            catalog=catalog,
        )

        # 2. Roadmap generation via ChromaResourceProvider
        resource_provider = ChromaResourceProvider()
        roadmap: Roadmap = build_roadmap(
            profile_state=profile_state,
            role=role,
            interests=interests,
            weekly_hours=int(weekly_hours),
            deadline_weeks=int(deadline_weeks),
            catalog=catalog,
            resource_provider=resource_provider,
        )

        # Store outputs in ADK session state
        state["analysis"] = analysis.model_dump()
        state["roadmap"] = roadmap.model_dump()

        if Event != Any:
            yield Event(
                author=self.name,
                custom_metadata={
                    "readiness": analysis.readiness,
                    "total_weeks": roadmap.total_weeks,
                    "items_count": len(roadmap.items),
                },
            )


def _convert_to_profile_state(
    profile_data: Any,
    skill_overrides: dict[str, float],
    catalog: Catalog,
) -> ProfileState:
    """Convert session state profile data into engine ProfileState."""
    if isinstance(profile_data, ProfileState):
        return profile_data

    skill_states: dict[str, ProfileSkillState] = {}
    interests: list[str] = []
    exp_years = 0.0

    if isinstance(profile_data, dict):
        interests = profile_data.get("interests", [])
        exp_years = float(profile_data.get("experience_years", 0.0))
        raw_skills = profile_data.get("skills", [])
        if isinstance(raw_skills, list):
            for s in raw_skills:
                sid = s.get("skill_id")
                if not sid:
                    continue
                sk_name = s.get("skill_name") or sid
                level = float(s.get("level", 0.0))
                skill_states[sid] = ProfileSkillState(
                    skill_id=sid,
                    skill_name=sk_name,
                    level=level,
                    source=s.get("source", "self"),
                    flag=s.get("flag"),
                    snippet=s.get("snippet"),
                )
        elif isinstance(raw_skills, dict):
            for sid, s in raw_skills.items():
                sk_name = s.get("skill_name") or sid
                level = float(s.get("level", 0.0))
                skill_states[sid] = ProfileSkillState(
                    skill_id=sid,
                    skill_name=sk_name,
                    level=level,
                    source=s.get("source", "self"),
                    flag=s.get("flag"),
                    snippet=s.get("snippet"),
                )

    # Apply manual overrides
    for sid, ov in skill_overrides.items():
        cat_sk = catalog.get_skill(sid)
        name = cat_sk.name if cat_sk else sid
        skill_states[sid] = ProfileSkillState(
            skill_id=sid,
            skill_name=name,
            level=float(ov),
            source="override",
        )

    return ProfileState(
        experience_years=exp_years,
        interests=interests,
        skills=skill_states,
    )
