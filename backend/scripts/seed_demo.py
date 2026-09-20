"""Seed the demo user's profile from persona p1 (Alex Chen).

Enables POST /analyze to work immediately without manual profile creation.
"""
from __future__ import annotations

import json
from pathlib import Path

from app.config import settings
from app.schemas import EducationInput, Profile, ProfileSkill
from engine.calibrate import calibrate_skill_level
from engine.catalog import Catalog
from store.db import init_db
from store.repo import save_profile


def seed_demo_profile(user_id: str = "demo") -> Profile:
    """Create and save the demo user profile from persona p1."""
    init_db()
    cat = Catalog.from_data_dir()

    persona_path = (
        Path(__file__).resolve().parent.parent
        / "data"
        / "personas"
        / "p1_strong_python_weak_deployment.json"
    )
    with open(persona_path, "r", encoding="utf-8") as f:
        p1 = json.load(f)

    profile_skills: list[ProfileSkill] = []
    for item in p1["skills"]:
        sid = item["skill_id"]
        sk = cat.get_skill(sid)
        s_name = sk.name if sk else sid
        self_lvl = item.get("self")
        ev_lvl = item.get("evidence")

        calibrated = calibrate_skill_level(
            skill_id=sid,
            skill_name=s_name,
            self_rating=self_lvl,
            evidence_rating=ev_lvl,
        )

        profile_skills.append(
            ProfileSkill(
                skill_id=sid,
                skill_name=s_name,
                self=self_lvl,
                evidence=ev_lvl,
                level=calibrated.level,
                flag=calibrated.flag,
                snippet=calibrated.snippet,
                source=calibrated.source,
            )
        )

    profile = Profile(
        education=EducationInput(degree="B.S. Computer Science", year=2022),
        experience_years=float(p1.get("experience_years", 3.0)),
        interests=list(p1.get("interests", ["LLMs", "backend", "python"])),
        weekly_hours=float(p1.get("weekly_hours", 10)),
        deadline_weeks=int(p1.get("deadline_weeks", 12)),
        target_role_id=p1.get("role_id", "genai_engineer"),
        skills=profile_skills,
        unmapped_skills=[],
    )

    save_profile(user_id, profile.model_dump())
    if settings.DEFAULT_USER_ID != user_id:
        save_profile(settings.DEFAULT_USER_ID, profile.model_dump())

    print(f"Successfully seeded demo profile for user '{user_id}' with {len(profile_skills)} skills.")
    return profile


if __name__ == "__main__":
    seed_demo_profile()
