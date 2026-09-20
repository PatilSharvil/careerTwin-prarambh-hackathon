"""ChromaDB-backed ResourceProvider implementing the engine's ResourceProvider protocol per SPEC §9.

Queries ChromaDB collection 'resources' with semantic search, metadata level-band
filtering, fallback band widening, and type diversification (>=1 course/doc, >=1 project).
Guarantees only valid activities from resources.json are returned.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Sequence

from engine.models import Activity
from engine.resources import ResourceProvider
from rag.chroma_client import get_or_create_collection


class ChromaResourceProvider(ResourceProvider):
    """Resource provider backed by ChromaDB semantic search and metadata filtering."""

    def __init__(
        self,
        resources_path: Path | str | None = None,
        chroma_client: Any = None,
    ) -> None:
        if resources_path is None:
            data_file = Path(__file__).resolve().parent.parent / "data" / "resources.json"
        else:
            data_file = Path(resources_path)

        self._resources_by_id: dict[str, Activity] = {}
        self._capstones_by_role: dict[str, Activity] = {}
        self._chroma_client = chroma_client
        self._resources_col = None

        if data_file.exists():
            with open(data_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    act = Activity.model_validate(item)
                    self._resources_by_id[act.activity_id] = act
                    if act.capstone_for:
                        self._capstones_by_role[act.capstone_for] = act

    def _get_collection(self) -> Any:
        if self._resources_col is None:
            self._resources_col = get_or_create_collection("resources", client=self._chroma_client)
        return self._resources_col

    def get(
        self,
        skill_id: str,
        level: float,
        interests: Sequence[str] | None = None,
        k: int = 3,
    ) -> list[Activity]:
        """Retrieve diversified learning activities matching skill_id and level band."""
        interest_str = " ".join(interests or [])
        query_text = f"{skill_id} {interest_str} level {level}".strip()

        matched_activities: list[Activity] = []

        try:
            col = self._get_collection()

            # Query Chroma with metadata filter for skill_id
            results = col.query(
                query_texts=[query_text],
                n_results=10,
                where={"skill_id": skill_id},
                include=["metadatas"],
            )

            seen_res_ids: set[str] = set()
            level_candidates: list[tuple[Activity, float, float]] = []

            if results and results.get("metadatas") and results["metadatas"][0]:
                for meta in results["metadatas"][0]:
                    rid = meta.get("resource_id")
                    if rid and rid not in seen_res_ids and rid in self._resources_by_id:
                        seen_res_ids.add(rid)
                        act = self._resources_by_id[rid]
                        if act.capstone_for:
                            continue
                        lvl_from = float(meta.get("level_from", act.level_from))
                        lvl_to = float(meta.get("level_to", act.level_to))
                        level_candidates.append((act, lvl_from, lvl_to))

            # Filter by level band: level_from <= level <= level_to
            exact_band = [act for act, l_from, l_to in level_candidates if l_from <= level <= l_to]

            # If too few, widen band by +-1
            if len(exact_band) < k:
                exact_band = [act for act, l_from, l_to in level_candidates if (l_from - 1.0) <= level <= (l_to + 1.0)]

            # If still too few, widen by +-2
            if len(exact_band) < k:
                exact_band = [act for act, l_from, l_to in level_candidates if (l_from - 2.0) <= level <= (l_to + 2.0)]

            # Fallback to all candidates for skill
            if len(exact_band) < k:
                exact_band = [act for act, _, _ in level_candidates]

            matched_activities = exact_band

        except Exception:
            pass

        # Fallback to in-memory filter if Chroma returned no results
        if not matched_activities:
            in_memory_matches = [
                a for a in self._resources_by_id.values() if skill_id in a.skills and not a.capstone_for
            ]
            matched_activities = [a for a in in_memory_matches if a.level_from <= level <= a.level_to]
            if len(matched_activities) < k:
                matched_activities = [
                    a for a in in_memory_matches if (a.level_from - 1.0) <= level <= (a.level_to + 1.0)
                ]
            if len(matched_activities) < k:
                matched_activities = in_memory_matches

        # Diversify: at least 1 course/doc and at least 1 project when available
        courses_docs = [a for a in matched_activities if a.type in ("course", "doc", "certification")]
        projects = [a for a in matched_activities if a.type == "project"]

        chosen: list[Activity] = []
        if courses_docs:
            chosen.append(courses_docs[0])
        if projects and projects[0] not in chosen:
            chosen.append(projects[0])

        for a in matched_activities:
            if a not in chosen:
                chosen.append(a)
            if len(chosen) >= k:
                break

        return chosen

    def get_capstone(self, role_id: str) -> Activity | None:
        """Retrieve designated capstone project for role."""
        return self._capstones_by_role.get(role_id)
