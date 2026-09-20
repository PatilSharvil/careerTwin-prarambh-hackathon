"""ExplainerAgent per SPEC §5.2, §8, §10.2, & §12.

Generates concise, verified explanations for roadmap items and diffs grounded strictly
in structured Why facts. Employs batching, caching in SQLite llm_cache, and strict
validation to prevent hallucinated metrics.
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any, Sequence
from pydantic import BaseModel, Field, model_validator

from app.config import settings
from app.schemas import NarrativeSource
from agents.validator import validate_narrative_numbers
from engine.models import Diff, RoadmapItem, Why
from engine.narrative import generate_template_narrative
from llm.failover import AllProvidersFailed, run_with_failover
from llm.parsing import parse_and_validate
from llm.provider import available_chain, get_model
from store.repo import cache_get, cache_set

logger = logging.getLogger("careertwin.agents.explainer")

try:
    from google.adk.agents import LlmAgent
except ImportError:
    LlmAgent = None  # type: ignore[assignment,misc]

EXPLAINER_INSTRUCTION = """You are the CareerTwin ExplainerAgent.
Your job is to generate clear, motivating 1-2 sentence rationales for roadmap milestones.

STRICT GROUNDING RULES:
1. Follow the sentence pattern:
   "{Skill} is {priority label} priority because your level is {level}/10 vs ~{target}/10 needed for {role}. It also unblocks {unblocks}."
2. You must use ONLY the numbers provided in the input facts. NEVER invent, round, or alter numbers.
3. Maximum 2 sentences per item.
4. Output a valid JSON object matching the ExplanationsOut schema with key "explanations":
   {"explanations": [{"item_id": "...", "narrative": "..."}]}
"""


class ItemExplanation(BaseModel):
    """Explanation for a single roadmap item."""

    item_id: str
    narrative: str

    @model_validator(mode="before")
    @classmethod
    def normalize_item_explanation(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "item_id" not in data or not data["item_id"]:
                data["item_id"] = data.get("id") or data.get("skill_id") or data.get("item") or ""
            if "narrative" not in data or not data["narrative"]:
                data["narrative"] = (
                    data.get("explanation")
                    or data.get("reason")
                    or data.get("why")
                    or data.get("text")
                    or data.get("summary")
                    or ""
                )
        return data


class ExplanationsOut(BaseModel):
    """Batch explanations output."""

    explanations: list[ItemExplanation] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_explanations_out(cls, data: Any) -> Any:
        if isinstance(data, list):
            data = {"explanations": data}
        elif isinstance(data, dict):
            if "explanations" not in data:
                for alt in ("items", "results", "data", "list", "output"):
                    if alt in data and isinstance(data[alt], list):
                        data["explanations"] = data[alt]
                        break
        return data


def build_explainer_agent(model: Any = None) -> Any:
    """Build tool-free LlmAgent for batch explanations with output_schema."""
    if LlmAgent is None:
        return None
    mdl = model or get_model("gemini")
    return LlmAgent(
        name="ExplainerAgent",
        model=mdl,
        instruction=EXPLAINER_INSTRUCTION,
        output_schema=ExplanationsOut,
        output_key="explanations_out",
        tools=[],
    )


def explain_items(
    items: list[RoadmapItem],
    role_title: str,
    chain: Sequence[str] | None = None,
) -> dict[str, tuple[str, NarrativeSource]]:
    """Generate explanations for roadmap items in a single batched call with caching and validation.

    Returns:
        Mapping from item_id -> (narrative, narrative_source)
    """
    results: dict[str, tuple[str, NarrativeSource]] = {}
    items_to_explain = [it for it in items if not it.is_capstone and it.why is not None]

    if not items_to_explain:
        return results

    BATCH_SIZE = 6
    providers = list(chain) if chain is not None else available_chain()
    active_providers = [p for p in providers if p.lower() != "none"]

    for i in range(0, len(items_to_explain), BATCH_SIZE):
        batch = items_to_explain[i : i + BATCH_SIZE]
        facts_list = []
        for it in batch:
            why = it.why
            assert why is not None
            facts_list.append(
                {
                    "item_id": it.item_id,
                    "skill_name": it.skill_name,
                    "role_title": role_title,
                    "level": why.level,
                    "target": why.target,
                    "gap": why.gap,
                    "importance": why.importance,
                    "priority": why.priority,
                    "priority_label": why.priority_label,
                    "unblocks": [u.skill_name for u in why.unblocks],
                    "interest_match": why.interest_match,
                }
            )

        facts_json = json.dumps(facts_list, sort_keys=True)
        cache_key = "explain_items_" + hashlib.sha256(facts_json.encode("utf-8")).hexdigest()

        # Check SQLite cache
        cached = cache_get(cache_key)
        if cached and isinstance(cached, dict) and "explanations" in cached:
            logger.info("ExplainerAgent cache HIT for key %s", cache_key[:12])
            for exp in cached["explanations"]:
                iid = exp.get("item_id")
                narr = exp.get("narrative", "")
                if iid:
                    results[iid] = (narr, "llm")
            continue

        if not active_providers:
            for it in batch:
                assert it.why is not None
                results[it.item_id] = (it.why.narrative, "template")
            continue

        prompt = f"""Target Role: {role_title}

Structured Why Facts for each roadmap item:
{facts_json}

Generate explanations for every item according to instructions. Output valid JSON only."""

        def _make_call(prov: str) -> ExplanationsOut:
            import litellm

            if prov == "gemini":
                model_str = f"gemini/{settings.GEMINI_MODEL}"
                api_key = settings.GEMINI_API_KEY
            elif prov == "groq":
                model_str = f"groq/{settings.GROQ_MODEL}"
                api_key = settings.GROQ_API_KEY
            elif prov == "openrouter":
                model_str = f"openrouter/{settings.OPENROUTER_MODEL}"
                api_key = settings.OPENROUTER_API_KEY
            else:
                raise ValueError(f"Unknown provider: {prov}")

            messages = [
                {"role": "system", "content": EXPLAINER_INSTRUCTION},
                {"role": "user", "content": prompt},
            ]

            resp = litellm.completion(
                model=model_str,
                messages=messages,
                api_key=api_key,
                response_format={"type": "json_object"},
                timeout=settings.LLM_TIMEOUT_SECONDS,
            )
            content = resp.choices[0].message.content
            return parse_and_validate(content, ExplanationsOut)

        try:
            explanations_out, _ = run_with_failover(
                step_name=f"explain_items_batch_{i // BATCH_SIZE + 1}",
                make_call=_make_call,
                chain=active_providers,
            )

            llm_explanations = {exp.item_id: exp.narrative for exp in explanations_out.explanations}
            cache_records: list[dict[str, str]] = []

            for it in batch:
                why = it.why
                assert why is not None
                raw_narrative = llm_explanations.get(it.item_id)

                if raw_narrative and validate_narrative_numbers(raw_narrative, why):
                    results[it.item_id] = (raw_narrative, "llm")
                    cache_records.append({"item_id": it.item_id, "narrative": raw_narrative})
                else:
                    logger.info(
                        "Narrative validation failed for %s. Using template fallback.",
                        it.item_id,
                    )
                    results[it.item_id] = (why.narrative, "template")

            if cache_records:
                cache_set(cache_key, {"explanations": cache_records})

        except AllProvidersFailed as exc:
            logger.warning("ExplainerAgent batch failed: %s. Using template fallbacks.", exc)
            for it in batch:
                assert it.why is not None
                results[it.item_id] = (it.why.narrative, "template")

        # Brief spacing between batches to prevent token bursting
        time.sleep(1.0)

    return results


def explain_diff(
    diff: Diff,
    role_title: str,
    chain: Sequence[str] | None = None,
) -> tuple[str, NarrativeSource]:
    """Generate a cohesive narrative explaining state changes from diff facts."""
    if not diff.facts:
        return "Your learning plan is completely up to date.", "template"

    default_template = " ".join(diff.facts)

    facts_json = json.dumps(diff.facts, sort_keys=True)
    cache_key = "explain_diff_" + hashlib.sha256(facts_json.encode("utf-8")).hexdigest()

    cached = cache_get(cache_key)
    if cached and isinstance(cached, dict) and "narrative" in cached:
        return cached["narrative"], "llm"

    providers = list(chain) if chain is not None else available_chain()
    active_providers = [p for p in providers if p.lower() != "none"]

    if not active_providers:
        return default_template, "template"

    prompt = f"""Target Role: {role_title}

Verified diff facts:
{json.dumps(diff.facts)}

Write a concise 1-2 sentence progress summary for the user explaining what changed and why.
Use ONLY the numbers and facts provided. Output valid JSON: {{"narrative": "..."}}."""

    class DiffExplanationOut(BaseModel):
        narrative: str

        @model_validator(mode="before")
        @classmethod
        def normalize_diff_out(cls, data: Any) -> Any:
            if isinstance(data, dict):
                if "narrative" not in data or not data["narrative"]:
                    data["narrative"] = (
                        data.get("explanation")
                        or data.get("summary")
                        or data.get("text")
                        or data.get("diff")
                        or ""
                    )
            elif isinstance(data, str):
                data = {"narrative": data}
            return data

    def _make_call(prov: str) -> DiffExplanationOut:
        import litellm

        if prov == "gemini":
            model_str = f"gemini/{settings.GEMINI_MODEL}"
            api_key = settings.GEMINI_API_KEY
        elif prov == "groq":
            model_str = f"groq/{settings.GROQ_MODEL}"
            api_key = settings.GROQ_API_KEY
        elif prov == "openrouter":
            model_str = f"openrouter/{settings.OPENROUTER_MODEL}"
            api_key = settings.OPENROUTER_API_KEY
        else:
            raise ValueError(f"Unknown provider: {prov}")

        messages = [
            {"role": "system", "content": "You are a concise career coach explaining progress diffs."},
            {"role": "user", "content": prompt},
        ]

        resp = litellm.completion(
            model=model_str,
            messages=messages,
            api_key=api_key,
            response_format={"type": "json_object"},
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
        return parse_and_validate(resp.choices[0].message.content, DiffExplanationOut)

    try:
        res, _ = run_with_failover(
            step_name="explain_diff",
            make_call=_make_call,
            chain=active_providers,
        )
        cache_set(cache_key, {"narrative": res.narrative})
        return res.narrative, "llm"
    except AllProvidersFailed:
        return default_template, "template"
