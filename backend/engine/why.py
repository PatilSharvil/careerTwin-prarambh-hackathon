"""Structured Why facts builder for explainability per SPEC §10.2 & §12.

Builds structured rationale linking calibration, gap, priority, unblocks,
and interest match into a verified explanation.
"""
from __future__ import annotations

from typing import Sequence
from engine.models import PriorityLabel, SkillRef, Why
from engine.narrative import generate_template_narrative


def build_why(
    skill_name: str,
    role_title: str,
    level: float,
    target: float,
    gap: float,
    importance: float,
    priority: int,
    priority_label: PriorityLabel,
    unblocks: Sequence[SkillRef] | None = None,
    interest_match: bool = False,
    evidence_snippet: str | None = None,
    user_interests: Sequence[str] | None = None,
) -> Why:
    """Construct structured Why model populated with facts and template narrative."""
    unblocks_list = list(unblocks or [])
    narrative = generate_template_narrative(
        skill_name=skill_name,
        priority_label=priority_label,
        level=level,
        target=target,
        role_title=role_title,
        unblocks=unblocks_list,
        interest_match=interest_match,
        user_interests=user_interests,
    )

    return Why(
        level=round(level, 1),
        target=round(target, 1),
        gap=round(gap, 1),
        importance=round(importance, 2),
        priority=priority,
        priority_label=priority_label,
        unblocks=unblocks_list,
        interest_match=interest_match,
        evidence_snippet=evidence_snippet,
        narrative=narrative,
        narrative_source="template",
    )
