"""Tests for ChromaDB skill normalization and resource retrieval."""
from __future__ import annotations

import json
from pathlib import Path
import pytest

from rag.normalizer import SkillNormalizer
from rag.retriever import ChromaResourceProvider


@pytest.fixture(scope="session")
def normalizer():
    return SkillNormalizer()


@pytest.fixture(scope="session")
def retriever():
    return ChromaResourceProvider()


# =====================================================================
# 1. Normalization Benchmark (25 queries -> >= 90% top-1 accuracy)
# =====================================================================
def test_skill_normalization_accuracy(normalizer: SkillNormalizer):
    queries_file = Path(__file__).resolve().parent / "data" / "alias_queries.json"
    with open(queries_file, "r", encoding="utf-8") as f:
        cases = json.load(f)

    assert len(cases) >= 25

    correct = 0
    total = len(cases)

    for case in cases:
        query = case["query"]
        expected = case["expected_skill_id"]
        predicted, score = normalizer.normalize(query)

        if predicted == expected:
            correct += 1
        else:
            print(f"FAILED query='{query}': expected={expected}, predicted={predicted}, score={score}")

    hit_rate = correct / total
    print(f"\nNormalization accuracy: {correct}/{total} = {hit_rate:.1%}")
    assert hit_rate >= 0.90, f"Hit rate {hit_rate:.1%} is below 90% target"


# =====================================================================
# 2. Retriever Tests
# =====================================================================
def test_retriever_skill_match_and_level_band(retriever: ChromaResourceProvider):
    """Retrieved activities must always cover the queried skill,

    and the user's level must fall within the activity's level band.
    """
    test_skills = [
        ("python", 5.0),
        ("rag", 4.0),
        ("docker", 3.0),
        ("fastapi", 6.0),
        ("agent_systems", 5.0),
    ]

    for skill_id, level in test_skills:
        activities = retriever.get(skill_id=skill_id, level=level, interests=["backend"], k=3)
        assert len(activities) > 0, f"No activities returned for {skill_id}"

        for act in activities:
            # 1. Activity covers the queried skill
            assert skill_id in act.skills, f"Activity {act.activity_id} does not contain {skill_id}"
            # 2. User level is within the activity band (with +-1 allowance if widened)
            assert (act.level_from - 1.0) <= level <= (act.level_to + 1.0), (
                f"Level {level} outside band [{act.level_from}, {act.level_to}] for {act.activity_id}"
            )


def test_retriever_capstone_lookup(retriever: ChromaResourceProvider):
    """Retriever correctly resolves the dedicated capstone project for a role."""
    capstone = retriever.get_capstone("genai_engineer")
    assert capstone is not None
    assert capstone.capstone_for == "genai_engineer"
    assert "rag" in capstone.skills
    assert "agent_systems" in capstone.skills
