"""RoleBuilderAgent per SPEC §5.2, §10.3, §3.1, & §16.

Constructs custom roles from title and description:
1. LlmAgent selecting skill_ids strictly from the catalog with importance and target.
2. Validator dropping unknown skill IDs (with warnings) and enforcing 8-20 skills bounds.
3. Deterministic fallback: nearest curated role by Chroma similarity, cloned under the new title.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Sequence
from pydantic import BaseModel, Field

from app.config import settings
from app.schemas import Meta, RoleDetail, RoleSkill
from engine.catalog import Catalog
from engine.models import Role as EngineRole
from llm.failover import AllProvidersFailed, run_with_failover
from llm.parsing import parse_and_validate
from llm.provider import available_chain, get_model
from rag.chroma_client import get_chroma_client, get_or_create_collection

logger = logging.getLogger("careertwin.agents.role_builder")

try:
    from google.adk.agents import LlmAgent
except ImportError:
    LlmAgent = None  # type: ignore[assignment,misc]


ROLE_BUILDER_INSTRUCTION = """You are the CareerTwin RoleBuilderAgent.
Your job is to construct a technical skill specification for a new job role based on its title and description.

Available skills in the catalog:
{catalog_skills}

STRICT RULES:
1. Select between 8 and 20 skills that are most critical and relevant for this role.
2. Select ONLY from the valid skill_ids listed above. Do not invent any new skills or IDs.
3. Assign an importance score between 0.1 and 1.0 (float) for each skill.
4. Assign a target proficiency level between 1.0 and 10.0 (float) for each skill.
5. Return valid JSON adhering to the output schema.
"""


class RoleSkillDraft(BaseModel):
    """Single skill requirement draft from LLM."""

    skill_id: str
    importance: float = Field(default=0.7, ge=0.0, le=1.0)
    target: float = Field(default=7.0, ge=1.0, le=10.0)


class RoleBuilderOut(BaseModel):
    """Structured output from RoleBuilderAgent."""

    skills: list[RoleSkillDraft] = Field(default_factory=list)


def slugify_title(title: str) -> str:
    """Create a URL/id-safe slug from a role title."""
    cleaned = re.sub(r"[^a-z0-9]+", "_", title.lower()).strip("_")
    return cleaned or "role"


def build_role_builder_agent(model: Any = None, catalog: Catalog | None = None) -> Any:
    """Build tool-free LlmAgent for role building with output_schema per SPEC §5.2."""
    if LlmAgent is None:
        return None
    cat = catalog or Catalog.from_data_dir()
    skills_listing = "\n".join(f"- {s.id} ({s.name}, category: {s.category})" for s in cat.skills)
    instruction = ROLE_BUILDER_INSTRUCTION.format(catalog_skills=skills_listing)
    mdl = model or get_model("gemini")
    return LlmAgent(
        name="RoleBuilderAgent",
        model=mdl,
        instruction=instruction,
        output_schema=RoleBuilderOut,
        output_key="role_builder_out",
        tools=[],
    )


def validate_and_normalize_skills(
    draft_skills: list[RoleSkillDraft],
    catalog: Catalog,
) -> list[RoleSkill]:
    """Validate skill IDs, drop unknowns with warning, and enforce 8-20 skills bounds."""
    seen_ids: set[str] = set()
    valid_skills: list[RoleSkill] = []

    for draft in draft_skills:
        cat_skill = catalog.get_skill(draft.skill_id)
        if not cat_skill:
            logger.warning("RoleBuilder: Dropping unknown skill ID '%s'", draft.skill_id)
            continue

        if cat_skill.id in seen_ids:
            continue
        seen_ids.add(cat_skill.id)

        importance = max(0.1, min(1.0, float(draft.importance)))
        target = max(1.0, min(10.0, float(draft.target)))

        valid_skills.append(
            RoleSkill(
                skill_id=cat_skill.id,
                skill_name=cat_skill.name,
                category=cat_skill.category,
                importance=round(importance, 2),
                target=round(target, 1),
            )
        )

    # Enforce bounds: 8 to 20 skills
    if len(valid_skills) > 20:
        valid_skills.sort(key=lambda s: s.importance, reverse=True)
        valid_skills = valid_skills[:20]

    if len(valid_skills) < 8:
        raise ValueError(
            f"RoleBuilder output has only {len(valid_skills)} valid skills; minimum required is 8"
        )

    return valid_skills


def find_nearest_curated_role(
    title: str,
    description: str,
    catalog: Catalog | None = None,
) -> EngineRole:
    """Find nearest curated role by Chroma vector similarity (role title + description)."""
    cat = catalog or Catalog.from_data_dir()
    query_text = f"{title}. {description}".strip()

    try:
        client = get_chroma_client()
        col = get_or_create_collection("roles", client=client)
        results = col.query(query_texts=[query_text], n_results=1)
        if results and results.get("ids") and results["ids"][0]:
            matched_id = results["ids"][0][0]
            role = cat.get_role(matched_id)
            if role:
                logger.info("Chroma matched nearest curated role '%s' for '%s'", matched_id, title)
                return role
    except Exception as exc:
        logger.warning("Chroma role search encountered: %s. Falling back to lexical match.", exc)

    # Lexical fallback: word overlap Jaccard similarity against curated roles
    query_words = set(re.findall(r"\w+", query_text.lower()))
    best_role = cat.roles[0]
    best_score = -1.0

    for r in cat.roles:
        target_words = set(re.findall(r"\w+", f"{r.title} {r.description}".lower()))
        intersection = query_words.intersection(target_words)
        union = query_words.union(target_words)
        score = len(intersection) / len(union) if union else 0.0
        if score > best_score:
            best_score = score
            best_role = r

    logger.info("Lexical matched nearest curated role '%s' for '%s'", best_role.role_id, title)
    return best_role


def clone_role_under_title(
    nearest_role: EngineRole,
    title: str,
    description: str,
    catalog: Catalog | None = None,
) -> RoleDetail:
    """Deterministic fallback: clone nearest curated role under the new title."""
    cat = catalog or Catalog.from_data_dir()
    slug = slugify_title(title)
    role_id = f"custom_{slug}"

    skills: list[RoleSkill] = []
    for rs in nearest_role.skills:
        sid = rs.skill or rs.skill_id
        sk = cat.get_skill(sid)
        skill_name = sk.name if sk else (rs.skill_name or sid)
        category = sk.category if sk else rs.category
        skills.append(
            RoleSkill(
                skill_id=sid,
                skill_name=skill_name,
                category=category,
                importance=rs.importance,
                target=rs.target,
            )
        )

    # Enforce 8-20 skills
    if len(skills) > 20:
        skills.sort(key=lambda s: s.importance, reverse=True)
        skills = skills[:20]

    sorted_skills = sorted(skills, key=lambda s: s.importance, reverse=True)
    top_skills = [s.skill_name for s in sorted_skills[:5]]

    return RoleDetail(
        role_id=role_id,
        title=title,
        version="custom",
        description=description,
        skill_count=len(skills),
        top_skills=top_skills,
        is_custom=True,
        market_update_available=False,
        skills=skills,
    )


async def build_custom_role(
    title: str,
    description: str,
    chain: Sequence[str] | None = None,
    catalog: Catalog | None = None,
) -> tuple[RoleDetail, Meta]:
    """Orchestrate custom role creation with multi-provider LLM failover and deterministic fallback."""
    cat = catalog or Catalog.from_data_dir()
    slug = slugify_title(title)
    role_id = f"custom_{slug}"

    providers = list(chain) if chain is not None else available_chain()
    active_providers = [p for p in providers if p.lower() != "none"]

    # Fallback function closure
    def _run_fallback() -> RoleDetail:
        nearest = find_nearest_curated_role(title, description, catalog=cat)
        return clone_role_under_title(nearest, title, description, catalog=cat)

    if not active_providers:
        logger.info("RoleBuilder: No active LLM providers. Running deterministic fallback.")
        role_detail = _run_fallback()
        meta = Meta(llm_provider="none", llm_used=False, fallback_used=True)
        return role_detail, meta

    skills_listing = "\n".join(f"- {s.id} ({s.name}, category: {s.category})" for s in cat.skills)
    prompt = f"""Construct a custom role specification.

ROLE TITLE: {title}
ROLE DESCRIPTION: {description}

Select 8 to 20 skills from the catalog with importance and target. Output valid JSON matching the schema."""

    def _make_call(prov: str) -> RoleBuilderOut:
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

        instruction = ROLE_BUILDER_INSTRUCTION.format(catalog_skills=skills_listing)
        messages = [
            {"role": "system", "content": instruction},
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
        out = parse_and_validate(content, RoleBuilderOut)
        # Validate skills immediately inside attempt so failed bounds trigger failover
        validate_and_normalize_skills(out.skills, catalog=cat)
        return out

    try:
        llm_out, successful_provider = run_with_failover(
            step_name="role_builder",
            make_call=_make_call,
            chain=active_providers,
        )
        valid_skills = validate_and_normalize_skills(llm_out.skills, catalog=cat)
        sorted_skills = sorted(valid_skills, key=lambda s: s.importance, reverse=True)
        top_skills = [s.skill_name for s in sorted_skills[:5]]

        role_detail = RoleDetail(
            role_id=role_id,
            title=title,
            version="custom",
            description=description,
            skill_count=len(valid_skills),
            top_skills=top_skills,
            is_custom=True,
            market_update_available=False,
            skills=valid_skills,
        )
        meta = Meta(
            llm_provider=successful_provider,  # type: ignore[arg-type]
            llm_used=True,
            fallback_used=False,
        )
        return role_detail, meta

    except Exception as exc:
        logger.warning(
            "RoleBuilder LLM execution failed (%s). Falling back to nearest curated role.",
            exc,
        )
        role_detail = _run_fallback()
        meta = Meta(llm_provider="none", llm_used=False, fallback_used=True)
        return role_detail, meta
