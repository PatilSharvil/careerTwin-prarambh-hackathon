"""CoachAgent implementation and fallback routing per SPEC §5.2, §8, and §10.3.

Provides:
- build_coach_agent(model): constructs the ADK LlmAgent with engine tools.
- fallback_coach_router(message, user_id): deterministic regex/keyword intent router.
- run_coach(message, session_id, user_id): runs the coach via ADK Runner with multi-provider failover
  and automatic fallback to the deterministic router.
"""
from __future__ import annotations

import asyncio
import logging
import re
from typing import Any

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from agents.coach_tools import (
    apply_market_update,
    explain_item,
    get_today_priority,
    mark_complete,
    set_target_role,
)
from app.config import settings
from app.schemas import ToolCallInfo
from llm.failover import AllProvidersFailed, run_with_failover
from llm.provider import available_chain, get_model

logger = logging.getLogger("careertwin.coach_agent")

# Shared session service for ADK runner
_session_service = InMemorySessionService()

COACH_INSTRUCTION = (
    "You are an AI Career Coach. Use tools for every fact. "
    "Never invent skills, levels, or links. Keep replies short, encouraging, and factual.\n"
    "- When the user mentions completing or finishing a skill, call mark_complete(skill_id=...).\n"
    "- When the user asks what to study, learn, or do today, call get_today_priority().\n"
    "- When the user asks why a skill or roadmap item is scheduled or prioritized, call explain_item(item_id=...).\n"
    "- When the user wants to change or switch their target career role, call set_target_role(role_id=...).\n"
    "- When the user asks about market trends or requirements changing, call apply_market_update()."
)


class MockToolContext:
    """Mock ADK tool context for invoking tools directly from the fallback router."""

    def __init__(self, user_id: str):
        self.state: dict[str, Any] = {"user_id": user_id}


def build_coach_agent(model: Any = None) -> LlmAgent:
    """Build the ADK CoachAgent with standard engine tools.

    Args:
        model: Model string or LiteLlm instance. Defaults to primary provider model.

    Returns:
        Configured LlmAgent instance.
    """
    if model is None:
        chain = available_chain()
        primary = chain[0] if chain else "gemini"
        model = get_model(primary)

    return LlmAgent(
        name="CoachAgent",
        model=model,
        instruction=COACH_INSTRUCTION,
        tools=[mark_complete, get_today_priority, explain_item, set_target_role, apply_market_update],
    )


def fallback_coach_router(
    message: str,
    user_id: str = "demo",
) -> tuple[str, list[ToolCallInfo], bool, dict[str, Any] | None]:
    """Deterministic keyword/regex router calling the exact same tools as CoachAgent.

    Used when provider chain is 'none' or when all LLM providers fail.

    Returns:
        (reply, tool_calls, state_changed, last_diff)
    """
    cleaned = message.strip()
    context = MockToolContext(user_id=user_id)
    tool_calls: list[ToolCallInfo] = []

    # 1. Market update intent
    p_market = re.compile(
        r"(?:market\s+update|requirements\s+changed|update\s+(?:the\s+)?market|market\s+changed)",
        re.IGNORECASE,
    )
    if p_market.search(cleaned):
        res = apply_market_update(tool_context=context)
        ok = res.get("status") == "success"
        tool_calls.append(ToolCallInfo(name="apply_market_update", args={}, ok=ok))
        state_changed = ok
        last_diff = context.state.get("last_diff")
        if ok:
            facts = "; ".join(res.get("facts", []))
            reply = (
                f"Market requirements updated to version {res.get('role_version')}. "
                f"Readiness updated from {res.get('readiness_before')}% to {res.get('readiness_after')}%. "
                f"{facts}"
            )
        else:
            reply = res.get("message", "No market update available for this role.")
        return reply, tool_calls, state_changed, last_diff

    # 2. Today priority intent
    p_today = re.compile(
        r"(?:what\s+should\s+i\s+(?:learn|do|study|focus\s+on)|what\s+to\s+learn|today|next\s+step|recommend)",
        re.IGNORECASE,
    )
    if p_today.search(cleaned):
        res = get_today_priority(tool_context=context)
        ok = res.get("status") in {"success", "none"}
        tool_calls.append(ToolCallInfo(name="get_today_priority", args={}, ok=ok))
        if res.get("status") == "success":
            reply = (
                f"Recommended focus for today: {res.get('skill_name')} - "
                f"{res.get('activity_title')} ({res.get('minutes')} mins). "
                f"URL: {res.get('url')}"
            )
        else:
            reply = res.get("message", "No urgent activity found for today.")
        return reply, tool_calls, False, None

    # 3. Complete skill intent
    p_complete = re.compile(
        r"^(?:i\s+)?(?:have\s+)?(?:completed|finished|done\s+with|marked?\s+(?:as\s+)?complete(?:d)?|complete)\s+(.+?)[.!?]?$",
        re.IGNORECASE,
    )
    m_comp = p_complete.match(cleaned)
    if m_comp:
        skill_target = m_comp.group(1).strip()
        res = mark_complete(skill_id=skill_target, tool_context=context)
        ok = res.get("status") == "success"
        tool_calls.append(ToolCallInfo(name="mark_complete", args={"skill_id": skill_target}, ok=ok))
        state_changed = ok
        last_diff = context.state.get("last_diff")
        if ok:
            unlocked_str = (
                f" Unlocked: {', '.join(res.get('unlocked', []))}."
                if res.get("unlocked")
                else ""
            )
            reply = (
                f"Marked {res.get('skill_name', skill_target)} as complete! "
                f"Readiness increased from {res.get('readiness_before')}% to {res.get('readiness_after')}%.{unlocked_str}"
            )
        else:
            reply = res.get("message", f"Failed to mark '{skill_target}' complete.")
        return reply, tool_calls, state_changed, last_diff

    # 4. Explain / Why intent
    p_why = re.compile(
        r"^(?:why\s+is\s+|why\s+|explain\s+)(.+?)(?:\s+prioritized|\s+recommended|\s+first)?[.!?]?$",
        re.IGNORECASE,
    )
    m_why = p_why.match(cleaned)
    if m_why:
        target_item = m_why.group(1).strip()
        res = explain_item(item_id=target_item, tool_context=context)
        ok = res.get("status") == "success"
        tool_calls.append(ToolCallInfo(name="explain_item", args={"item_id": target_item}, ok=ok))
        if ok:
            unblocks_str = (
                f" Unblocks: {', '.join(res.get('unblocks', []))}."
                if res.get("unblocks")
                else ""
            )
            reply = (
                f"{res.get('skill_name', target_item)} is prioritized ({res.get('priority_label', 'High')} priority): "
                f"{res.get('narrative', '')} Gap: {res.get('gap', '')}.{unblocks_str}"
            )
        else:
            reply = res.get("message", f"Roadmap item '{target_item}' not found.")
        return reply, tool_calls, False, None

    # 5. Switch target role intent
    p_role = re.compile(
        r"(?:switch(?:\s+role)?\s+to|change(?:\s+my)?\s+role\s+to|target\s+role(?:\s+to)?|become\s+(?:an?\s+)?)\s*(.+?)[.!?]?$",
        re.IGNORECASE,
    )
    m_role = p_role.search(cleaned)
    if m_role:
        role_target = m_role.group(1).strip()
        res = set_target_role(role_id=role_target, tool_context=context)
        ok = res.get("status") == "success"
        tool_calls.append(ToolCallInfo(name="set_target_role", args={"role_id": role_target}, ok=ok))
        state_changed = ok
        if ok:
            top_gaps = ", ".join(res.get("top_gaps", []))
            reply = (
                f"Switched target role to {res.get('role_title', role_target)}. "
                f"Readiness: {res.get('readiness')}%. Total duration: {res.get('total_weeks')} weeks. "
                f"Top focus areas: {top_gaps}."
            )
        else:
            reply = res.get("message", f"Failed to switch role to '{role_target}'.")
        return reply, tool_calls, state_changed, None

    # Unmatched fallback
    reply = (
        "I am your Career Coach! You can ask me to mark skills complete (e.g. 'I completed RAG'), "
        "find what to do today ('What should I learn today?'), explain priorities ('Why Docker?'), "
        "switch roles ('Switch to ML engineer'), or check market updates ('Requirements changed')."
    )
    return reply, tool_calls, False, None


def _execute_runner_sync(
    provider: str,
    message: str,
    session_id: str,
    user_id: str,
) -> tuple[str, list[ToolCallInfo], bool, dict[str, Any] | None]:
    """Synchronous execution wrapper for ADK Runner suitable for ThreadPoolExecutor in run_with_failover."""
    agent = build_coach_agent(get_model(provider))
    runner = Runner(
        app_name="careertwin",
        agent=agent,
        session_service=_session_service,
        auto_create_session=True,
    )

    async def _async_run():
        new_msg = types.Content(
            role="user",
            parts=[types.Part.from_text(text=message)],
        )
        tool_calls: list[ToolCallInfo] = []
        reply_parts: list[str] = []
        state_changed = False

        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_msg,
            state_delta={"user_id": user_id},
        ):
            # Collect tool calls from events
            for fc in event.get_function_calls():
                name = getattr(fc, "name", "")
                args = getattr(fc, "args", {}) or {}
                if name in {"mark_complete", "set_target_role", "apply_market_update"}:
                    state_changed = True
                tool_calls.append(ToolCallInfo(name=name, args=args, ok=True))

            # Collect final response parts
            if event.is_final_response() and event.message:
                for part in event.message.parts or []:
                    txt = getattr(part, "text", None)
                    if txt:
                        reply_parts.append(txt)

        # Also inspect session state for state_changed and diff
        last_diff = None
        session = await _session_service.get_session(
            app_name="careertwin",
            user_id=user_id,
            session_id=session_id,
        )
        if session and session.state:
            if session.state.get("state_changed"):
                state_changed = True
            last_diff = session.state.get("last_diff")

        reply = "\n".join(reply_parts).strip()
        if not reply and tool_calls:
            reply = f"Completed action via {tool_calls[0].name}."
        elif not reply:
            reply = "I have processed your request."

        return reply, tool_calls, state_changed, last_diff

    return asyncio.run(_async_run())


async def run_coach(
    message: str,
    session_id: str,
    user_id: str = "demo",
) -> tuple[str, list[ToolCallInfo], bool, dict[str, Any] | None, str, bool]:
    """Run CoachAgent handling session state, LLM failover, and deterministic fallback.

    Returns:
        (reply, tool_calls, state_changed, last_diff, provider, fallback_used)
    """
    chain = available_chain()

    # If chain is empty or set to none, directly use the deterministic fallback router
    if not chain:
        logger.info("No LLM providers available; using deterministic fallback coach router")
        reply, tool_calls, state_changed, last_diff = fallback_coach_router(
            message=message,
            user_id=user_id,
        )
        return reply, tool_calls, state_changed, last_diff, "none", True

    try:
        def make_call(provider: str):
            return _execute_runner_sync(
                provider=provider,
                message=message,
                session_id=session_id,
                user_id=user_id,
            )

        (reply, tool_calls, state_changed, last_diff), successful_provider = run_with_failover(
            step_name="coach",
            make_call=make_call,
            chain=chain,
        )
        return reply, tool_calls, state_changed, last_diff, successful_provider, False

    except (AllProvidersFailed, Exception) as exc:
        logger.warning(
            "Coach LLM failover failed (%s); falling back to deterministic coach router",
            exc,
        )
        reply, tool_calls, state_changed, last_diff = fallback_coach_router(
            message=message,
            user_id=user_id,
        )
        return reply, tool_calls, state_changed, last_diff, "none", True
