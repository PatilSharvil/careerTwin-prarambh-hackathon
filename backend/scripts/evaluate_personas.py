"""Evaluate personas against roles using the Career Engine core.

Prints top 5 gaps (skill, level, target, priority, label) and readiness score
for each persona against target roles.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Add backend directory to sys.path so engine can be imported directly
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from engine.calibrate import calibrate_profile
from engine.catalog import Catalog
from engine.gaps import analyze_gaps


def evaluate_persona(catalog: Catalog, persona_path: Path, target_role_id: str) -> None:
    with open(persona_path, "r", encoding="utf-8") as f:
        persona_data = json.load(f)

    persona_name = persona_data.get("name", persona_path.stem)
    role = catalog.get_role(target_role_id)
    if not role:
        print(f"Role {target_role_id} not found in catalog!")
        return

    profile = calibrate_profile(
        profile_data=persona_data,
        catalog=catalog,
    )

    interests = persona_data.get("interests", [])
    analysis = analyze_gaps(profile, role, interests=interests, catalog=catalog)

    print("=" * 80)
    print(f"Persona: {persona_name} ({persona_path.name})")
    print(f"Target Role: {role.title} ({role.role_id})")
    print(f"Readiness Score: {analysis.readiness}% ({analysis.readiness_note})")
    print(f"Category Alignment Scores: {', '.join(f'{cs.category}: {cs.score}%' for cs in analysis.category_scores)}")
    print(f"Total Gaps: {len(analysis.gaps)} | Strengths: {len(analysis.strengths)}")
    print("-" * 80)
    print(f"{'SKILL':<24} | {'LEVEL':<6} | {'TARGET':<6} | {'PRIORITY':<8} | {'LABEL':<10} | {'STATUS'}")
    print("-" * 80)

    top_gaps = analysis.gaps[:5]
    if not top_gaps:
        print("No gaps found! Candidate meets or exceeds all role requirements.")
    else:
        for g in top_gaps:
            print(
                f"{g.skill_id:<24} | {g.level:<6.1f} | {g.target:<6.1f} | {g.priority:<8} | {g.priority_label:<10} | {g.status}"
            )
    print()


def main() -> None:
    catalog = Catalog.from_data_dir()
    personas_dir = Path(__file__).resolve().parent.parent / "data" / "personas"
    persona_files = sorted(personas_dir.glob("*.json"))

    print("\n>>> EVALUATING ALL PERSONAS AGAINST 'genai_engineer' <<<\n")
    for pf in persona_files:
        evaluate_persona(catalog, pf, "genai_engineer")

    print("\n>>> EVALUATING CAREER SWITCHER AGAINST 'backend_engineer' AND 'ml_engineer' <<<\n")
    career_switcher = personas_dir / "p3_backend_dev_transitioning_ml.json"
    if career_switcher.exists():
        evaluate_persona(catalog, career_switcher, "backend_engineer")
        evaluate_persona(catalog, career_switcher, "ml_engineer")


if __name__ == "__main__":
    main()
