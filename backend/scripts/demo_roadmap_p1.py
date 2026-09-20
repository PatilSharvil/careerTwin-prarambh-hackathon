"""Demonstration runner for Phase B3.

Evaluates persona p1 against genai_engineer, prints its roadmap,
then completes 'rag' and prints the full resulting diff.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from engine.calibrate import calibrate_profile
from engine.catalog import Catalog
from engine.replan import complete_skill
from engine.resources import JsonResourceProvider
from engine.roadmap import build_roadmap


def main() -> None:
    catalog = Catalog.from_data_dir()
    resource_provider = JsonResourceProvider.from_data_dir()

    p1_file = backend_dir / "data" / "personas" / "p1_strong_python_weak_deployment.json"
    with open(p1_file, "r", encoding="utf-8") as f:
        p1_data = json.load(f)

    role = catalog.get_role("genai_engineer")
    assert role is not None, "Role genai_engineer not found"

    profile = calibrate_profile(p1_data, catalog=catalog)

    print("=" * 90)
    print(f"INITIAL ROADMAP: {p1_data['name']} -> {role.title}")
    print("=" * 90)

    roadmap = build_roadmap(
        profile_state=profile,
        role=role,
        interests=p1_data.get("interests", []),
        weekly_hours=p1_data.get("weekly_hours", 10),
        deadline_weeks=p1_data.get("deadline_weeks", 12),
        catalog=catalog,
        resource_provider=resource_provider,
    )

    print(f"Total Weeks: {roadmap.total_weeks} (Deadline: {roadmap.deadline_weeks} weeks) | Total Hours: {roadmap.total_hours}h")
    print(f"Weekly Budget: {roadmap.weekly_hours}h/week | Phases: {', '.join(roadmap.phases)}")
    print("-" * 90)
    print(f"{'POS':<4} | {'WEEKS':<10} | {'SKILL NAME':<32} | {'HOURS':<6} | {'STATUS':<11} | {'PHASE'}")
    print("-" * 90)

    for item in roadmap.items:
        week_str = f"W{item.week_start}..W{item.week_end}" if item.week_start != item.week_end else f"W{item.week_start}"
        if item.stretch:
            week_str += " (stretch)"
        name_str = item.skill_name + (" *" if item.is_capstone else "")
        print(f"{item.position:<4} | {week_str:<10} | {name_str:<32} | {item.hours:<6.1f} | {item.status:<11} | {item.phase}")

    print("\n" + "=" * 90)
    print("ACTION: User completes 'rag' (Retrieval-Augmented Generation)")
    print("=" * 90)

    new_profile, new_roadmap, diff = complete_skill(
        profile_state=profile,
        skill_id="rag",
        role=role,
        catalog=catalog,
        resource_provider=resource_provider,
    )

    print(f"Trigger: {diff.trigger.type} (skill: {diff.trigger.skill_id} - {diff.trigger.skill_name})")
    print(f"Readiness Change: {diff.readiness_before:.1f}% -> {diff.readiness_after:.1f}% (+{diff.readiness_after - diff.readiness_before:.1f}%)")

    print("\nLevel Changes:")
    for lc in diff.level_changes:
        print(f"  - {lc.skill_name} ({lc.skill_id}): {lc.from_:.1f} -> {lc.to:.1f}")

    print("\nUnlocked Milestones:")
    if diff.unlocked:
        for u in diff.unlocked:
            print(f"  - {u.skill_name} ({u.skill_id})")
    else:
        print("  - None")

    print("\nRemoved Items (no longer needed):")
    if diff.removed:
        for rm in diff.removed:
            print(f"  - {rm.skill_name} ({rm.item_id}): {rm.reason}")
    else:
        print("  - None")

    print("\nReordered Items:")
    if diff.reordered:
        for ro in diff.reordered:
            print(f"  - {ro.skill_name}: Position {ro.from_position} -> {ro.to_position}")
    else:
        print("  - None")

    print("\nReprioritized Items (|delta| >= 5):")
    if diff.reprioritized:
        for rp in diff.reprioritized:
            print(f"  - {rp.skill_name}: Priority {rp.from_priority} -> {rp.to_priority}")
    else:
        print("  - None")

    print("\nDeterministic Diff Facts:")
    for fact in diff.facts:
        print(f"  * {fact}")


if __name__ == "__main__":
    main()
