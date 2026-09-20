"""Deterministic narrative generator following SPEC §12 template pattern.

Template pattern:
"{Skill} is {priority label} because your level is {level}/10 vs ~{target}/10 needed for {role}.
 It also unblocks {unblocks}. {interest/experience personalization}."
"""
from __future__ import annotations

from typing import Sequence
from engine.models import PriorityLabel, SkillRef


def generate_template_narrative(
    skill_name: str,
    priority_label: PriorityLabel,
    level: float,
    target: float,
    role_title: str,
    unblocks: Sequence[SkillRef] | None = None,
    interest_match: bool = False,
    user_interests: Sequence[str] | None = None,
) -> str:
    """Generate deterministic explanatory narrative grounded strictly in facts."""
    unblocks_list = list(unblocks or [])
    if unblocks_list:
        unblock_names = ", ".join(u.skill_name for u in unblocks_list)
        unblocks_sentence = f" It directly unblocks {unblock_names}."
    else:
        unblocks_sentence = " It is a key requirement for full role readiness."

    interest_sentence = ""
    if interest_match and user_interests:
        matched = [i for i in user_interests]
        interest_sentence = f" This aligns directly with your interests in {', '.join(matched)}."
    elif interest_match:
        interest_sentence = " This aligns with your stated career interests."

    narrative = (
        f"{skill_name} is ranked {priority_label} priority because your calibrated level "
        f"is {level:.1f}/10 vs ~{target:.1f}/10 required for {role_title}."
        f"{unblocks_sentence}{interest_sentence}"
    )
    return narrative
