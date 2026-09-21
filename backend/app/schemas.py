from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field

# ---------- shared ----------
Provider = Literal["gemini", "groq", "openrouter", "none"]

class Meta(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    llm_provider: Provider
    llm_used: bool
    fallback_used: bool

SkillStatus = Literal["locked", "available", "in_progress", "done"]
PriorityLabel = Literal["Critical", "High", "Medium", "Low"]
Phase = Literal["Foundation", "Core", "Applied", "Capstone"]
ActivityType = Literal["course", "project", "doc", "certification"]
NarrativeSource = Literal["llm", "template"]

class SkillRef(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    skill_id: str
    skill_name: str

class RoleRef(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    role_id: str
    title: str
    version: str

# ---------- profile ----------
class EducationInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    degree: str
    year: int | None = None

class SelfSkillInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str
    self: float

class ProfileInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    education: EducationInput
    experience_years: float
    interests: list[str]
    self_skills: list[SelfSkillInput]
    resume_text: str | None = None

class ProfileSkill(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    skill_id: str
    skill_name: str
    self: float | None = None
    evidence: float | None = None
    level: float
    flag: Literal["unverified"] | None = None
    snippet: str | None = None
    source: Literal["resume", "self", "resume+self", "override"]

class Profile(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    education: EducationInput
    experience_years: float
    interests: list[str]
    weekly_hours: float = 10
    deadline_weeks: int = 12
    target_role_id: str | None = None
    skills: list[ProfileSkill]
    unmapped_skills: list[str]

class ProfileResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    profile: Profile
    meta: Meta

# ---------- roles ----------
class RoleSkill(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    skill_id: str
    skill_name: str
    category: str
    importance: float
    target: float

class RoleSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    role_id: str
    title: str
    version: str
    description: str
    skill_count: int
    top_skills: list[str]
    is_custom: bool
    market_update_available: bool

class RoleDetail(RoleSummary):
    skills: list[RoleSkill]

class RolesResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    roles: list[RoleSummary]

class CustomRoleRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    title: str
    description: str

class CustomRoleResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    role: RoleDetail
    meta: Meta

# ---------- analysis ----------
class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    role_id: str
    weekly_hours: float
    deadline_weeks: int
    skill_overrides: dict[str, float] | None = None

class CategoryScore(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    category: str
    score: float

class Gap(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    skill_id: str
    skill_name: str
    category: str
    level: float
    target: float
    gap: float
    importance: float
    dependency_impact: float
    priority: int
    priority_label: PriorityLabel
    status: SkillStatus
    flag: Literal["unverified"] | None = None
    unblocks: list[SkillRef]

class Strength(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    skill_id: str
    skill_name: str
    level: float
    target: float

class RadarPoint(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    skill_id: str
    skill_name: str
    current: float
    target: float

class Analysis(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    readiness: float
    readiness_note: str
    category_scores: list[CategoryScore]
    gaps: list[Gap]
    strengths: list[Strength]
    radar: list[RadarPoint]

# ---------- roadmap ----------
class Why(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    level: float
    target: float
    gap: float
    importance: float
    priority: int
    priority_label: PriorityLabel
    unblocks: list[SkillRef]
    interest_match: bool
    evidence_snippet: str | None = None
    narrative: str
    narrative_source: NarrativeSource

class Prereq(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    skill_id: str
    skill_name: str
    min_level: float
    met: bool

class Activity(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    activity_id: str
    type: ActivityType
    title: str
    provider: str
    url: str
    hours: float
    level_gain: float
    skills: list[str]
    level_from: float
    level_to: float
    completed: bool

class RoadmapItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    item_id: str
    position: int
    skill_id: str | None = None
    skill_name: str
    phase: Phase
    week_start: int
    week_end: int
    hours: float
    status: SkillStatus
    stretch: bool
    is_capstone: bool
    combines: list[SkillRef]
    prerequisites: list[Prereq]
    activities: list[Activity]
    completion_criteria: list[str]
    why: Why | None = None

class GraphNode(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    label: str
    status: SkillStatus
    phase: Phase

class GraphEdge(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    source: str
    target: str

class RoadmapGraph(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    nodes: list[GraphNode]
    edges: list[GraphEdge]

class Roadmap(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    version: int
    total_weeks: int
    total_hours: float
    deadline_weeks: int
    weekly_hours: float
    phases: list[Phase]
    items: list[RoadmapItem]
    graph: RoadmapGraph

class AnalyzeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    role: RoleRef
    analysis: Analysis
    roadmap: Roadmap
    meta: Meta

# ---------- progress / replan ----------
class CompleteRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    skill_id: str
    activity_id: str | None = None

class KnownRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    skill_id: str
    level: float

class DiffTrigger(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    type: Literal["complete_skill", "complete_activity", "mark_known", "market_update"]
    skill_id: str | None = None
    skill_name: str | None = None
    activity_id: str | None = None

class LevelChange(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    skill_id: str
    skill_name: str
    from_: float = Field(..., alias="from")
    to: float

class DiffRemovedItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    item_id: str
    skill_name: str
    reason: str

class DiffAddedItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    item_id: str
    skill_name: str
    reason: str

class DiffReorderedItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    item_id: str
    skill_name: str
    from_position: int
    to_position: int

class DiffReprioritizedSkill(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    skill_id: str
    skill_name: str
    from_priority: int
    to_priority: int

class RequirementChange(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    skill_id: str
    skill_name: str
    change: Literal["added", "removed", "importance_changed", "target_changed"]
    from_: float | None = Field(default=None, alias="from")
    to: float | None = None

class Diff(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    trigger: DiffTrigger
    readiness_before: float
    readiness_after: float
    level_changes: list[LevelChange]
    unlocked: list[SkillRef]
    removed: list[DiffRemovedItem]
    added: list[DiffAddedItem]
    reordered: list[DiffReorderedItem]
    reprioritized: list[DiffReprioritizedSkill]
    requirement_changes: list[RequirementChange]
    facts: list[str]

class ProgressResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    state: AnalyzeResponse
    diff: Diff
    narrative: str
    narrative_source: NarrativeSource
    meta: Meta

class MarketUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    role_id: str | None = None

# ---------- today ----------
class TodayPick(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    item_id: str
    skill_id: str
    skill_name: str
    activity: Activity
    minutes: int
    why: Why
    reasons: list[str]

class TodayResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    today: TodayPick | None = None
    message: str | None = None
    meta: Meta

# ---------- coach ----------
class CoachRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    message: str
    session_id: str

class ToolCallInfo(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str
    args: dict[str, Any]
    ok: bool

class CoachResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    reply: str
    tool_calls: list[ToolCallInfo]
    state_changed: bool
    state: AnalyzeResponse | None = None
    diff: Diff | None = None
    meta: Meta

# ---------- eval ----------
EvalCategory = Literal[
    "Skill-Gap Accuracy",
    "Personalization",
    "Roadmap Quality",
    "Adaptability",
    "Recommendation Relevance",
    "Explainability",
]

class EvalMetric(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: str
    name: str
    category: EvalCategory
    value: float
    target: float
    comparator: Literal[">=", "<=", "=="]
    unit: Literal["ratio", "count", "percent"]
    passed: bool

class EvalPersona(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    persona_id: str
    name: str
    role_id: str
    expected_top_gaps: list[str]
    predicted_top_gaps: list[str]
    precision_at_3: float
    recall_at_3: float

class AdkEvalCase(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    eval_id: str
    passed: bool
    tool_trajectory: float | None = None

class AdkEval(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    ran_at: str | None = None
    tool_trajectory_avg_score: float | None = None
    response_match_score: float | None = None
    cases: list[AdkEvalCase]

class EvalSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    total: int
    passed: int
    pass_rate: float

class EvalReport(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    generated_at: str
    summary: EvalSummary
    metrics: list[EvalMetric]
    personas: list[EvalPersona]
    adk: AdkEval

# ---------- health & errors ----------
class LlmHealth(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    chain: list[Provider]
    primary: Provider

class Health(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    status: Literal["ok"]
    version: str
    llm: LlmHealth
    chroma: Literal["ok", "error", "disabled"]
    db: Literal["ok", "error"]

ErrorCode = Literal[
    "VALIDATION_ERROR",
    "NO_PROFILE",
    "NO_ROADMAP",
    "UNKNOWN_ROLE",
    "UNKNOWN_SKILL",
    "UNKNOWN_ACTIVITY",
    "RESUME_PARSE_ERROR",
    "NO_MARKET_UPDATE",
    "EVAL_NOT_RUN",
    "LLM_UNAVAILABLE",
    "NOT_IMPLEMENTED",
    "INTERNAL_ERROR",
]

class ErrorDetail(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    code: ErrorCode
    message: str
    details: dict[str, Any] = Field(default_factory=dict)

class ApiErrorEnvelope(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    error: ErrorDetail
