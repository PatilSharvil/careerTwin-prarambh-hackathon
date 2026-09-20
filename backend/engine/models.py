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
NarrativeSource = Literal["llm", "template"]


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


# =====================================================================
# Roadmap, Why, Replan, Diff, Today models (SPEC §10.2)
# =====================================================================


class Prereq(BaseModel):
    """Prerequisite status within a roadmap item."""

    skill_id: str
    skill_name: str
    min_level: float
    met: bool


class Activity(BaseModel):
    """Curated learning resource / activity."""

    activity_id: str = Field(alias="id")
    type: ActivityType
    title: str
    provider: str
    url: str
    hours: float
    level_gain: float
    skills: list[str] = Field(default_factory=list)
    level_from: float = 0.0
    level_to: float = 10.0
    completed: bool = False
    capstone_for: str | None = None

    model_config = {"populate_by_name": True}

    @model_validator(mode="before")
    @classmethod
    def normalize_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "activity_id" in data and "id" not in data:
                data["id"] = data["activity_id"]
            elif "id" in data and "activity_id" not in data:
                data["activity_id"] = data["id"]
        return data


class Why(BaseModel):
    """Structured rationale explaining why a skill is scheduled with its priority."""

    level: float
    target: float
    gap: float
    importance: float
    priority: int
    priority_label: PriorityLabel
    unblocks: list[SkillRef] = Field(default_factory=list)
    interest_match: bool
    evidence_snippet: str | None = None
    narrative: str
    narrative_source: NarrativeSource = "template"


class RoadmapItem(BaseModel):
    """Sequential learning milestone on the career roadmap."""

    item_id: str
    position: int
    skill_id: str | None
    skill_name: str
    phase: Phase
    week_start: int
    week_end: int
    hours: float
    status: SkillStatus
    stretch: bool
    is_capstone: bool = False
    combines: list[SkillRef] = Field(default_factory=list)
    prerequisites: list[Prereq] = Field(default_factory=list)
    activities: list[Activity] = Field(default_factory=list)
    completion_criteria: list[str] = Field(default_factory=list)
    why: Why | None = None


class GraphNode(BaseModel):
    """Node in the roadmap dependency visualization."""

    id: str
    label: str
    status: SkillStatus
    phase: Phase


class GraphEdge(BaseModel):
    """Directed edge in the roadmap dependency graph: prerequisite -> dependent."""

    source: str
    target: str


class RoadmapGraph(BaseModel):
    """Complete DAG representation of the roadmap."""

    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)


class Roadmap(BaseModel):
    """Personalized sequential career preparation roadmap."""

    version: int = 1
    total_weeks: int
    total_hours: float
    deadline_weeks: int
    weekly_hours: int
    phases: list[Phase] = Field(default_factory=list)
    items: list[RoadmapItem] = Field(default_factory=list)
    graph: RoadmapGraph


class TriggerInfo(BaseModel):
    """Action that triggered the replan or diff."""

    type: Literal["complete_skill", "complete_activity", "mark_known", "market_update"]
    skill_id: str | None = None
    skill_name: str | None = None
    activity_id: str | None = None


class LevelChange(BaseModel):
    """Change in a skill level resulting from an action."""

    skill_id: str
    skill_name: str
    from_: float = Field(alias="from")
    to: float

    model_config = {"populate_by_name": True}

    @model_validator(mode="before")
    @classmethod
    def populate_from(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "from_level" in data and "from" not in data:
                data["from"] = data["from_level"]
        return data


class ItemChange(BaseModel):
    """Added or removed roadmap item."""

    item_id: str
    skill_name: str
    reason: str


class ReorderedItem(BaseModel):
    """Item whose schedule position changed."""

    item_id: str
    skill_name: str
    from_position: int
    to_position: int


class ReprioritizedItem(BaseModel):
    """Item whose priority changed noticeably (|delta| >= 5)."""

    skill_id: str
    skill_name: str
    from_priority: int
    to_priority: int


class RequirementChange(BaseModel):
    """Role requirement change resulting from market update."""

    skill_id: str
    skill_name: str
    change: Literal["added", "removed", "importance_changed", "target_changed"]
    from_: float | None = Field(default=None, alias="from")
    to: float | None = None

    model_config = {"populate_by_name": True}

    @model_validator(mode="before")
    @classmethod
    def populate_from(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "from_value" in data and "from" not in data:
                data["from"] = data["from_value"]
        return data


class Diff(BaseModel):
    """Deterministic diff between two roadmap states."""

    trigger: TriggerInfo
    readiness_before: float
    readiness_after: float
    level_changes: list[LevelChange] = Field(default_factory=list)
    unlocked: list[SkillRef] = Field(default_factory=list)
    removed: list[ItemChange] = Field(default_factory=list)
    added: list[ItemChange] = Field(default_factory=list)
    reordered: list[ReorderedItem] = Field(default_factory=list)
    reprioritized: list[ReprioritizedItem] = Field(default_factory=list)
    requirement_changes: list[RequirementChange] = Field(default_factory=list)
    facts: list[str] = Field(default_factory=list)


class TodayPick(BaseModel):
    """Curated single action recommended for today."""

    item_id: str
    skill_id: str
    skill_name: str
    activity: Activity
    minutes: int
    why: Why
    reasons: list[str] = Field(default_factory=list)
