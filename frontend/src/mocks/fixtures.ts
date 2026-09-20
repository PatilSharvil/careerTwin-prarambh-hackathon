import type {
  AnalyzeResponse,
  CoachResponse,
  Diff,
  EvalReport,
  Health,
  Meta,
  ProfileResponse,
  ProgressResponse,
  RolesResponse,
  TodayResponse,
} from '../types/api';

import healthJson from './sample_responses/health.json';
import rolesJson from './sample_responses/roles.json';
import profileJson from './sample_responses/profile.json';
import analyzeJson from './sample_responses/analyze.json';
import todayJson from './sample_responses/today.json';
import progressCompleteJson from './sample_responses/progress_complete.json';
import marketUpdateJson from './sample_responses/market_update.json';
import coachJson from './sample_responses/coach.json';
import evalReportJson from './sample_responses/eval_report.json';

export const defaultMeta: Meta = {
  llm_provider: 'gemini',
  llm_used: true,
  fallback_used: false,
};

export const fallbackMeta: Meta = {
  llm_provider: 'none',
  llm_used: false,
  fallback_used: true,
};

// 1. Health
export const mockHealth: Health = healthJson as unknown as Health;

// 2. Roles
export const mockRoles: RolesResponse = rolesJson as unknown as RolesResponse;

// 3. Profile
export const mockProfile: ProfileResponse = profileJson as unknown as ProfileResponse;

// 4. Initial Analysis & Roadmap
export const mockAnalyzeInitial: AnalyzeResponse = analyzeJson as unknown as AnalyzeResponse;

// 5. Today Pick
export const mockToday: TodayResponse = todayJson as unknown as TodayResponse;

// 6. Progress After RAG Completion
export const mockProgressAfterRag: ProgressResponse = progressCompleteJson as unknown as ProgressResponse;
export const mockAnalyzeAfterRag: AnalyzeResponse = progressCompleteJson.state as unknown as AnalyzeResponse;
export const mockDiffAfterRag: Diff = progressCompleteJson.diff as unknown as Diff;

// 7. Progress After Market Update
export const mockProgressAfterMarket: ProgressResponse = marketUpdateJson as unknown as ProgressResponse;
export const mockAnalyzeAfterMarket: AnalyzeResponse = marketUpdateJson.state as unknown as AnalyzeResponse;
export const mockDiffAfterMarket: Diff = marketUpdateJson.diff as unknown as Diff;

// 8. Coach Replies
export const mockCoachReplies: CoachResponse[] = [
  coachJson as unknown as CoachResponse,
  {
    reply:
      "Congratulations on completing RAG! I've marked the skill complete, raised your readiness, retired redundant Vector DB prerequisite tasks, and unlocked Tool Calling for you.",
    tool_calls: [
      {
        name: 'mark_complete',
        args: { skill_id: 'rag' },
        ok: true,
      },
    ],
    state_changed: true,
    state: mockAnalyzeAfterRag,
    diff: mockDiffAfterRag,
    meta: (coachJson as unknown as CoachResponse).meta || defaultMeta,
  },
];

// 9. Eval Report
export const mockEvalReport: EvalReport = evalReportJson as unknown as EvalReport;
