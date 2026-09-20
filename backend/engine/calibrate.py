"""Deterministic level calibration per SPEC §7.1.

Pure Python logic:
- Resume evidence (ProfileAgent) + self-rating discounting.
- Flags "unverified" if self - evidence >= 3.0.
- Manual user overrides take top precedence with source="override".
"""
from __future__ import annotations

from typing import Any, Mapping
from engine.models import ProfileSkillState, ProfileState


def calibrate_skill_level(
    skill_id: str,
    skill_name: str = "",
    self_rating: float | None = None,
    evidence_rating: float | None = None,
    override_level: float | None = None,
    snippet: str | None = None,
) -> ProfileSkillState:
    """Calibrate skill level based on evidence, self-rating, and manual overrides.

    SPEC §7.1:
    - if evidence and self: level = 0.6*evidence + 0.4*self (source: resume+self)
    - elif evidence: level = evidence (source: resume)
    - elif self: level = self * 0.7 (source: self)
    - else: level = 0.0 (source: self)
    - flag "unverified" if self - evidence >= 3.0
    - override_level takes precedence (source: override)
    - All levels clamped to 0.0 - 10.0 and rounded to 1 decimal place.
    """
    flag: str | None = None
    source: str = "self"

    if override_level is not None:
        level = float(override_level)
        source = "override"
        flag = None
    elif evidence_rating is not None and self_rating is not None:
        level = 0.6 * float(evidence_rating) + 0.4 * float(self_rating)
        source = "resume+self"
        if float(self_rating) - float(evidence_rating) >= 3.0:
            flag = "unverified"
    elif evidence_rating is not None:
        level = float(evidence_rating)
        source = "resume"
        flag = None
    elif self_rating is not None:
        level = float(self_rating) * 0.7
        source = "self"
        flag = None
    else:
        level = 0.0
        source = "self"
        flag = None

    clamped_level = round(max(0.0, min(10.0, level)), 1)

    return ProfileSkillState(
        skill_id=skill_id,
        skill_name=skill_name or skill_id,
        self=self_rating,
        evidence=evidence_rating,
        level=clamped_level,
        flag=flag,  # type: ignore[arg-type]
        snippet=snippet,
        source=source,  # type: ignore[arg-type]
    )


def calibrate_profile(
    profile_data: list[dict[str, Any]] | Mapping[str, Any] | ProfileState,
    skill_overrides: Mapping[str, float] | None = None,
    catalog: Any = None,
) -> ProfileState:
    """Calibrate all skills in a profile input or persona dictionary."""
    overrides = dict(skill_overrides or {})
    skill_states: dict[str, ProfileSkillState] = {}
    interests: list[str] = []
    experience_years: float = 0.0
    weekly_hours: int = 10
    deadline_weeks: int = 12
    education: dict[str, Any] = {"degree": "", "year": None}

    raw_skills: list[dict[str, Any]] = []

    if isinstance(profile_data, ProfileState):
        interests = profile_data.interests
        experience_years = profile_data.experience_years
        weekly_hours = profile_data.weekly_hours
        deadline_weeks = profile_data.deadline_weeks
        education = profile_data.education
        for sid, st in profile_data.skills.items():
            ov = overrides.get(sid)
            if ov is not None:
                calibrated = calibrate_skill_level(
                    skill_id=sid,
                    skill_name=st.skill_name,
                    self_rating=st.self_rating,
                    evidence_rating=st.evidence_rating,
                    override_level=ov,
                    snippet=st.snippet,
                )
                skill_states[sid] = calibrated
            else:
                skill_states[sid] = st
        return ProfileState(
            education=education,
            experience_years=experience_years,
            interests=interests,
            weekly_hours=weekly_hours,
            deadline_weeks=deadline_weeks,
            target_role_id=profile_data.target_role_id,
            skills=skill_states,
            unmapped_skills=profile_data.unmapped_skills,
        )

    if isinstance(profile_data, Mapping):
        interests = profile_data.get("interests", [])
        experience_years = float(profile_data.get("experience_years", 0.0))
        weekly_hours = int(profile_data.get("weekly_hours", 10))
        deadline_weeks = int(profile_data.get("deadline_weeks", 12))
        education = profile_data.get("education", {"degree": "", "year": None})
        skills_field = profile_data.get("skills", [])
        if isinstance(skills_field, list):
            raw_skills = skills_field
        elif isinstance(skills_field, Mapping):
            for k, v in skills_field.items():
                if isinstance(v, Mapping):
                    item = dict(v)
                    item["skill_id"] = k
                    raw_skills.append(item)
    elif isinstance(profile_data, list):
        raw_skills = profile_data

    for item in raw_skills:
        sid = item.get("skill_id") or item.get("id") or item.get("skill") or ""
        if not sid:
            continue
        s_name = item.get("skill_name") or item.get("name") or sid
        if catalog and (not s_name or s_name == sid):
            cat_skill = catalog.get_skill(sid)
            if cat_skill:
                s_name = cat_skill.name

        self_val = item.get("self") if "self" in item else item.get("self_rating")
        evi_val = item.get("evidence") if "evidence" in item else item.get("evidence_rating")
        ov_val = overrides.get(sid, item.get("override_level"))

        calibrated = calibrate_skill_level(
            skill_id=sid,
            skill_name=s_name,
            self_rating=float(self_val) if self_val is not None else None,
            evidence_rating=float(evi_val) if evi_val is not None else None,
            override_level=float(ov_val) if ov_val is not None else None,
            snippet=item.get("snippet"),
        )
        skill_states[sid] = calibrated

    # Apply any overrides for skills not yet present in skill_states
    for sid, ov in overrides.items():
        if sid not in skill_states:
            s_name = sid
            if catalog:
                cat_skill = catalog.get_skill(sid)
                if cat_skill:
                    s_name = cat_skill.name
            skill_states[sid] = calibrate_skill_level(
                skill_id=sid,
                skill_name=s_name,
                override_level=ov,
            )

    return ProfileState(
        education=education,
        experience_years=experience_years,
        interests=interests,
        weekly_hours=weekly_hours,
        deadline_weeks=deadline_weeks,
        skills=skill_states,
    )
