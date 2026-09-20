"""Demo runner for initial analysis pipeline per SPEC §5.3.

Usage:
    python -m scripts.demo_pipeline --persona p1
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from agents.pipeline import run_analysis
from app.schemas import ProfileInput, SelfSkillInput


def resolve_persona_file(persona_arg: str) -> Path:
    """Resolve persona argument to a valid json file path."""
    personas_dir = backend_dir / "data" / "personas"
    if persona_arg.endswith(".json"):
        p = personas_dir / persona_arg
        if p.exists():
            return p

    # Match prefix like p1 or p1_strong_python_weak_deployment
    for f in sorted(personas_dir.glob("*.json")):
        if f.stem == persona_arg or f.stem.startswith(f"{persona_arg}_"):
            return f

    # Fallback to default p1
    return personas_dir / "p1_strong_python_weak_deployment.json"


async def main() -> None:
    parser = argparse.ArgumentParser(description="CareerTwin Pipeline Demo")
    parser.add_argument("--persona", default="p1", help="Persona identifier (e.g. p1, p2)")
    parser.add_argument("--provider", default="none", help="LLM provider to test (default: none)")
    args = parser.parse_args()

    persona_file = resolve_persona_file(args.persona)
    with open(persona_file, "r", encoding="utf-8") as f:
        persona_data = json.load(f)

    print("=" * 80)
    print(f"RUNNING INITIAL ANALYSIS PIPELINE FOR: {persona_data.get('name')}")
    print(f"Target Role : {persona_data.get('role_id', 'genai_engineer')}")
    print(f"File Source : {persona_file.name}")
    print("=" * 80)

    form_input = ProfileInput(
        education={"degree": "B.Tech CSE", "year": 2024},
        experience_years=float(persona_data.get("experience_years", 2.0)),
        interests=persona_data.get("interests", []),
        self_skills=[
            SelfSkillInput(name=s["skill_id"], self=float(s.get("self", 5.0)))
            for s in persona_data.get("skills", [])
        ],
        resume_text=None,
    )

    # Use specified provider or 'none' for dry-run
    chain = [args.provider] if args.provider != "none" else ["none"]

    result = await run_analysis(
        resume_text=None,
        form_data=form_input,
        role_id=persona_data.get("role_id", "genai_engineer"),
        weekly_hours=float(persona_data.get("weekly_hours", 10)),
        deadline_weeks=int(persona_data.get("deadline_weeks", 12)),
        chain=chain,
    )

    print("\n1. EXTRACTED & CALIBRATED SKILLS:")
    print("-" * 80)
    print(f"{'SKILL':<24} | {'LEVEL':<6} | {'SOURCE':<12} | {'FLAG':<12} | {'SNIPPET'}")
    print("-" * 80)
    for s in result.analysis.gaps[:5]:
        print(f"{s.skill_id:<24} | {s.level:<6.1f} | {'calibrated':<12} | {str(s.flag):<12} | -")

    print("\n2. TOP 5 GAPS BY PRIORITY:")
    print("-" * 80)
    print(f"{'SKILL':<24} | {'LEVEL':<6} | {'TARGET':<6} | {'PRIORITY':<8} | {'LABEL':<10} | {'STATUS'}")
    print("-" * 80)
    for g in result.analysis.gaps[:5]:
        print(f"{g.skill_id:<24} | {g.level:<6.1f} | {g.target:<6.1f} | {g.priority:<8} | {g.priority_label:<10} | {g.status}")

    print("\n3. FIRST 3 ROADMAP ITEMS WITH NARRATIVES:")
    print("-" * 80)
    for it in result.roadmap.items[:3]:
        narrative = it.why.narrative if it.why else "Capstone milestone."
        source = it.why.narrative_source if it.why else "template"
        print(f"\nItem #{it.position}: {it.skill_name} ({it.phase} Phase, W{it.week_start}..W{it.week_end}, {it.hours:.1f}h)")
        print(f"Narrative [{source}]: {narrative}")

    print("\n4. EXECUTION METADATA:")
    print("-" * 80)
    print(f"LLM Provider  : {result.meta.llm_provider}")
    print(f"LLM Used      : {result.meta.llm_used}")
    print(f"Fallback Used : {result.meta.fallback_used}")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
