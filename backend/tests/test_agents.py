"""Tests for ADK agents, pipeline, explainability validation, and deterministic fallbacks.

All tests run offline using monkeypatched models / mocks without network dependencies.
"""
from __future__ import annotations

import json
import uuid
from unittest.mock import MagicMock, patch
import pytest

from agents.explainer_agent import explain_items
from agents.pipeline import run_analysis
from agents.profile_agent import extract_profile, heuristic_profile
from agents.validator import validate_narrative_numbers
from app.schemas import ProfileInput, SelfSkillInput
from engine.models import RoadmapItem, Why
from store.repo import cache_get


# =====================================================================
# 1. ProfileAgent Tests
# =====================================================================
@pytest.mark.asyncio
async def test_profile_valid_json_normalized_skills():
    """Valid LLM JSON output extracts and normalizes skills properly."""
    fake_llm_json = json.dumps(
        {
            "education": {"degree": "B.Tech Computer Science", "year": 2023},
            "experience_years": 2.0,
            "interests": ["GenAI", "LLMs"],
            "skills": [
                {"skill_name": "Python 3", "evidence_level": 8.0, "snippet": "Built python backend"},
                {"skill_name": "Docker Containers", "evidence_level": 6.0, "snippet": "Dockerized microservices"},
            ],
        }
    )

    form_input = ProfileInput(
        education={"degree": "B.Tech Computer Science", "year": 2023},
        experience_years=2.0,
        interests=["GenAI"],
        self_skills=[SelfSkillInput(name="Python", self=9.0)],
        resume_text="Senior python engineer working with docker.",
    )

    with patch("litellm.completion") as mock_comp:
        mock_choice = MagicMock()
        mock_choice.message.content = fake_llm_json
        mock_comp.return_value = MagicMock(choices=[mock_choice])

        profile, meta = await extract_profile(
            resume_text=form_input.resume_text,
            form_data=form_input,
            chain=["gemini"],
        )

        assert meta.llm_used is True
        assert meta.fallback_used is False
        assert meta.llm_provider == "gemini"

        skill_ids = [s.skill_id for s in profile.skills]
        assert "python" in skill_ids
        assert "docker" in skill_ids

        py_skill = next(s for s in profile.skills if s.skill_id == "python")
        # 0.6 * 8.0 + 0.4 * 9.0 = 4.8 + 3.6 = 8.4
        assert py_skill.level == 8.4
        assert py_skill.source == "resume+self"


@pytest.mark.asyncio
async def test_profile_garbage_twice_heuristic_fallback():
    """Garbage LLM output twice triggers deterministic heuristic fallback."""
    form_input = ProfileInput(
        education={"degree": "B.S.", "year": 2022},
        experience_years=3.0,
        interests=["search"],
        self_skills=[],
        resume_text="Extensive experience building apps with FastAPI, PostgreSQL, and Docker.",
    )

    with patch("litellm.completion", side_effect=ValueError("SyntaxError: Non-JSON response")):
        profile, meta = await extract_profile(
            resume_text=form_input.resume_text,
            form_data=form_input,
            chain=["groq"],
        )

        assert meta.llm_used is False
        assert meta.fallback_used is True
        assert meta.llm_provider == "none"

        skill_ids = [s.skill_id for s in profile.skills]
        assert "fastapi" in skill_ids
        assert "docker" in skill_ids
        assert "databases_postgres" in skill_ids


@pytest.mark.asyncio
async def test_profile_unknown_skill_lands_in_unmapped():
    """Skills mentioned in resume or self-claims that do not match knowledge base land in unmapped_skills."""
    fake_llm_json = json.dumps(
        {
            "education": {"degree": "B.S.", "year": 2022},
            "experience_years": 1.0,
            "interests": [],
            "skills": [
                {"skill_name": "Fortran77", "evidence_level": 7.0, "snippet": "Maintained legacy code"},
                {"skill_name": "Python", "evidence_level": 7.0, "snippet": "Built web app"},
            ],
        }
    )

    form_input = ProfileInput(
        education={"degree": "B.S.", "year": 2022},
        experience_years=1.0,
        interests=[],
        self_skills=[SelfSkillInput(name="ObscureLanguageXYZ", self=8.0)],
        resume_text="I know Fortran77 and ObscureLanguageXYZ.",
    )

    with patch("litellm.completion") as mock_comp:
        mock_choice = MagicMock()
        mock_choice.message.content = fake_llm_json
        mock_comp.return_value = MagicMock(choices=[mock_choice])

        profile, meta = await extract_profile(
            resume_text=form_input.resume_text,
            form_data=form_input,
            chain=["openrouter"],
        )

        assert "Fortran77" in profile.unmapped_skills
        assert "ObscureLanguageXYZ" in profile.unmapped_skills
        mapped_ids = [s.skill_id for s in profile.skills]
        assert "python" in mapped_ids


# =====================================================================
# 2. ExplainerAgent & Validator Tests
# =====================================================================
def test_explainer_validation_rejects_hallucinated_number():
    """Validator rejects narratives containing hallucinated/altered numbers."""
    why = Why(
        level=4.0,
        target=7.0,
        gap=3.0,
        importance=0.85,
        priority=80,
        priority_label="Critical",
        unblocks=[],
        interest_match=False,
        evidence_snippet=None,
        narrative="Template narrative.",
        narrative_source="template",
    )

    # Valid: numbers 4.0, 7.0, 80, 10
    valid_text = "Python is Critical priority because your level is 4.0/10 vs ~7.0/10 needed (priority 80)."
    assert validate_narrative_numbers(valid_text, why) is True

    # Hallucinated: introduces 9.5 and 99 which are not in the Why facts
    hallucinated_text = "Python is level 9.5 with priority 99."
    assert validate_narrative_numbers(hallucinated_text, why) is False


def test_explainer_hallucinated_number_triggers_template_fallback():
    """If LLM hallucinates numbers, explanation falls back to template narrative."""
    why = Why(
        level=3.0,
        target=6.0,
        gap=3.0,
        importance=0.7,
        priority=70,
        priority_label="High",
        unblocks=[],
        interest_match=False,
        evidence_snippet=None,
        narrative="Docker is High priority because your level is 3.0/10 vs ~6.0/10 needed.",
        narrative_source="template",
    )

    item = RoadmapItem(
        item_id="rm_docker",
        position=1,
        skill_id="docker",
        skill_name="Docker",
        phase="Applied",
        week_start=1,
        week_end=2,
        hours=10.0,
        status="available",
        stretch=False,
        is_capstone=False,
        combines=[],
        prerequisites=[],
        activities=[],
        completion_criteria=[],
        why=why,
    )

    # LLM hallucinates level 8.8
    fake_resp = json.dumps(
        {
            "explanations": [
                {"item_id": "rm_docker", "narrative": "Docker is level 8.8 out of 10 and very critical."}
            ]
        }
    )

    with patch("litellm.completion") as mock_comp:
        mock_choice = MagicMock()
        mock_choice.message.content = fake_resp
        mock_comp.return_value = MagicMock(choices=[mock_choice])

        results = explain_items(
            items=[item],
            role_title="GenAI Engineer",
            chain=["gemini"],
        )

        narr, source = results["rm_docker"]
        assert source == "template"
        assert narr == why.narrative


def test_explainer_valid_returns_llm_source_and_caches():
    """Valid narrative returns 'llm' source and subsequent call hits cache."""
    why = Why(
        level=4.0,
        target=7.0,
        gap=3.0,
        importance=0.8,
        priority=80,
        priority_label="Critical",
        unblocks=[],
        interest_match=False,
        evidence_snippet=None,
        narrative="Template.",
        narrative_source="template",
    )

    test_id = f"rm_rag_test_{uuid.uuid4().hex[:8]}"
    item = RoadmapItem(
        item_id=test_id,
        position=1,
        skill_id="rag",
        skill_name="RAG",
        phase="Applied",
        week_start=1,
        week_end=2,
        hours=10.0,
        status="available",
        stretch=False,
        is_capstone=False,
        combines=[],
        prerequisites=[],
        activities=[],
        completion_criteria=[],
        why=why,
    )

    valid_narr = "RAG is Critical priority because your level is 4.0/10 vs ~7.0/10 required."
    fake_resp = json.dumps(
        {
            "explanations": [
                {"item_id": test_id, "narrative": valid_narr}
            ]
        }
    )

    with patch("litellm.completion") as mock_comp:
        mock_choice = MagicMock()
        mock_choice.message.content = fake_resp
        mock_comp.return_value = MagicMock(choices=[mock_choice])

        # 1. First call -> executes LLM
        res1 = explain_items([item], "GenAI Engineer", chain=["groq"])
        assert res1[test_id][0] == valid_narr
        assert res1[test_id][1] == "llm"
        assert mock_comp.call_count == 1

        # 2. Second call -> cache hit avoids second LLM call
        res2 = explain_items([item], "GenAI Engineer", chain=["groq"])
        assert res2[test_id][0] == valid_narr
        assert res2[test_id][1] == "llm"
        assert mock_comp.call_count == 1


# =====================================================================
# 3. Pipeline & Failover Order Tests
# =====================================================================
@pytest.mark.asyncio
async def test_pipeline_chain_none_returns_complete_analysis_with_fallback():
    """Pipeline with chain 'none' completes deterministically with fallback_used=True."""
    form_input = ProfileInput(
        education={"degree": "B.Tech", "year": 2024},
        experience_years=2.0,
        interests=["backend"],
        self_skills=[
            SelfSkillInput(name="python", self=7.0),
            SelfSkillInput(name="docker", self=4.0),
        ],
        resume_text="Python and Docker developer.",
    )

    result = await run_analysis(
        resume_text=form_input.resume_text,
        form_data=form_input,
        role_id="genai_engineer",
        chain=["none"],
    )

    assert result.meta.fallback_used is True
    assert result.meta.llm_used is False
    assert result.meta.llm_provider == "none"
    assert len(result.analysis.gaps) > 0
    assert len(result.roadmap.items) > 0


@pytest.mark.asyncio
async def test_failover_order_first_failing_second_used():
    """Provider 1 fails -> Provider 2 succeeds -> meta reports Provider 2."""
    fake_llm_json = json.dumps(
        {
            "education": {"degree": "M.S. AI", "year": 2023},
            "experience_years": 4.0,
            "interests": ["LLMs"],
            "skills": [
                {"skill_name": "Python", "evidence_level": 9.0, "snippet": "Senior Python developer"},
            ],
        }
    )

    form_input = ProfileInput(
        education={"degree": "M.S. AI", "year": 2023},
        experience_years=4.0,
        interests=["LLMs"],
        self_skills=[],
        resume_text="Senior Python developer.",
    )

    call_history: list[str] = []

    def mock_completion_side_effect(*args, **kwargs):
        model = kwargs.get("model", "")
        if "gemini" in model:
            call_history.append("gemini")
            raise ConnectionError("Gemini unavailable")
        elif "groq" in model:
            call_history.append("groq")
            mock_choice = MagicMock()
            mock_choice.message.content = fake_llm_json
            return MagicMock(choices=[mock_choice])
        raise ValueError(f"Unexpected model: {model}")

    with patch("litellm.completion", side_effect=mock_completion_side_effect):
        profile, meta = await extract_profile(
            resume_text=form_input.resume_text,
            form_data=form_input,
            chain=["gemini", "groq"],
        )

        assert meta.llm_used is True
        assert meta.fallback_used is False
        assert meta.llm_provider == "groq"
        assert "gemini" in call_history
        assert "groq" in call_history
