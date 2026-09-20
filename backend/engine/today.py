"""Today priority action recommendation per SPEC §7.7.

Algorithm:
- First `available` (prereqs met) item in roadmap order.
- Prefer an uncompleted activity with hours <= 2.
- minutes = clamp(round(hours * 60), 60, 120).
- reasons[] built deterministically from Why facts.
- Returns None when everything is done or no available items exist.
"""
from __future__ import annotations

from engine.models import Roadmap, TodayPick


def get_today_pick(roadmap: Roadmap) -> TodayPick | None:
    """Select today's high-impact learning recommendation."""
    # Find first available item in roadmap order
    candidate_item = None
    for it in roadmap.items:
        if it.status == "available" and it.skill_id and it.why:
            candidate_item = it
            break

    if not candidate_item or not candidate_item.why:
        return None

    # Choose an uncompleted activity, preferring hours <= 2
    chosen_activity = None
    uncompleted = [a for a in candidate_item.activities if not a.completed]
    short_activities = [a for a in uncompleted if a.hours <= 2.0]

    if short_activities:
        chosen_activity = short_activities[0]
    elif uncompleted:
        chosen_activity = uncompleted[0]
    elif candidate_item.activities:
        chosen_activity = candidate_item.activities[0]

    if not chosen_activity:
        return None

    # Minutes clamped between 60 and 120
    raw_minutes = round(chosen_activity.hours * 60)
    minutes = max(60, min(120, raw_minutes))

    why = candidate_item.why
    reasons: list[str] = [
        f"Target skill: {candidate_item.skill_name} (Priority {why.priority} — {why.priority_label})",
    ]
    if why.unblocks:
        unblock_names = ", ".join(u.skill_name for u in why.unblocks)
        reasons.append(f"Unblocks {len(why.unblocks)} key milestone(s): {unblock_names}")
    if why.interest_match:
        reasons.append("Directly matches your stated career interests")
    reasons.append(f"Fits a focused {minutes}-minute learning session ({chosen_activity.title})")

    return TodayPick(
        item_id=candidate_item.item_id,
        skill_id=candidate_item.skill_id,
        skill_name=candidate_item.skill_name,
        activity=chosen_activity,
        minutes=minutes,
        why=why,
        reasons=reasons,
    )
