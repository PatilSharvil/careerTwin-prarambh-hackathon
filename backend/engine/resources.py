"""Resource providers for learning activities and capstone projects.

Defines the ResourceProvider Protocol and a fast, deterministic JsonResourceProvider
reading directly from backend/data/resources.json.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Protocol, Sequence
from engine.models import Activity


class ResourceProvider(Protocol):
    """Protocol for fetching curated learning resources for skills and capstones."""

    def get(
        self,
        skill_id: str,
        level: float,
        interests: Sequence[str] | None = None,
        k: int = 3,
    ) -> list[Activity]:
        ...

    def get_capstone(self, role_id: str) -> Activity | None:
        ...


class JsonResourceProvider:
    """In-memory resource provider filtering resources.json by skill and level band."""

    def __init__(self, activities: Sequence[Activity] | None = None) -> None:
        self.activities: list[Activity] = list(activities or [])

    @classmethod
    def from_data_dir(cls, data_dir: Path | str | None = None) -> JsonResourceProvider:
        """Load activities from resources.json in the data directory."""
        if data_dir is None:
            data_path = Path(__file__).resolve().parent.parent / "data"
        else:
            data_path = Path(data_dir)

        res_file = data_path / "resources.json"
        activities: list[Activity] = []
        if res_file.exists():
            with open(res_file, "r", encoding="utf-8") as f:
                raw = json.load(f)
                for item in raw:
                    activities.append(Activity.model_validate(item))

        return cls(activities=activities)

    def get(
        self,
        skill_id: str,
        level: float,
        interests: Sequence[str] | None = None,
        k: int = 3,
    ) -> list[Activity]:
        """Retrieve curated activities for a skill around the user's level.

        Diversifies by including at least 1 course/doc and 1 project when available.
        """
        # Filter all resources matching skill
        candidates = [a for a in self.activities if skill_id in a.skills and not a.capstone_for]
        if not candidates:
            return []

        # Try exact level band: level_from <= level <= level_to
        matching = [a for a in candidates if a.level_from <= level <= a.level_to]

        # If too few, widen band by 1 level
        if len(matching) < k:
            matching = [a for a in candidates if (a.level_from - 1.0) <= level <= (a.level_to + 1.0)]

        # If still too few, take all candidates
        if len(matching) < k:
            matching = candidates

        # Diversify: separate into courses/docs vs projects
        learn_types = [a for a in matching if a.type in ("course", "doc", "certification")]
        project_types = [a for a in matching if a.type == "project"]

        chosen: list[Activity] = []
        if learn_types:
            chosen.append(learn_types[0])
        if project_types:
            chosen.append(project_types[0])

        # Fill remaining slots up to k
        for a in matching:
            if a not in chosen:
                chosen.append(a)
            if len(chosen) >= k:
                break

        return chosen

    def get_capstone(self, role_id: str) -> Activity | None:
        """Find the designated capstone project for a specific target role."""
        for a in self.activities:
            if a.capstone_for == role_id:
                return a
        return None
