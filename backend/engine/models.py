"""Internal Pydantic models for the CareerTwin Career Engine.

Pure Python, zero external service dependencies.
Matches SPEC §10.2 field names and types for easy API mapping.
DO NOT import app.schemas or external agent/database frameworks.
"""
from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field, model_validator

SkillStatus = Literal["locked", "available", "in_progress", "done"]
PriorityLabel = Literal["Critical", "High", "Medium", "Low"]
Phase = Literal["Foundation", "Core", "Applied", "Capstone"]
ActivityType = Literal["course", "project", "doc", "certification"]


class SkillRef(BaseModel):
    """Reference to a skill by id and display name."""

    skill_id: str
    skill_name: str


class SkillPrerequisite(BaseModel):
    """Prerequisite skill requirement."""

    skill: str
    min_level: float = 1.0


class Skill(BaseModel):
    """Curated skill from global DAG (skills.json)."""

    id: str
    name: str
    category: str
    aliases: list[str] = Field(default_factory=list)
    prerequisites: list[SkillPrerequisite] = Field(default_factory=list)
    hours_per_level: int = 10
    tags: list[str] = Field(default_factory=list)
    mastery_criteria: list[str] = Field(default_factory=list)


class RoleSkill(BaseModel):
    """Skill requirement within a role (roles.json)."""

    skill: str = Field(default="", description="Skill id")
    skill_id: str = Field(default="", description="Skill id alias")
    skill_name: str = ""
    category: str = ""
    importance: float
    target: float

    @model_validator(mode="before")
    @classmethod
    def normalize_skill_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            sid = data.get("skill") or data.get("skill_id") or ""
            data["skill"] = sid
            data["skill_id"] = sid
        return data


class Role(BaseModel):
    """Target role profile (roles.json)."""

    role_id: str
    title: str
    version: str = "2026.09"
    description: str = ""
    source: str = ""
    skills: list[RoleSkill] = Field(default_factory=list)


class ProfileSkillState(BaseModel):
    """Calibrated state for a single skill in a user's profile."""

    skill_id: str
    skill_name: str = ""
    self_rating: float | None = Field(default=None, alias="self")
    evidence_rating: float | None = Field(default=None, alias="evidence")
    level: float = 0.0
    flag: Literal["unverified"] | None = None
    snippet: str | None = None
    source: Literal["resume", "self", "resume+self", "override"] = "self"

    model_config = {"populate_by_name": True}

    @model_validator(mode="before")
    @classmethod
    def populate_ratings(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "self_rating" in data and "self" not in data:
                data["self"] = data["self_rating"]
            if "evidence_rating" in data and "evidence" not in data:
                data["evidence"] = data["evidence_rating"]
        return data


class ProfileState(BaseModel):
    """User profile containing skills and optional preferences."""

    education: dict[str, Any] = Field(default_factory=lambda: {"degree": "", "year": None})
    experience_years: float = 0.0
    interests: list[str] = Field(default_factory=list)
    weekly_hours: int = 10
    deadline_weeks: int = 12
    target_role_id: str | None = None
    skills: dict[str, ProfileSkillState] = Field(default_factory=dict)
    unmapped_skills: list[str] = Field(default_factory=list)


class Strength(BaseModel):
    """Skill where current level meets or exceeds the target."""

    skill_id: str
    skill_name: str
    level: float
    target: float


class RadarPoint(BaseModel):
    """Data point for role alignment radar chart."""

    skill_id: str
    skill_name: str
    current: float
    target: float


class CategoryScore(BaseModel):
    """Category alignment sub-score."""

    category: str
    score: float


class GapItem(BaseModel):
    """Skill gap analysis item."""

    skill_id: str
    skill_name: str
    category: str
    level: float
    target: float
    gap: float
    importance: float
    dependency_impact: float
    raw_priority: float = 0.0
    priority: int
    priority_label: PriorityLabel
    status: SkillStatus
    flag: Literal["unverified"] | None = None
    unblocks: list[SkillRef] = Field(default_factory=list)


# Alias Gap to GapItem for exact API contract parity
Gap = GapItem


class Analysis(BaseModel):
    """Complete role gap and readiness analysis output."""

    readiness: float
    readiness_note: str = "Skill-alignment score, not a hiring prediction."
    category_scores: list[CategoryScore] = Field(default_factory=list)
    gaps: list[GapItem] = Field(default_factory=list)
    strengths: list[Strength] = Field(default_factory=list)
    radar: list[RadarPoint] = Field(default_factory=list)
