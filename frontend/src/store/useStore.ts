import { create } from 'zustand';
import type {
  AnalyzeResponse,
  Diff,
  EvalReport,
  Profile,
  RoadmapItem,
  RoleSummary,
  TodayPick,
  ToolCallInfo,
} from '../types/api';

export interface CoachMessageItem {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  tool_calls?: ToolCallInfo[];
  timestamp: string;
}

export interface AppState {
  profile: Profile | null;
  roles: RoleSummary[];
  state: AnalyzeResponse | null;
  lastDiff: Diff | null;
  lastNarrative: { narrative: string; source: 'llm' | 'template' } | null;
  today: TodayPick | null;
  todayMessage: string | null;
  coachMessages: CoachMessageItem[];
  sessionId: string;
  evalReport: EvalReport | null;
  completedMilestones: RoadmapItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setProfile: (profile: Profile | null) => void;
  setRoles: (roles: RoleSummary[]) => void;
  setState: (state: AnalyzeResponse | null) => void;
  setLastDiff: (diff: Diff | null) => void;
  setLastNarrative: (item: { narrative: string; source: 'llm' | 'template' } | null) => void;
  setToday: (today: TodayPick | null) => void;
  setTodayMessage: (message: string | null) => void;
  addCoachMessage: (message: Omit<CoachMessageItem, 'id' | 'timestamp'>) => void;
  clearCoachMessages: () => void;
  setSessionId: (sessionId: string) => void;
  setEvalReport: (report: EvalReport | null) => void;
  addCompletedMilestone: (item: RoadmapItem) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const generateSessionId = (): string =>
  'sess_' + Math.random().toString(36).substring(2, 10);

export const useStore = create<AppState>((set) => ({
  profile: null,
  roles: [],
  state: null,
  lastDiff: null,
  lastNarrative: null,
  today: null,
  todayMessage: null,
  coachMessages: [],
  sessionId: generateSessionId(),
  evalReport: null,
  completedMilestones: [],
  isLoading: false,
  error: null,

  setProfile: (profile) => set({ profile }),
  setRoles: (roles) => set({ roles }),
  setState: (state) => set({ state }),
  setLastDiff: (lastDiff) => set({ lastDiff }),
  setLastNarrative: (lastNarrative) => set({ lastNarrative }),
  setToday: (today) => set({ today }),
  setTodayMessage: (todayMessage) => set({ todayMessage }),
  addCoachMessage: (message) =>
    set((s) => ({
      coachMessages: [
        ...s.coachMessages,
        {
          ...message,
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
        },
      ],
    })),
  clearCoachMessages: () => set({ coachMessages: [] }),
  setSessionId: (sessionId) => set({ sessionId }),
  setEvalReport: (evalReport) => set({ evalReport }),
  addCompletedMilestone: (item) =>
    set((s) => {
      const existing = s.completedMilestones.find(
        (cm) => (cm.skill_id && cm.skill_id === item.skill_id) || cm.item_id === item.item_id
      );
      if (existing) return s;
      return {
        completedMilestones: [...s.completedMilestones, { ...item, status: 'done' as const }],
      };
    }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      profile: null,
      roles: [],
      state: null,
      lastDiff: null,
      lastNarrative: null,
      today: null,
      todayMessage: null,
      coachMessages: [],
      sessionId: generateSessionId(),
      evalReport: null,
      completedMilestones: [],
      isLoading: false,
      error: null,
    }),
}));
