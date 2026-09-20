"""Skill normalization using exact alias mapping + Chroma vector similarity per SPEC §9.

Maps resume/query text (e.g. 'Postgres', 'LLM apps', 'vector search') to canonical skill IDs.
Thresholded fallback to None when similarity is below confidence.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from rag.chroma_client import get_or_create_collection


def _clean_text(text: str) -> str:
    """Lowercase and normalize whitespace/punctuation for canonical lookup."""
    cleaned = text.lower().strip()
    cleaned = re.sub(r"[\-_/]", " ", cleaned)
    return " ".join(cleaned.split())


class SkillNormalizer:
    """Normalizes natural language skill mentions to canonical skill IDs."""

    def __init__(
        self,
        skills_path: Path | str | None = None,
        chroma_client: Any = None,
        threshold: float = 0.67,
    ) -> None:
        if skills_path is None:
            data_file = Path(__file__).resolve().parent.parent / "data" / "skills.json"
        else:
            data_file = Path(skills_path)

        self.threshold = threshold
        self._exact_alias_map: dict[str, str] = {}
        self._skills_collection = None
        self._chroma_client = chroma_client

        if data_file.exists():
            with open(data_file, "r", encoding="utf-8") as f:
                skills_data = json.load(f)
                for s in skills_data:
                    sid = s["id"]
                    # Map canonical id
                    self._exact_alias_map[_clean_text(sid)] = sid
                    # Map canonical name
                    self._exact_alias_map[_clean_text(s["name"])] = sid
                    # Map aliases
                    for alias in s.get("aliases", []):
                        self._exact_alias_map[_clean_text(alias)] = sid

    def _get_collection(self) -> Any:
        if self._skills_collection is None:
            self._skills_collection = get_or_create_collection("skills", client=self._chroma_client)
        return self._skills_collection

    def normalize(self, text: str) -> tuple[str | None, float]:
        """Normalize a skill text to canonical skill_id.

        Returns (skill_id, confidence_score). If below threshold or unmapped, returns (None, score).
        """
        cleaned = _clean_text(text)
        if not cleaned:
            return None, 0.0

        # 1. Exact canonical/alias match
        if cleaned in self._exact_alias_map:
            return self._exact_alias_map[cleaned], 1.0

        # Also check without trailing 's' or minor plurals
        if cleaned.endswith("s") and cleaned[:-1] in self._exact_alias_map:
            return self._exact_alias_map[cleaned[:-1]], 1.0

        # 2. Vector search in Chroma
        try:
            col = self._get_collection()
            results = col.query(
                query_texts=[text],
                n_results=1,
                include=["metadatas", "distances"],
            )

            if results and results["ids"] and results["ids"][0]:
                best_id = results["ids"][0][0]
                distance = results["distances"][0][0] if results.get("distances") else 1.0
                # Cosine distance ranges from 0 (identical) to 2 (opposite)
                similarity = max(0.0, min(1.0, 1.0 - (distance / 2.0)))

                if similarity >= self.threshold:
                    return best_id, round(similarity, 3)
                else:
                    return None, round(similarity, 3)
        except Exception:
            pass

        return None, 0.0


_default_normalizer = None


def normalize(text: str) -> tuple[str | None, float]:
    """Convenience functional interface using default singleton normalizer."""
    global _default_normalizer
    if _default_normalizer is None:
        _default_normalizer = SkillNormalizer()
    return _default_normalizer.normalize(text)
