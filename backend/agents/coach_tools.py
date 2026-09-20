"""CoachAgent plain-Python tool functions per SPEC §5.2, §8, and §10.3.

Each tool:
- Has explicit type hints and docstrings for ADK LLM function declaration.
- Reuses the SAME app/services.py functions as the FastAPI routes.
- Reads user_id from tool_context.state (defaulting to demo user).
- Returns a COMPACT JSON dict (never the full state).
"""
from __future__ import annotations

from typing import Any

from app import services
from app.errors import AppError
from app.schemas import AnalyzeRequest, CompleteRequest, MarketUpdateRequest
from engine.catalog import Catalog
from rag.normalizer import normalize as normalize_skill


def _get_user_id(tool_context: Any = None) -> str:
    """Extract user_id from tool_context.state or fallback to demo."""
    if tool_context is not None:
        state = getattr(tool_context, "state", None)
        if isinstance(state, dict):
            return state.get("user_id", "demo")
        if state is not None and hasattr(state, "get"):
            return state.get("user_id", "demo")
    return "demo"


def mark_complete(skill_id: str, tool_context: Any = None) -> dict[str, Any]:
    """Mark a skill or learning milestone as completed and replan the roadmap.

    Args:
        skill_id: Canonical skill identifier (e.g. 'rag', 'docker', 'python').
        tool_context: ADK execution context holding session state.

    Returns:
        Compact summary of readiness progress, unlocked skills, and replan facts.
    """
    user_id = _get_user_id(tool_context)
    canonical_id, _ = normalize_skill(skill_id)
    target_id = canonical_id or skill_id.lower().strip()

    try:
        res = services.complete(
            user_id=user_id,
            req=CompleteRequest(skill_id=target_id),
        )
    except AppError as exc:
        return {"status": "error", "message": exc.message}

    if tool_context is not None and hasattr(tool_context, "state"):
        try:
            tool_context.state["state_changed"] = True
            tool_context.state["last_diff"] = res.diff.model_dump()
        except Exception:
            pass

    return {
        "status": "success",
        "skill_id": target_id,
        "skill_name": res.diff.trigger.skill_name or target_id,
        "readiness_before": res.diff.readiness_before,
        "readiness_after": res.diff.readiness_after,
        "facts": res.diff.facts,
        "unlocked": [u.skill_name for u in res.diff.unlocked],
        "diff_narrative": res.narrative,
    }


def get_today_priority(tool_context: Any = None) -> dict[str, Any]:
    """Retrieve today's highest priority learning action recommendation.

    Args:
        tool_context: ADK execution context holding session state.

    Returns:
        Compact summary of the recommended activity, duration in minutes, and why.
    """
    user_id = _get_user_id(tool_context)
    try:
        res = services.get_today(user_id=user_id)
    except AppError as exc:
        return {"status": "error", "message": exc.message}

    if res.today:
        return {
            "status": "success",
            "skill_name": res.today.skill_name,
            "activity_title": res.today.activity.title,
            "minutes": res.today.minutes,
            "url": res.today.activity.url,
            "reasons": res.today.reasons,
        }
    return {"status": "none", "message": res.message or "No urgent activity found for today."}


def explain_item(item_id: str, tool_context: Any = None) -> dict[str, Any]:
    """Retrieve the structured explanation and priority rationale for a roadmap item.

    Args:
        item_id: Identifier of the roadmap item or skill name (e.g. 'rm_docker' or 'docker').
        tool_context: ADK execution context holding session state.

    Returns:
        Compact explanation with priority, level gap, and unblocked milestones.
    """
    user_id = _get_user_id(tool_context)
    try:
        state = services.get_state(user_id=user_id)
    except AppError as exc:
        return {"status": "error", "message": exc.message}

    clean_id = item_id.strip().lower()
    canonical_skill, _ = normalize_skill(clean_id)
    search_ids = {clean_id}
    if not clean_id.startswith("rm_"):
        search_ids.add(f"rm_{clean_id}")
    if canonical_skill:
        search_ids.add(canonical_skill)
        search_ids.add(f"rm_{canonical_skill}")

    matched_item = None
    for item in state.roadmap.items:
        if item.item_id in search_ids or (item.skill_id and item.skill_id in search_ids):
            matched_item = item
            break
        if item.skill_name.lower() == clean_id:
            matched_item = item
            break

    if not matched_item:
        return {"status": "error", "message": f"Roadmap item '{item_id}' not found."}

    why = matched_item.why
    if not why:
        return {
            "status": "success",
            "item_id": matched_item.item_id,
            "skill_name": matched_item.skill_name,
            "phase": matched_item.phase,
            "narrative": "Capstone project integrating core skills.",
        }

    return {
        "status": "success",
        "item_id": matched_item.item_id,
        "skill_name": matched_item.skill_name,
        "priority": why.priority,
        "priority_label": why.priority_label,
        "narrative": why.narrative,
        "unblocks": [u.skill_name for u in why.unblocks],
        "gap": f"{why.level} vs {why.target} required",
    }


def set_target_role(role_id: str, tool_context: Any = None) -> dict[str, Any]:
    """Switch target career role and recalculate readiness, gaps, and roadmap.

    Args:
        role_id: Identifier or title of the target role (e.g. 'ml_engineer', 'genai_engineer').
        tool_context: ADK execution context holding session state.

    Returns:
        Compact summary with new role title, updated readiness score, and top gaps.
    """
    user_id = _get_user_id(tool_context)
    clean_id = role_id.strip().lower().replace(" ", "_").replace("-", "_")

    # Map aliases
    role_map = {
        "ml": "ml_engineer",
        "ml_engineer": "ml_engineer",
        "machine_learning": "ml_engineer",
        "machine_learning_engineer": "ml_engineer",
        "genai": "genai_engineer",
        "genai_engineer": "genai_engineer",
        "generative_ai": "genai_engineer",
        "backend": "backend_engineer",
        "backend_engineer": "backend_engineer",
        "data_science": "data_scientist",
        "data_scientist": "data_scientist",
    }
    target_role = role_map.get(clean_id, clean_id)

    try:
        prof_res = services.get_profile(user_id=user_id)
    except AppError as exc:
        return {"status": "error", "message": exc.message}

    try:
        res = services.analyze(
            user_id=user_id,
            req=AnalyzeRequest(
                role_id=target_role,
                weekly_hours=prof_res.profile.weekly_hours,
                deadline_weeks=prof_res.profile.deadline_weeks,
            ),
        )
    except AppError as exc:
        return {"status": "error", "message": exc.message}

    if tool_context is not None and hasattr(tool_context, "state"):
        try:
            tool_context.state["state_changed"] = True
        except Exception:
            pass

    return {
        "status": "success",
        "role_id": res.role.role_id,
        "role_title": res.role.title,
        "readiness": res.analysis.readiness,
        "total_weeks": res.roadmap.total_weeks,
        "top_gaps": [g.skill_name for g in res.analysis.gaps[:3]],
    }


def apply_market_update(tool_context: Any = None) -> dict[str, Any]:
    """Apply updated industry market requirements to the current target role and replan.

    Args:
        tool_context: ADK execution context holding session state.

    Returns:
        Compact summary of the role version change, updated readiness, and key facts.
    """
    user_id = _get_user_id(tool_context)
    try:
        res = services.market_update(
            user_id=user_id,
            req=MarketUpdateRequest(),
        )
    except AppError as exc:
        return {"status": "error", "message": exc.message}

    if tool_context is not None and hasattr(tool_context, "state"):
        try:
            tool_context.state["state_changed"] = True
            tool_context.state["last_diff"] = res.diff.model_dump()
        except Exception:
            pass

    return {
        "status": "success",
        "role_version": res.state.role.version,
        "readiness_before": res.diff.readiness_before,
        "readiness_after": res.diff.readiness_after,
        "facts": res.diff.facts,
        "diff_narrative": res.narrative,
    }
