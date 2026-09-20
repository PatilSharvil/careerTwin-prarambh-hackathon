import type {
  AnalyzeRequest,
  AnalyzeResponse,
  CoachRequest,
  CoachResponse,
  CompleteRequest,
  CustomRoleRequest,
  CustomRoleResponse,
  Diff,
  EvalReport,
  Health,
  KnownRequest,
  MarketUpdateRequest,
  ProfileInput,
  ProfileResponse,
  ProgressResponse,
  RoleDetail,
  RolesResponse,
  TodayResponse,
} from '../types/api';
import {
  defaultMeta,
  mockAnalyzeAfterMarket,
  mockAnalyzeAfterRag,
  mockAnalyzeInitial,
  mockCoachReplies,
  mockDiffAfterMarket,
  mockDiffAfterRag,
  mockEvalReport,
  mockHealth,
  mockProfile,
  mockProgressAfterMarket,
  mockProgressAfterRag,
  mockRoles,
  mockToday,
} from './fixtures';

const simulateLatency = async (minMs = 300, maxMs = 600): Promise<void> => {
  const ms = Math.floor(minMs + Math.random() * (maxMs - minMs));
  await new Promise((resolve) => setTimeout(resolve, ms));
};

class MockService {
  private currentProfile: ProfileResponse;
  private currentRoles: RolesResponse;
  private currentState: AnalyzeResponse | null;
  private currentDiff: Diff | null;
  private customRoles: RoleDetail[];
  private ragCompleted: boolean;
  private marketUpdated: boolean;

  constructor() {
    this.currentProfile = JSON.parse(JSON.stringify(mockProfile));
    this.currentRoles = JSON.parse(JSON.stringify(mockRoles));
    this.currentState = JSON.parse(JSON.stringify(mockAnalyzeInitial));
    this.currentDiff = null;
    this.customRoles = [];
    this.ragCompleted = false;
    this.marketUpdated = false;
  }

  public getCurrentDiff(): Diff | null {
    return this.currentDiff;
  }

  public isRagCompleted(): boolean {
    return this.ragCompleted;
  }

  public isMarketUpdated(): boolean {
    return this.marketUpdated;
  }

  public getCustomRoles(): RoleDetail[] {
    return this.customRoles;
  }

  // Reset to initial state for testing
  public reset(): void {
    this.currentProfile = JSON.parse(JSON.stringify(mockProfile));
    this.currentRoles = JSON.parse(JSON.stringify(mockRoles));
    this.currentState = JSON.parse(JSON.stringify(mockAnalyzeInitial));
    this.currentDiff = null;
    this.customRoles = [];
    this.ragCompleted = false;
    this.marketUpdated = false;
  }

  // 1. GET /health
  async getHealth(): Promise<Health> {
    await simulateLatency();
    return JSON.parse(JSON.stringify(mockHealth));
  }

  // 2. GET /roles
  async getRoles(): Promise<RolesResponse> {
    await simulateLatency();
    return JSON.parse(JSON.stringify(this.currentRoles));
  }

  // 3. POST /roles/custom
  async createCustomRole(data: CustomRoleRequest): Promise<CustomRoleResponse> {
    await simulateLatency();
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const newRole: RoleDetail = {
      role_id: `custom_${slug}`,
      title: data.title,
      version: '2026.09-custom',
      description: data.description,
      skill_count: 5,
      top_skills: ['python', 'llm_fundamentals', 'prompt_engineering', 'apis_rest', 'testing'],
      is_custom: true,
      market_update_available: false,
      skills: [
        { skill_id: 'python', skill_name: 'Python', category: 'Foundation', importance: 0.9, target: 8 },
        { skill_id: 'llm_fundamentals', skill_name: 'LLM Fundamentals', category: 'Core', importance: 0.85, target: 8 },
        { skill_id: 'prompt_engineering', skill_name: 'Prompt Engineering', category: 'Core', importance: 0.8, target: 7 },
        { skill_id: 'apis_rest', skill_name: 'RESTful APIs', category: 'Foundation', importance: 0.75, target: 7 },
        { skill_id: 'testing', skill_name: 'Testing & Pytest', category: 'Foundation', importance: 0.7, target: 6 },
      ],
    };

    this.customRoles.push(newRole);
    this.currentRoles.roles.push({
      role_id: newRole.role_id,
      title: newRole.title,
      version: newRole.version,
      description: newRole.description,
      skill_count: newRole.skill_count,
      top_skills: newRole.top_skills,
      is_custom: true,
      market_update_available: false,
    });

    return {
      role: newRole,
      meta: defaultMeta,
    };
  }

  // 4. POST /profile
  async createProfile(data: ProfileInput, resumeFile?: File | Blob): Promise<ProfileResponse> {
    await simulateLatency();
    const mappedSkills = data.self_skills.map((s) => ({
      skill_id: s.name.toLowerCase().replace(/\s+/g, '_'),
      skill_name: s.name,
      self: s.self,
      evidence: resumeFile ? s.self : null,
      level: s.self,
      flag: (resumeFile ? null : 'unverified') as 'unverified' | null,
      snippet: resumeFile ? `Verified mention of ${s.name} from resume analysis.` : null,
      source: (resumeFile ? 'resume+self' : 'self') as 'resume+self' | 'self',
    }));

    const resumeSkills =
      resumeFile || data.resume_text || mappedSkills.length === 0
        ? this.currentProfile.profile.skills
        : [];

    const combinedSkillsMap = new Map<string, (typeof this.currentProfile.profile.skills)[0]>();
    for (const s of resumeSkills) {
      combinedSkillsMap.set(s.skill_id, s);
    }
    for (const m of mappedSkills) {
      combinedSkillsMap.set(m.skill_id, m);
    }
    const finalSkills = Array.from(combinedSkillsMap.values());

    this.currentProfile = {
      profile: {
        education: data.education,
        experience_years: data.experience_years,
        interests: data.interests,
        weekly_hours: 10,
        deadline_weeks: 12,
        target_role_id: null,
        skills: finalSkills,
        unmapped_skills: mockProfile.profile.unmapped_skills || ['Kubernetes basics', 'Redis caching'],
      },
      meta: defaultMeta,
    };

    return JSON.parse(JSON.stringify(this.currentProfile));
  }

  // 5. GET /profile
  async getProfile(): Promise<ProfileResponse> {
    await simulateLatency();
    return JSON.parse(JSON.stringify(this.currentProfile));
  }

  // 6. POST /analyze
  async analyzeProfile(data: AnalyzeRequest): Promise<AnalyzeResponse> {
    await simulateLatency();
    // Re-initialize state for requested role
    this.ragCompleted = false;
    this.marketUpdated = false;
    this.currentState = JSON.parse(JSON.stringify(mockAnalyzeInitial));
    if (this.currentState) {
      this.currentState.roadmap.deadline_weeks = data.deadline_weeks;
      this.currentState.roadmap.weekly_hours = data.weekly_hours;
      this.currentState.roadmap.version = (this.currentState.roadmap.version || 1) + 1;
      this.currentProfile.profile.target_role_id = data.role_id;
      this.currentProfile.profile.deadline_weeks = data.deadline_weeks;
      this.currentProfile.profile.weekly_hours = data.weekly_hours;

      if (data.skill_overrides) {
        for (const [skillId, level] of Object.entries(data.skill_overrides)) {
          const profileSkill = this.currentProfile.profile.skills.find((s) => s.skill_id === skillId);
          if (profileSkill) {
            profileSkill.level = level;
            profileSkill.source = 'override';
          }
          const gap = this.currentState.analysis.gaps.find((g) => g.skill_id === skillId);
          if (gap) {
            gap.level = level;
            gap.gap = Math.max(0, Number((gap.target - level).toFixed(1)));
          }
        }
      }
    }
    return JSON.parse(JSON.stringify(this.currentState));
  }

  // 7. GET /roadmap
  async getRoadmap(): Promise<AnalyzeResponse> {
    await simulateLatency();
    if (!this.currentState) {
      throw new Error('NO_ROADMAP');
    }
    return JSON.parse(JSON.stringify(this.currentState));
  }

  // 8. POST /progress/complete
  async completeProgress(data: CompleteRequest): Promise<ProgressResponse> {
    await simulateLatency();
    if (data.skill_id === 'rag') {
      this.ragCompleted = true;
      this.currentState = JSON.parse(JSON.stringify(mockAnalyzeAfterRag));
      this.currentDiff = JSON.parse(JSON.stringify(mockDiffAfterRag));
      return JSON.parse(JSON.stringify(mockProgressAfterRag));
    }

    // Generic completion handler for other skills
    if (!this.currentState) {
      throw new Error('NO_ROADMAP');
    }

    const previousReadiness = this.currentState.analysis.readiness;
    const newReadiness = Math.min(Math.round((previousReadiness + 4.5) * 10) / 10, 100);

    const diff: Diff = {
      trigger: {
        type: data.activity_id ? 'complete_activity' : 'complete_skill',
        skill_id: data.skill_id,
        skill_name: data.skill_id,
        activity_id: data.activity_id || null,
      },
      readiness_before: previousReadiness,
      readiness_after: newReadiness,
      level_changes: [
        {
          skill_id: data.skill_id,
          skill_name: data.skill_id,
          from: 3.0,
          to: 7.0,
        },
      ],
      unlocked: [],
      removed: [],
      added: [],
      reordered: [],
      reprioritized: [],
      requirement_changes: [],
      facts: [`Completed ${data.skill_id}: readiness increased ${previousReadiness} → ${newReadiness}`],
    };

    this.currentState.analysis.readiness = newReadiness;
    this.currentState.roadmap.version += 1;
    this.currentDiff = diff;

    return {
      state: JSON.parse(JSON.stringify(this.currentState)),
      diff,
      narrative: `Activity for ${data.skill_id} marked complete. Readiness advanced to ${newReadiness}%.`,
      narrative_source: 'template',
      meta: defaultMeta,
    };
  }

  // 9. POST /progress/known
  async markKnown(data: KnownRequest): Promise<ProgressResponse> {
    await simulateLatency();
    if (!this.currentState) {
      throw new Error('NO_ROADMAP');
    }

    const previousReadiness = this.currentState.analysis.readiness;
    const newReadiness = Math.min(Math.round((previousReadiness + 3.2) * 10) / 10, 100);

    const diff: Diff = {
      trigger: {
        type: 'mark_known',
        skill_id: data.skill_id,
        skill_name: data.skill_id,
      },
      readiness_before: previousReadiness,
      readiness_after: newReadiness,
      level_changes: [
        {
          skill_id: data.skill_id,
          skill_name: data.skill_id,
          from: 2.0,
          to: data.level,
        },
      ],
      unlocked: [],
      removed: [
        {
          item_id: `rm_${data.skill_id}`,
          skill_name: data.skill_id,
          reason: 'Marked already known at target proficiency',
        },
      ],
      added: [],
      reordered: [],
      reprioritized: [],
      requirement_changes: [],
      facts: [`Marked ${data.skill_id} as known at level ${data.level}. Readiness ${previousReadiness} → ${newReadiness}`],
    };

    this.currentState.analysis.readiness = newReadiness;
    this.currentState.roadmap.version += 1;
    this.currentDiff = diff;

    return {
      state: JSON.parse(JSON.stringify(this.currentState)),
      diff,
      narrative: `Skill ${data.skill_id} updated to level ${data.level}. Removed from active roadmap tasks.`,
      narrative_source: 'llm',
      meta: defaultMeta,
    };
  }

  // 10. GET /today
  async getToday(): Promise<TodayResponse> {
    await simulateLatency();
    return JSON.parse(JSON.stringify(mockToday));
  }

  // 11. POST /market/update
  async updateMarket(data: MarketUpdateRequest): Promise<ProgressResponse> {
    await simulateLatency();
    this.marketUpdated = true;
    // Set market_update_available to false on the role
    const roleId = data.role_id || 'genai_engineer';
    const targetRole = this.currentRoles.roles.find((r) => r.role_id === roleId);
    if (targetRole) {
      targetRole.market_update_available = false;
      targetRole.version = '2026.10';
    }

    this.currentState = JSON.parse(JSON.stringify(mockAnalyzeAfterMarket));
    this.currentDiff = JSON.parse(JSON.stringify(mockDiffAfterMarket));

    return JSON.parse(JSON.stringify(mockProgressAfterMarket));
  }

  // 12. POST /coach
  async sendCoachMessage(data: CoachRequest): Promise<CoachResponse> {
    await simulateLatency();
    const lower = data.message.toLowerCase();
    if (lower.includes('rag') || lower.includes('done') || lower.includes('completed')) {
      this.ragCompleted = true;
      this.currentState = JSON.parse(JSON.stringify(mockAnalyzeAfterRag));
      this.currentDiff = JSON.parse(JSON.stringify(mockDiffAfterRag));
      return JSON.parse(JSON.stringify(mockCoachReplies[1]));
    }

    return JSON.parse(JSON.stringify(mockCoachReplies[0]));
  }

  // 13. GET /eval/report
  async getEvalReport(): Promise<EvalReport> {
    await simulateLatency();
    return JSON.parse(JSON.stringify(mockEvalReport));
  }
}

export const mockService = new MockService();
