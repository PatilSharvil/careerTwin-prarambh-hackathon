// ---------- shared ----------
export type Provider = "gemini" | "groq" | "openrouter" | "none";

export interface Meta {
  llm_provider: Provider;
  llm_used: boolean;
  fallback_used: boolean;
}

export type SkillStatus = "locked" | "available" | "in_progress" | "done";
export type PriorityLabel = "Critical" | "High" | "Medium" | "Low";
export type Phase = "Foundation" | "Core" | "Applied" | "Capstone";
export type ActivityType = "course" | "project" | "doc" | "certification";
export type NarrativeSource = "llm" | "template";

export interface SkillRef {
  skill_id: string;
  skill_name: string;
}

export interface RoleRef {
  role_id: string;
  title: string;
  version: string;
}

// ---------- profile ----------
export interface ProfileEducation {
  degree: string;
  year: number | null;
}

export interface SelfSkillInput {
  name: string;
  self: number;
}

export interface ProfileInput {
  education: ProfileEducation;
  experience_years: number;
  interests: string[];
  self_skills: SelfSkillInput[];
  resume_text: string | null;
}

export interface ProfileSkill {
  skill_id: string;
  skill_name: string;
  self: number | null;
  evidence: number | null;
  level: number;
  flag: "unverified" | null;
  snippet: string | null;
  source: "resume" | "self" | "resume+self" | "override";
}

export interface Profile {
  education: ProfileEducation;
  experience_years: number;
  interests: string[];
  weekly_hours: number;
  deadline_weeks: number;
  target_role_id: string | null;
  skills: ProfileSkill[];
  unmapped_skills: string[];
}

export interface ProfileResponse {
  profile: Profile;
  meta: Meta;
}

// ---------- roles ----------
export interface RoleSkill {
  skill_id: string;
  skill_name: string;
  category: string;
  importance: number;
  target: number;
}

export interface RoleSummary {
  role_id: string;
  title: string;
  version: string;
  description: string;
  skill_count: number;
  top_skills: string[];
  is_custom: boolean;
  market_update_available: boolean;
}

export interface RoleDetail extends RoleSummary {
  skills: RoleSkill[];
}

export interface RolesResponse {
  roles: RoleSummary[];
}

export interface CustomRoleRequest {
  title: string;
  description: string;
}

export interface CustomRoleResponse {
  role: RoleDetail;
  meta: Meta;
}

// ---------- analysis ----------
export interface AnalyzeRequest {
  role_id: string;
  weekly_hours: number;
  deadline_weeks: number;
  skill_overrides?: Record<string, number>;
}

export interface CategoryScore {
  category: string;
  score: number;
}

export interface Gap {
  skill_id: string;
  skill_name: string;
  category: string;
  level: number;
  target: number;
  gap: number;
  importance: number;
  dependency_impact: number;
  priority: number;
  priority_label: PriorityLabel;
  status: SkillStatus;
  flag: "unverified" | null;
  unblocks: SkillRef[];
}

export interface Strength {
  skill_id: string;
  skill_name: string;
  level: number;
  target: number;
}

export interface RadarPoint {
  skill_id: string;
  skill_name: string;
  current: number;
  target: number;
}

export interface Analysis {
  readiness: number;
  readiness_note: string;
  category_scores: CategoryScore[];
  gaps: Gap[];
  strengths: Strength[];
  radar: RadarPoint[];
}

// ---------- roadmap ----------
export interface Why {
  level: number;
  target: number;
  gap: number;
  importance: number;
  priority: number;
  priority_label: PriorityLabel;
  unblocks: SkillRef[];
  interest_match: boolean;
  evidence_snippet: string | null;
  narrative: string;
  narrative_source: NarrativeSource;
}

export interface Prereq {
  skill_id: string;
  skill_name: string;
  min_level: number;
  met: boolean;
}

export interface Activity {
  activity_id: string;
  type: ActivityType;
  title: string;
  provider: string;
  url: string;
  hours: number;
  level_gain: number;
  skills: string[];
  level_from: number;
  level_to: number;
  completed: boolean;
}

export interface RoadmapItem {
  item_id: string;
  position: number;
  skill_id: string | null;
  skill_name: string;
  phase: Phase;
  week_start: number;
  week_end: number;
  hours: number;
  status: SkillStatus;
  stretch: boolean;
  is_capstone: boolean;
  combines: SkillRef[];
  prerequisites: Prereq[];
  activities: Activity[];
  completion_criteria: string[];
  why: Why | null;
}

export interface GraphNode {
  id: string;
  label: string;
  status: SkillStatus;
  phase: Phase;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface RoadmapGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Roadmap {
  version: number;
  total_weeks: number;
  total_hours: number;
  deadline_weeks: number;
  weekly_hours: number;
  phases: Phase[];
  items: RoadmapItem[];
  graph: RoadmapGraph;
}

export interface AnalyzeResponse {
  role: RoleRef;
  analysis: Analysis;
  roadmap: Roadmap;
  meta: Meta;
}

// ---------- progress / replan ----------
export interface CompleteRequest {
  skill_id: string;
  activity_id?: string | null;
}

export interface KnownRequest {
  skill_id: string;
  level: number;
}

export interface DiffTrigger {
  type: "complete_skill" | "complete_activity" | "mark_known" | "market_update";
  skill_id: string | null;
  skill_name: string | null;
  activity_id?: string | null;
}

export interface LevelChange {
  skill_id: string;
  skill_name: string;
  from: number;
  to: number;
}

export interface ItemChange {
  item_id: string;
  skill_name: string;
  reason: string;
}

export interface ReorderedItem {
  item_id: string;
  skill_name: string;
  from_position: number;
  to_position: number;
}

export interface ReprioritizedSkill {
  skill_id: string;
  skill_name: string;
  from_priority: number;
  to_priority: number;
}

export interface RequirementChange {
  skill_id: string;
  skill_name: string;
  change: "added" | "removed" | "importance_changed" | "target_changed";
  from: number | null;
  to: number | null;
}

export interface Diff {
  trigger: DiffTrigger;
  readiness_before: number;
  readiness_after: number;
  level_changes: LevelChange[];
  unlocked: SkillRef[];
  removed: ItemChange[];
  added: ItemChange[];
  reordered: ReorderedItem[];
  reprioritized: ReprioritizedSkill[];
  requirement_changes: RequirementChange[];
  facts: string[];
}

export interface ProgressResponse {
  state: AnalyzeResponse;
  diff: Diff;
  narrative: string;
  narrative_source: NarrativeSource;
  meta: Meta;
}

export interface MarketUpdateRequest {
  role_id: string | null;
}

// ---------- today ----------
export interface TodayPick {
  item_id: string;
  skill_id: string;
  skill_name: string;
  activity: Activity;
  minutes: number;
  why: Why;
  reasons: string[];
}

export interface TodayResponse {
  today: TodayPick | null;
  message: string | null;
  meta: Meta;
}

// ---------- coach ----------
export interface CoachRequest {
  message: string;
  session_id: string;
}

export interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
}

export interface CoachResponse {
  reply: string;
  tool_calls: ToolCallInfo[];
  state_changed: boolean;
  state: AnalyzeResponse | null;
  diff: Diff | null;
  meta: Meta;
}

// ---------- eval ----------
export type EvalCategory =
  | "Skill-Gap Accuracy"
  | "Personalization"
  | "Roadmap Quality"
  | "Adaptability"
  | "Recommendation Relevance"
  | "Explainability";

export interface EvalMetric {
  id: string;
  name: string;
  category: EvalCategory;
  value: number;
  target: number;
  comparator: ">=" | "<=" | "==";
  unit: "ratio" | "count" | "percent";
  passed: boolean;
}

export interface EvalPersona {
  persona_id: string;
  name: string;
  role_id: string;
  expected_top_gaps: string[];
  predicted_top_gaps: string[];
  precision_at_3: number;
  recall_at_3: number;
}

export interface AdkEvalCase {
  eval_id: string;
  passed: boolean;
  tool_trajectory: number | null;
}

export interface AdkEval {
  ran_at: string | null;
  tool_trajectory_avg_score: number | null;
  response_match_score: number | null;
  cases: AdkEvalCase[];
}

export interface EvalSummary {
  total: number;
  passed: number;
  pass_rate: number;
}

export interface EvalReport {
  generated_at: string;
  summary: EvalSummary;
  metrics: EvalMetric[];
  personas: EvalPersona[];
  adk: AdkEval;
}

// ---------- health & errors ----------
export interface LlmHealth {
  chain: Provider[];
  primary: Provider;
}

export interface Health {
  status: "ok";
  version: string;
  llm: LlmHealth;
  chroma: "ok" | "error";
  db: "ok" | "error";
}

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NO_PROFILE"
  | "NO_ROADMAP"
  | "UNKNOWN_ROLE"
  | "UNKNOWN_SKILL"
  | "UNKNOWN_ACTIVITY"
  | "RESUME_PARSE_ERROR"
  | "NO_MARKET_UPDATE"
  | "EVAL_NOT_RUN"
  | "LLM_UNAVAILABLE"
  | "NOT_IMPLEMENTED"
  | "INTERNAL_ERROR";

export interface ApiErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}
