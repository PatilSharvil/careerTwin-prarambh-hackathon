"""Readiness score calculation per SPEC §7.3.

Readiness is a deterministic skill-alignment score, NOT a hiring prediction:
readiness = 100 * sum(importance_s * min(level_s, target_s) / target_s) / sum(importance_s)
Includes category sub-scores (Foundations, ML, GenAI, Deployment, etc.).
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any, Mapping
from engine.models import CategoryScore, ProfileState, Role, Skill

READINESS_NOTE = "Skill-alignment score, not a hiring prediction."


def compute_readiness(
    profile_state: ProfileState,
    role: Role,
    catalog_skills: Any = None,
) -> tuple[float, list[CategoryScore]]:
    """Compute overall readiness score and category sub-scores.

    SPEC §7.3:
    - readiness = 100 * sum(importance_s * min(level_s, target_s) / target_s) / sum(importance_s)
    - Returns (readiness_score, category_scores).
    """
    total_weighted_ratio = 0.0
    total_importance = 0.0

    cat_weighted_ratios: dict[str, float] = defaultdict(float)
    cat_importances: dict[str, float] = defaultdict(float)

    # Resolve skill lookup helper
    def get_category(skill_id: str, default_cat: str) -> str:
        if catalog_skills is not None:
            if hasattr(catalog_skills, "get_skill"):
                sk = catalog_skills.get_skill(skill_id)
                if sk and sk.category:
                    return sk.category
            elif isinstance(catalog_skills, Mapping):
                sk = catalog_skills.get(skill_id)
                if sk:
                    if hasattr(sk, "category") and sk.category:
                        return sk.category
                    elif isinstance(sk, dict) and sk.get("category"):
                        return sk["category"]
        return default_cat or "General"

    for rs in role.skills:
        skill_id = rs.skill or rs.skill_id
        target = rs.target
        importance = rs.importance

        profile_skill = profile_state.skills.get(skill_id)
        current_level = profile_skill.level if profile_skill else 0.0

        if target <= 0:
            ratio = 1.0 if current_level >= target else 0.0
        else:
            ratio = min(current_level, target) / target

        total_weighted_ratio += importance * ratio
        total_importance += importance

        cat = get_category(skill_id, rs.category)
        cat_weighted_ratios[cat] += importance * ratio
        cat_importances[cat] += importance

    if total_importance > 0:
        overall_readiness = round(100.0 * total_weighted_ratio / total_importance, 1)
    else:
        overall_readiness = 0.0

    # Category sub-scores
    category_scores: list[CategoryScore] = []
    for cat in sorted(cat_importances.keys()):
        imp = cat_importances[cat]
        if imp > 0:
            cat_score = round(100.0 * cat_weighted_ratios[cat] / imp, 1)
        else:
            cat_score = 0.0
        category_scores.append(CategoryScore(category=cat, score=cat_score))

    return overall_readiness, category_scores
