"""ProfileAgent per SPEC §5.2, §5.3, §8, & §10.2.

Extracts structured profile (skills + evidence_level + snippets) from resume text.
Includes deterministic heuristic fallback with alias matching, normalization via Chroma RAG,
and level calibration.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Sequence
from pydantic import BaseModel, Field, model_validator

from app.config import settings
from app.schemas import EducationInput, Meta, Profile, ProfileInput, ProfileSkill, SelfSkillInput
from engine.calibrate import calibrate_skill_level
from engine.catalog import Catalog
from llm.failover import AllProvidersFailed, run_with_failover
from llm.parsing import parse_and_validate
from llm.provider import available_chain, get_model
from rag.normalizer import SkillNormalizer

logger = logging.getLogger("careertwin.agents.profile")

try:
    from google.adk.agents import LlmAgent
except ImportError:
    LlmAgent = None  # type: ignore[assignment,misc]

PROFILE_INSTRUCTION = """You are the CareerTwin ProfileAgent.
Your job is to analyze a candidate's resume text and form submission to extract:
1. Education (degree, graduation year)
2. Total years of professional experience (float)
3. Technical and career interests (list of strings)
4. Extracted technical skills:
   - skill_name: Canonical or standard name of the skill
   - evidence_level: Numerical rating between 0.0 and 10.0 derived ONLY from explicit signals:
     * Mentioned in passing or coursework: 2.0 - 4.0
     * Built 1-2 projects or 1-2 years experience: 5.0 - 6.5
     * Production systems, multiple years, or deep optimizations: 7.0 - 9.0
     * Senior/lead architect with extensive demonstrable impact: 9.0 - 10.0
   - snippet: Exact short excerpt (15 words or fewer) from the text proving this skill level.

STRICT RULES:
- Never list a skill that is not explicitly present in the provided text.
- Return valid JSON matching the ProfileOut schema.
"""


class ExtractedSkill(BaseModel):
    """Single skill extracted from resume text."""

    skill_name: str
    evidence_level: float = Field(default=5.0, ge=0.0, le=10.0)
    snippet: str = Field(default="")

    @model_validator(mode="before")
    @classmethod
    def normalize_extracted_skill(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Normalize skill name from common variants
            if "skill_name" not in data or not data["skill_name"]:
                data["skill_name"] = data.get("skill") or data.get("name") or data.get("skill_title") or ""
            # Normalize evidence level
            if "evidence_level" not in data:
                raw_level = data.get("level") or data.get("rating") or data.get("score") or 5.0
                try:
                    data["evidence_level"] = float(raw_level)
                except (ValueError, TypeError):
                    data["evidence_level"] = 5.0
            # Normalize snippet
            if "snippet" not in data:
                data["snippet"] = str(data.get("quote") or data.get("context") or data.get("snippet") or "")
        return data


class ProfileOut(BaseModel):
    """Structured output from ProfileAgent."""

    education: dict[str, Any] = Field(default_factory=lambda: {"degree": "", "year": None})
    experience_years: float = 0.0
    interests: list[str] = Field(default_factory=list)
    skills: list[ExtractedSkill] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_profile_out(cls, data: Any) -> Any:
        if isinstance(data, list):
            data = {"skills": data}
        elif isinstance(data, dict):
            if "skills" not in data:
                for alt in ("extracted_skills", "skills_list", "technical_skills", "items", "data"):
                    if alt in data and isinstance(data[alt], list):
                        data["skills"] = data[alt]
                        break
            if "education" not in data or not isinstance(data.get("education"), dict):
                edu_raw = data.get("education", {})
                if isinstance(edu_raw, str):
                    data["education"] = {"degree": edu_raw, "year": None}
                elif not isinstance(edu_raw, dict):
                    data["education"] = {"degree": "", "year": None}
        return data


def build_profile_agent(model: Any = None) -> Any:
    """Build tool-free LlmAgent for profile extraction with output_schema."""
    if LlmAgent is None:
        return None
    mdl = model or get_model("gemini")
    return LlmAgent(
        name="ProfileAgent",
        model=mdl,
        instruction=PROFILE_INSTRUCTION,
        output_schema=ProfileOut,
        output_key="profile_out",
        tools=[],
    )


def heuristic_profile(
    resume_text: str | None,
    form_data: ProfileInput | dict[str, Any],
    catalog: Catalog | None = None,
) -> ProfileOut:
    """Deterministic fallback: Extracts skills via alias matching over text.

    Evidence level: 4.0 for single mention, +1.0 per extra mention (max 7.0).
    Snippet: Up to 15 words surrounding the matched text.
    """
    cat = catalog or Catalog.from_data_dir()
    text = (resume_text or "").strip()

    # Form metadata defaults
    if isinstance(form_data, ProfileInput):
        edu = {"degree": form_data.education.degree, "year": form_data.education.year}
        exp_years = form_data.experience_years
        interests = form_data.interests
        self_skills = form_data.self_skills
    else:
        edu_dict = form_data.get("education", {})
        edu = {
            "degree": edu_dict.get("degree", "") if isinstance(edu_dict, dict) else str(edu_dict),
            "year": edu_dict.get("year") if isinstance(edu_dict, dict) else None,
        }
        exp_years = float(form_data.get("experience_years", 0.0))
        interests = list(form_data.get("interests", []))
        self_skills = [
            SelfSkillInput(name=s.get("name", ""), self=float(s.get("self", 5.0)))
            for s in form_data.get("self_skills", [])
        ]

    extracted_skills: list[ExtractedSkill] = []
    seen_skills: set[str] = set()

    if text:
        words = text.split()
        lower_text = text.lower()

        for skill in cat.skills:
            # Check all aliases and canonical name
            names_to_check = [skill.name] + skill.aliases
            matches_count = 0
            best_match_word = ""

            for alias in names_to_check:
                alias_lower = alias.lower()
                pattern = r"\b" + re.escape(alias_lower) + r"\b"
                found = re.findall(pattern, lower_text)
                if found:
                    matches_count += len(found)
                    if not best_match_word:
                        best_match_word = alias

            if matches_count > 0 and skill.id not in seen_skills:
                seen_skills.add(skill.id)
                evidence = min(7.0, 4.0 + (matches_count - 1) * 1.0)

                # Extract <= 15 word snippet around the match
                match_pos = lower_text.find(best_match_word.lower())
                snippet = f"Identified in resume: {best_match_word}"
                if match_pos != -1:
                    char_start = max(0, match_pos - 40)
                    char_end = min(len(text), match_pos + len(best_match_word) + 40)
                    fragment = text[char_start:char_end].strip()
                    frag_words = fragment.split()[:15]
                    snippet = " ".join(frag_words)

                extracted_skills.append(
                    ExtractedSkill(
                        skill_name=skill.name,
                        evidence_level=round(evidence, 1),
                        snippet=snippet,
                    )
                )

    return ProfileOut(
        education=edu,
        experience_years=exp_years,
        interests=interests,
        skills=extracted_skills,
    )


async def extract_profile(
    resume_text: str | None,
    form_data: ProfileInput | dict[str, Any],
    chain: Sequence[str] | None = None,
    catalog: Catalog | None = None,
    normalizer: SkillNormalizer | None = None,
) -> tuple[Profile, Meta]:
    """Extract profile using LLM failover with deterministic heuristic fallback."""
    cat = catalog or Catalog.from_data_dir()
    norm = normalizer or SkillNormalizer()

    providers = list(chain) if chain is not None else available_chain()
    active_providers = [p for p in providers if p.lower() != "none"]

    profile_out: ProfileOut | None = None
    successful_provider: str = "none"
    llm_used = False
    fallback_used = False

    # Extract text from input if resume_text is in form_data
    if not resume_text and isinstance(form_data, ProfileInput):
        resume_text = form_data.resume_text
    elif not resume_text and isinstance(form_data, dict):
        resume_text = form_data.get("resume_text")

    if not active_providers:
        logger.info("No active LLM providers configured. Using heuristic fallback.")
        profile_out = heuristic_profile(resume_text, form_data, catalog=cat)
        fallback_used = True
    else:
        # Prompt for LLM extraction
        prompt = f"""RESUME TEXT:
{resume_text or "No resume text provided."}

FORM INPUT:
{json.dumps(form_data.model_dump() if hasattr(form_data, "model_dump") else form_data)}

Extract the candidate's profile according to instructions. Output valid JSON only."""

        def _make_call(prov: str) -> ProfileOut:
            from llm.provider import get_model
            from llm.parsing import parse_and_validate
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
                {"role": "system", "content": PROFILE_INSTRUCTION},
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
            return parse_and_validate(content, ProfileOut)

        try:
            profile_out, successful_provider = run_with_failover(
                step_name="profile_extraction",
                make_call=_make_call,
                chain=active_providers,
            )
            llm_used = True
        except AllProvidersFailed as exc:
            logger.warning("All LLM providers failed for profile extraction: %s. Using heuristic fallback.", exc)
            profile_out = heuristic_profile(resume_text, form_data, catalog=cat)
            fallback_used = True

    # Process extracted profile output: Normalize skills, merge self_skills, calibrate levels
    if isinstance(form_data, ProfileInput):
        self_skills_list = form_data.self_skills
        weekly_hours = form_data.weekly_hours if hasattr(form_data, "weekly_hours") else 10
        deadline_weeks = form_data.deadline_weeks if hasattr(form_data, "deadline_weeks") else 12
    else:
        self_skills_list = [
            SelfSkillInput(name=s.get("name", ""), self=float(s.get("self", 5.0)))
            for s in form_data.get("self_skills", [])
        ]
        weekly_hours = float(form_data.get("weekly_hours", 10))
        deadline_weeks = int(form_data.get("deadline_weeks", 12))

    # Map form self_skills by normalized name
    self_ratings_by_id: dict[str, float] = {}
    for s_inp in self_skills_list:
        mapped_id, _ = norm.normalize(s_inp.name)
        if mapped_id:
            self_ratings_by_id[mapped_id] = float(s_inp.self)

    profile_skills: list[ProfileSkill] = []
    unmapped_skills: list[str] = []
    seen_canonical_ids: set[str] = set()

    for ext in profile_out.skills:
        canonical_id, conf = norm.normalize(ext.skill_name)
        if not canonical_id:
            unmapped_skills.append(ext.skill_name)
            continue

        if canonical_id in seen_canonical_ids:
            continue
        seen_canonical_ids.add(canonical_id)

        cat_skill = cat.get_skill(canonical_id)
        skill_name = cat_skill.name if cat_skill else ext.skill_name
        self_rating = self_ratings_by_id.get(canonical_id)
        evidence_rating = float(ext.evidence_level)

        calibrated = calibrate_skill_level(
            skill_id=canonical_id,
            skill_name=skill_name,
            self_rating=self_rating,
            evidence_rating=evidence_rating,
            snippet=ext.snippet[:150] if ext.snippet else None,
        )

        profile_skills.append(
            ProfileSkill(
                skill_id=canonical_id,
                skill_name=skill_name,
                self=calibrated.self_rating,
                evidence=calibrated.evidence_rating,
                level=calibrated.level,
                flag=calibrated.flag,
                snippet=calibrated.snippet,
                source=calibrated.source,
            )
        )

    # Process any self_skills from form that were not extracted from resume
    for s_inp in self_skills_list:
        mapped_id, _ = norm.normalize(s_inp.name)
        if not mapped_id:
            if s_inp.name not in unmapped_skills:
                unmapped_skills.append(s_inp.name)
            continue

        if mapped_id not in seen_canonical_ids:
            seen_canonical_ids.add(mapped_id)
            cat_skill = cat.get_skill(mapped_id)
            skill_name = cat_skill.name if cat_skill else s_inp.name
            calibrated = calibrate_skill_level(
                skill_id=mapped_id,
                skill_name=skill_name,
                self_rating=float(s_inp.self),
                evidence_rating=None,
            )
            profile_skills.append(
                ProfileSkill(
                    skill_id=mapped_id,
                    skill_name=skill_name,
                    self=calibrated.self_rating,
                    evidence=None,
                    level=calibrated.level,
                    flag=calibrated.flag,
                    snippet=None,
                    source=calibrated.source,
                )
            )

    edu_dict = profile_out.education
    edu_input = EducationInput(
        degree=edu_dict.get("degree", ""),
        year=edu_dict.get("year"),
    )

    target_role = getattr(form_data, "target_role_id", None)
    if not target_role and isinstance(form_data, dict):
        target_role = form_data.get("target_role_id")

    final_profile = Profile(
        education=edu_input,
        experience_years=profile_out.experience_years,
        interests=profile_out.interests,
        weekly_hours=weekly_hours,
        deadline_weeks=deadline_weeks,
        target_role_id=target_role,
        skills=profile_skills,
        unmapped_skills=unmapped_skills,
    )

    meta = Meta(
        llm_provider=successful_provider,  # type: ignore[arg-type]
        llm_used=llm_used,
        fallback_used=fallback_used,
    )

    return final_profile, meta
