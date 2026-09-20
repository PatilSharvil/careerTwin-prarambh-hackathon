"""Tests for CareerTwin Career Engine Core.

Tests deterministic calibration, gap math, priority scoring, dependency impact,
readiness calculations, and persona evaluations.
"""
import pytest
from engine.calibrate import calibrate_skill_level, calibrate_profile
from engine.catalog import Catalog
from engine.gaps import compute_gaps_and_strengths, analyze_gaps
from engine.readiness import compute_readiness
from engine.models import (
    ProfileSkillState,
    ProfileState,
    Role,
    RoleSkill,
    Skill,
    SkillPrerequisite,
)


# =====================================================================
# 1. Calibration Tests (4 cases: both, evidence-only, self-only, unverified flag)
# =====================================================================
def test_calibration_both():
    """Case 1: Both evidence and self rating provided.

    level = 0.6 * evidence + 0.4 * self
    For evidence=6.0, self=8.0:
    level = 0.6 * 6.0 + 0.4 * 8.0 = 3.6 + 3.2 = 6.8
    """
    state = calibrate_skill_level(
        skill_id="python",
        skill_name="Python",
        self_rating=8.0,
        evidence_rating=6.0,
    )
    assert state.level == 6.8
    assert state.source == "resume+self"
    assert state.flag is None


def test_calibration_evidence_only():
    """Case 2: Evidence only.

    level = evidence
    """
    state = calibrate_skill_level(
        skill_id="docker",
        skill_name="Docker",
        self_rating=None,
        evidence_rating=5.0,
    )
    assert state.level == 5.0
    assert state.source == "resume"
    assert state.flag is None


def test_calibration_self_only():
    """Case 3: Self rating only.

    level = self * 0.7 (unverified self-claim discounted)
    For self=7.0:
    level = 7.0 * 0.7 = 4.9
    """
    state = calibrate_skill_level(
        skill_id="fastapi",
        skill_name="FastAPI",
        self_rating=7.0,
        evidence_rating=None,
    )
    assert state.level == 4.9
    assert state.source == "self"


def test_calibration_unverified_flag():
    """Case 4: Unverified flag triggered when self - evidence >= 3."""
    state = calibrate_skill_level(
        skill_id="rag",
        skill_name="RAG",
        self_rating=8.0,
        evidence_rating=4.0,  # 8.0 - 4.0 = 4.0 >= 3
    )
    # level = 0.6 * 4.0 + 0.4 * 8.0 = 2.4 + 3.2 = 5.6
    assert state.level == 5.6
    assert state.flag == "unverified"


def test_calibration_override():
    """User manual override takes precedence."""
    state = calibrate_skill_level(
        skill_id="python",
        skill_name="Python",
        self_rating=5.0,
        evidence_rating=5.0,
        override_level=9.5,
    )
    assert state.level == 9.5
    assert state.source == "override"


# =====================================================================
# 2. Gap Math with Hand-Computed Example
# =====================================================================
def test_gap_math_hand_computed_example():
    """Hand-computed example:

    Role has 2 skills:
      1. embeddings: importance = 0.8, target = 6.0, tags = ['nlp', 'search']
      2. vector_db:  importance = 0.9, target = 6.0, tags = ['vdb', 'search']
         vector_db has prerequisite 'embeddings' (min_level=4)

    User profile:
      - embeddings: level = 2.0 -> gap = 6.0 - 2.0 = 4.0
      - vector_db:  level = 1.0 -> gap = 6.0 - 1.0 = 5.0
      - interests = ['search']

    Calculations:
      1. Dependents with gap > 0:
         vector_db is dependent on embeddings, and gap(vector_db)=5.0 > 0.
         importance(vector_db) = 0.9.
         For embeddings:
           dependency_impact = 1 + 0.5 * 0.9 = 1.45
         For vector_db:
           no dependents in role -> dependency_impact = 1.0

      2. Interest boost:
         embeddings.tags ('search') in interests ('search') -> interest_boost = 1.2
         vector_db.tags ('search') in interests ('search') -> interest_boost = 1.2

      3. Raw priority:
         raw_priority(embeddings) = 0.8 * 4.0 * 1.45 * 1.2 = 5.568
         raw_priority(vector_db)  = 0.9 * 5.0 * 1.0 * 1.2  = 5.400
         max_raw = 5.568

      4. Relative Priority (0-100):
         priority(embeddings) = round(100 * 5.568 / 5.568) = 100 -> Critical (>=75)
         priority(vector_db)  = round(100 * 5.400 / 5.568) = round(96.98) = 97 -> Critical (>=75)
    """
    skill_embeddings = Skill(
        id="embeddings",
        name="Text Embeddings",
        category="GenAI",
        tags=["nlp", "search"],
        prerequisites=[],
    )
    skill_vector_db = Skill(
        id="vector_db",
        name="Vector DB",
        category="GenAI",
        tags=["vdb", "search"],
        prerequisites=[SkillPrerequisite(skill="embeddings", min_level=4.0)],
    )
    role = Role(
        role_id="custom_search_eng",
        title="Search Engineer",
        version="2026.09",
        skills=[
            RoleSkill(skill="embeddings", importance=0.8, target=6.0),
            RoleSkill(skill="vector_db", importance=0.9, target=6.0),
        ],
    )
    profile = ProfileState(
        skills={
            "embeddings": ProfileSkillState(
                skill_id="embeddings", skill_name="Text Embeddings", level=2.0, source="self"
            ),
            "vector_db": ProfileSkillState(
                skill_id="vector_db", skill_name="Vector DB", level=1.0, source="self"
            ),
        }
    )

    catalog = Catalog(skills=[skill_embeddings, skill_vector_db], roles=[role])
    analysis = analyze_gaps(profile, role, interests=["search"], catalog=catalog)

    assert len(analysis.gaps) == 2
    gap_map = {g.skill_id: g for g in analysis.gaps}

    g_emb = gap_map["embeddings"]
    assert g_emb.gap == 4.0
    assert g_emb.dependency_impact == 1.45
    assert g_emb.priority == 100
    assert g_emb.priority_label == "Critical"
    assert len(g_emb.unblocks) == 1
    assert g_emb.unblocks[0].skill_id == "vector_db"

    g_vdb = gap_map["vector_db"]
    assert g_vdb.gap == 5.0
    assert g_vdb.dependency_impact == 1.0
    assert g_vdb.priority == 97
    assert g_vdb.priority_label == "Critical"


# =====================================================================
# 3. Dependency Impact Dynamic Behavior
# =====================================================================
def test_dependency_impact_unmet_vs_met():
    """Dependency impact rises when dependents are unmet, and disappears when they are met."""
    skill_a = Skill(id="py", name="Python", category="Foundations", prerequisites=[])
    skill_b = Skill(
        id="api",
        name="FastAPI",
        category="Backend",
        prerequisites=[SkillPrerequisite(skill="py", min_level=5.0)],
    )
    role = Role(
        role_id="dev",
        title="Dev",
        version="2026.09",
        skills=[
            RoleSkill(skill="py", importance=0.8, target=8.0),
            RoleSkill(skill="api", importance=0.9, target=7.0),
        ],
    )
    catalog = Catalog(skills=[skill_a, skill_b], roles=[role])

    # Case A: Dependent 'api' is UNMET (level 2 < target 7) -> gap > 0
    prof_unmet = ProfileState(
        skills={
            "py": ProfileSkillState(skill_id="py", level=4.0, source="self"),
            "api": ProfileSkillState(skill_id="api", level=2.0, source="self"),
        }
    )
    analysis_unmet = analyze_gaps(prof_unmet, role, interests=[], catalog=catalog)
    gap_py_unmet = next(g for g in analysis_unmet.gaps if g.skill_id == "py")
    assert gap_py_unmet.dependency_impact == 1.0 + 0.5 * 0.9  # 1.45

    # Case B: Dependent 'api' is MET (level 7 >= target 7) -> gap == 0
    prof_met = ProfileState(
        skills={
            "py": ProfileSkillState(skill_id="py", level=4.0, source="self"),
            "api": ProfileSkillState(skill_id="api", level=7.0, source="self"),
        }
    )
    analysis_met = analyze_gaps(prof_met, role, interests=[], catalog=catalog)
    gap_py_met = next(g for g in analysis_met.gaps if g.skill_id == "py")
    # Dependent has no gap, so impact is exactly 1.0
    assert gap_py_met.dependency_impact == 1.0


# =====================================================================
# 4. Readiness Boundary Tests
# =====================================================================
def test_readiness_boundaries():
    """Readiness == 100 when all levels >= targets; == 0 when all levels are 0."""
    role = Role(
        role_id="mle",
        title="ML Engineer",
        version="2026.09",
        skills=[
            RoleSkill(skill="python", importance=0.9, target=8.0),
            RoleSkill(skill="ml_fundamentals", importance=0.8, target=7.0),
        ],
    )

    # All 0
    prof_zero = ProfileState(
        skills={
            "python": ProfileSkillState(skill_id="python", level=0.0, source="self"),
            "ml_fundamentals": ProfileSkillState(skill_id="ml_fundamentals", level=0.0, source="self"),
        }
    )
    readiness_0, _ = compute_readiness(prof_zero, role, {})
    assert readiness_0 == 0.0

    # All met or exceeded
    prof_full = ProfileState(
        skills={
            "python": ProfileSkillState(skill_id="python", level=8.0, source="self"),
            "ml_fundamentals": ProfileSkillState(skill_id="ml_fundamentals", level=9.0, source="self"),
        }
    )
    readiness_100, _ = compute_readiness(prof_full, role, {})
    assert readiness_100 == 100.0


# =====================================================================
# 5. Empty-Gap Persona Test
# =====================================================================
def test_empty_gap_persona():
    """Empty-gap persona -> gaps == [] and readiness == 100."""
    catalog = Catalog.from_data_dir()
    role = catalog.get_role("genai_engineer")
    assert role is not None

    # Construct profile with all role skills meeting targets
    skills_state = {}
    for rs in role.skills:
        skills_state[rs.skill] = ProfileSkillState(
            skill_id=rs.skill,
            level=rs.target + 1.0,
            source="resume",
        )
    profile = ProfileState(skills=skills_state)

    analysis = analyze_gaps(profile, role, interests=[], catalog=catalog)
    assert analysis.gaps == []
    assert analysis.readiness == 100.0
    assert len(analysis.strengths) == len(role.skills)


# =====================================================================
# 6. Determinism Test
# =====================================================================
def test_determinism():
    """Same input twice -> identical output."""
    catalog = Catalog.from_data_dir()
    role = catalog.get_role("genai_engineer")
    assert role is not None

    profile = ProfileState(
        skills={
            "python": ProfileSkillState(skill_id="python", level=5.0, source="self"),
            "docker": ProfileSkillState(skill_id="docker", level=2.0, source="self"),
            "rag": ProfileSkillState(skill_id="rag", level=3.0, source="self"),
        }
    )

    out1 = analyze_gaps(profile, role, interests=["LLMs"], catalog=catalog)
    out2 = analyze_gaps(profile, role, interests=["LLMs"], catalog=catalog)

    assert out1.model_dump() == out2.model_dump()
