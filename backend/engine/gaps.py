"""Deterministic gap analysis, priority ranking, and alignment radar.

Implements SPEC §7.2 & §7.3 pure Python logic:
- gap = max(0, target - level)
- dependency_impact = 1 + 0.5 * sum(importance(d) for d in role_dependents if gap(d) > 0)
- interest_boost = 1.2 if skill.tags ∩ interests else 1.0
- raw_priority = importance * gap * dependency_impact * interest_boost
- relative priority = round(100 * raw_priority / max_raw)
- priority_label: Critical (>=75), High (50-74), Medium (25-49), Low (<25)
- readiness alignment score and top-8 radar
"""
from __future__ import annotations

from typing import Sequence
from engine.catalog import Catalog
from engine.models import (
    Analysis,
    GapItem,
    PriorityLabel,
    ProfileState,
    RadarPoint,
    Role,
    RoleSkill,
    SkillRef,
    SkillStatus,
    Strength,
)
from engine.readiness import READINESS_NOTE, compute_readiness


def compute_gaps_and_strengths(
    profile_state: ProfileState,
    role: Role,
    interests: Sequence[str] | None = None,
    catalog: Catalog | None = None,
) -> tuple[list[GapItem], list[Strength], list[RadarPoint]]:
    """Compute gaps, strengths, and radar points for a given profile and role."""
    user_interests = set(i.lower().strip() for i in (interests or profile_state.interests or []))
    cat = catalog or Catalog.from_data_dir()

    # Pre-index role skills and current levels
    role_skill_map: dict[str, RoleSkill] = {}
    level_map: dict[str, float] = {}
    gap_map: dict[str, float] = {}

    for rs in role.skills:
        sid = rs.skill or rs.skill_id
        role_skill_map[sid] = rs
        prof_skill = profile_state.skills.get(sid)
        lvl = prof_skill.level if prof_skill else 0.0
        level_map[sid] = lvl
        gap_val = max(0.0, round(rs.target - lvl, 1))
        gap_map[sid] = gap_val

    gaps_raw: list[dict] = []
    strengths: list[Strength] = []

    for sid, rs in role_skill_map.items():
        lvl = level_map[sid]
        target = rs.target
        importance = rs.importance
        gap = gap_map[sid]

        cat_skill = cat.get_skill(sid)
        skill_name = cat_skill.name if cat_skill else (rs.skill_name or sid)
        category = cat_skill.category if cat_skill else (rs.category or "General")

        if gap <= 0.0:
            strengths.append(
                Strength(
                    skill_id=sid,
                    skill_name=skill_name,
                    level=lvl,
                    target=target,
                )
            )
            continue

        # Status determination:
        # done: level >= target (already filtered above)
        # locked: any prerequisite has level < prereq.min_level
        # available: prereqs met and level < target
        is_locked = False
        if cat_skill:
            for prereq in cat_skill.prerequisites:
                p_skill = profile_state.skills.get(prereq.skill)
                p_lvl = p_skill.level if p_skill else 0.0
                if p_lvl < prereq.min_level:
                    is_locked = True
                    break

        status: SkillStatus = "locked" if is_locked else "available"

        # Direct dependents in the role that require this skill as a prerequisite
        role_dependents = cat.role_dependents(sid, role)
        unblocks_refs: list[SkillRef] = []
        dep_importance_sum = 0.0

        for dep_id in role_dependents:
            dep_cat_skill = cat.get_skill(dep_id)
            dep_name = dep_cat_skill.name if dep_cat_skill else dep_id
            unblocks_refs.append(SkillRef(skill_id=dep_id, skill_name=dep_name))

            # Only role dependents that still have a gap contribute to dependency_impact
            if gap_map.get(dep_id, 0.0) > 0.0:
                dep_role_skill = role_skill_map.get(dep_id)
                if dep_role_skill:
                    dep_importance_sum += dep_role_skill.importance

        dependency_impact = 1.0 + 0.5 * dep_importance_sum

        # Interest boost: 1.2 if skill.tags ∩ user_interests > 0, else 1.0
        interest_match = False
        if cat_skill:
            skill_tags = set(t.lower().strip() for t in cat_skill.tags)
            if skill_tags & user_interests:
                interest_match = True

        interest_boost = 1.2 if interest_match else 1.0

        raw_priority = importance * gap * dependency_impact * interest_boost

        flag = profile_state.skills[sid].flag if sid in profile_state.skills else None

        gaps_raw.append(
            {
                "skill_id": sid,
                "skill_name": skill_name,
                "category": category,
                "level": lvl,
                "target": target,
                "gap": gap,
                "importance": importance,
                "dependency_impact": dependency_impact,
                "interest_boost": interest_boost,
                "raw_priority": raw_priority,
                "status": status,
                "flag": flag,
                "unblocks": unblocks_refs,
            }
        )

    # Relative normalized priority 0–100 integer
    max_raw = max((item["raw_priority"] for item in gaps_raw), default=0.0)
    gap_items: list[GapItem] = []

    for item in gaps_raw:
        if max_raw > 0:
            rel_priority = round(100.0 * item["raw_priority"] / max_raw)
        else:
            rel_priority = 0

        # Priority label per SPEC §7.2:
        # Critical (>=75) | High (50-74) | Medium (25-49) | Low (<25)
        if rel_priority >= 75:
            priority_label: PriorityLabel = "Critical"
        elif rel_priority >= 50:
            priority_label = "High"
        elif rel_priority >= 25:
            priority_label = "Medium"
        else:
            priority_label = "Low"

        gap_items.append(
            GapItem(
                skill_id=item["skill_id"],
                skill_name=item["skill_name"],
                category=item["category"],
                level=item["level"],
                target=item["target"],
                gap=item["gap"],
                importance=item["importance"],
                dependency_impact=round(item["dependency_impact"], 3),
                raw_priority=item["raw_priority"],
                priority=rel_priority,
                priority_label=priority_label,
                status=item["status"],
                flag=item["flag"],
                unblocks=item["unblocks"],
            )
        )

    # Sort gaps by priority descending, then raw_priority descending
    gap_items.sort(key=lambda g: (g.priority, g.raw_priority, g.importance, g.gap), reverse=True)

    # Radar: Top 8 role skills by (importance * target) descending
    sorted_for_radar = sorted(
        role.skills,
        key=lambda rs: (rs.importance * rs.target, rs.importance),
        reverse=True,
    )
    radar: list[RadarPoint] = []
    for rs in sorted_for_radar[:8]:
        sid = rs.skill or rs.skill_id
        cat_skill = cat.get_skill(sid)
        s_name = cat_skill.name if cat_skill else (rs.skill_name or sid)
        radar.append(
            RadarPoint(
                skill_id=sid,
                skill_name=s_name,
                current=level_map.get(sid, 0.0),
                target=rs.target,
            )
        )

    return gap_items, strengths, radar


def analyze_gaps(
    profile_state: ProfileState,
    role: Role,
    interests: Sequence[str] | None = None,
    catalog: Catalog | None = None,
) -> Analysis:
    """Entry point for full gap and readiness analysis.

    Returns Analysis model matching SPEC §10.2 contract.
    """
    cat = catalog or Catalog.from_data_dir()
    gaps, strengths, radar = compute_gaps_and_strengths(
        profile_state=profile_state,
        role=role,
        interests=interests,
        catalog=cat,
    )

    readiness, category_scores = compute_readiness(
        profile_state=profile_state,
        role=role,
        catalog_skills=cat,
    )

    return Analysis(
        readiness=readiness,
        readiness_note=READINESS_NOTE,
        category_scores=category_scores,
        gaps=gaps,
        strengths=strengths,
        radar=radar,
    )
