import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useToast } from '../components/ui/Toast';
import {
  createProfile,
  getRoles,
  analyzeProfile,
} from '../api/endpoints';
import { ApiError } from '../api/client';
import type {
  AnalyzeRequest,
  ProfileInput,
  ProfileSkill,
  RoleSummary,
} from '../types/api';

import { mockProfile } from '../mocks/fixtures';
import { AboutYouStep, type AboutYouData } from '../components/profile/AboutYouStep';
import { SkillsInputStep, type ManualSkill } from '../components/profile/SkillsInputStep';
import { ExtractedSkillsReview } from '../components/profile/ExtractedSkillsReview';
import { TargetRoleSelector } from '../components/profile/TargetRoleSelector';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Global Zustand Store
  const storeProfile = useStore((s) => s.profile);
  const storeRoles = useStore((s) => s.roles);
  const setStoreProfile = useStore((s) => s.setProfile);
  const setStoreRoles = useStore((s) => s.setRoles);
  const setStoreState = useStore((s) => s.setState);

  // Step 1: About You State
  const [aboutYou, setAboutYou] = useState<AboutYouData>({
    degree: storeProfile?.education?.degree ?? 'B.S. in Computer Science',
    year: storeProfile?.education?.year ?? 2024,
    experience_years: storeProfile?.experience_years ?? 3.0,
    interests: storeProfile?.interests ?? ['LLMs', 'autonomous agents', 'backend'],
    weekly_hours: storeProfile?.weekly_hours ?? 10,
    deadline_weeks: storeProfile?.deadline_weeks ?? 12,
  });
  const [aboutYouErrors, setAboutYouErrors] = useState<Record<string, string>>({});

  // Step 2: Skills Input State
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const [manualSkills, setManualSkills] = useState<ManualSkill[]>([
    { name: 'Python', self: 8.0 },
    { name: 'FastAPI', self: 7.0 },
  ]);
  const [isExtractingSkills, setIsExtractingSkills] = useState(false);

  // Step 3: Review Extracted Skills State
  const [extractedSkills, setExtractedSkills] = useState<ProfileSkill[]>(
    storeProfile?.skills ?? []
  );
  const [unmappedSkills, setUnmappedSkills] = useState<string[]>(
    storeProfile?.unmapped_skills ?? []
  );
  const [skillOverrides, setSkillOverrides] = useState<Record<string, number>>({});

  // Step 4: Target Role State
  const [roles, setRoles] = useState<RoleSummary[]>(storeRoles);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(
    storeProfile?.target_role_id ?? 'genai_engineer'
  );
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  // Step 5: Analyze State
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch Roles on mount if not populated
  useEffect(() => {
    let isMounted = true;
    setIsLoadingRoles(true);

    getRoles()
      .then((res) => {
        if (!isMounted) return;
        setRoles(res.roles);
        setStoreRoles(res.roles);
        // Default select first role if none selected
        if (!selectedRoleId && res.roles.length > 0) {
          setSelectedRoleId(res.roles[0].role_id);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const message = err instanceof ApiError ? err.message : 'Failed to load roles.';
        showToast({ type: 'error', title: 'Error Loading Roles', message });
      })
      .finally(() => {
        if (isMounted) setIsLoadingRoles(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Validation for Step 1
  const validateAboutYou = (): boolean => {
    const errs: Record<string, string> = {};
    if (!aboutYou.degree.trim()) {
      errs.degree = 'Degree / Program is required.';
    }
    if (aboutYou.year !== null && (aboutYou.year < 1970 || aboutYou.year > 2035)) {
      errs.year = 'Graduation year must be between 1970 and 2035.';
    }
    if (aboutYou.experience_years < 0) {
      errs.experience_years = 'Experience years cannot be negative.';
    }
    if (aboutYou.weekly_hours < 2 || aboutYou.weekly_hours > 40) {
      errs.weekly_hours = 'Weekly commitment must be between 2 and 40 hours.';
    }
    if (aboutYou.deadline_weeks < 4 || aboutYou.deadline_weeks > 52) {
      errs.deadline_weeks = 'Target timeline must be between 4 and 52 weeks.';
    }

    setAboutYouErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Step 2: POST /profile
  const handleExtractSkills = async () => {
    if (!validateAboutYou()) {
      showToast({
        type: 'warning',
        title: 'Validation Incomplete',
        message: 'Please resolve errors in the "About You" section before extracting skills.',
      });
      return;
    }

    setIsExtractingSkills(true);
    try {
      const profileInput: ProfileInput = {
        education: {
          degree: aboutYou.degree.trim(),
          year: aboutYou.year,
        },
        experience_years: aboutYou.experience_years,
        interests: aboutYou.interests,
        self_skills: manualSkills.filter((s) => s.name.trim().length > 0),
        resume_text: resumeText.trim() ? resumeText.trim() : null,
      };

      const res = await createProfile(profileInput, resumeFile ?? undefined);

      // Store in local state and store
      setExtractedSkills(res.profile.skills);
      setUnmappedSkills(res.profile.unmapped_skills);
      setStoreProfile(res.profile);

      showToast({
        type: 'success',
        title: 'Skills Extracted',
        message: `Successfully extracted ${res.profile.skills.length} calibrated skills.`,
      });
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Failed to extract skills.';
      showToast({
        type: 'error',
        title: 'Skill Extraction Failed',
        message,
      });
    } finally {
      setIsExtractingSkills(false);
    }
  };

  // Handler for skill level overrides (Step 3)
  const handleOverrideSkill = (skillId: string, level: number) => {
    setSkillOverrides((prev) => ({
      ...prev,
      [skillId]: level,
    }));
  };

  // Handler for custom role creation (Step 4)
  const handleCustomRoleCreated = (newRole: RoleSummary) => {
    setRoles((prev) => [...prev, newRole]);
    setStoreRoles([...roles, newRole]);
    setSelectedRoleId(newRole.role_id);
  };

  // Submit Step 5: POST /analyze
  const handleAnalyze = async () => {
    if (!selectedRoleId) {
      showToast({
        type: 'warning',
        title: 'Role Required',
        message: 'Please select a target role in Step 4 before running analysis.',
      });
      return;
    }

    if (extractedSkills.length === 0) {
      showToast({
        type: 'warning',
        title: 'Skills Required',
        message: 'Please extract your skills in Step 2 before running analysis.',
      });
      return;
    }

    if (!validateAboutYou()) {
      showToast({
        type: 'warning',
        title: 'Validation Incomplete',
        message: 'Please check your inputs in Step 1.',
      });
      return;
    }

    setIsAnalyzing(true);

    // Build AnalyzeRequest payload
    const analyzePayload: AnalyzeRequest = {
      role_id: selectedRoleId,
      weekly_hours: aboutYou.weekly_hours,
      deadline_weeks: aboutYou.deadline_weeks,
      skill_overrides: skillOverrides,
    };

    // ACCEPTANCE REQUIREMENT #12: Log the /analyze payload in development console
    console.log('[Analyze Payload]', analyzePayload);

    try {
      const res = await analyzeProfile(analyzePayload);

      // 1. Store returned state in Zustand store
      setStoreState(res);

      showToast({
        type: 'success',
        title: 'Analysis Complete',
        message: `Generated roadmap with readiness score of ${res.analysis.readiness.toFixed(1)}%.`,
      });

      // 2. Navigate to /analysis
      navigate('/analysis');
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Analysis failed.';
      showToast({
        type: 'error',
        title: 'Analysis Error',
        message,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadSampleData = () => {
    setAboutYou({
      degree: 'B.S. in Computer Science',
      year: 2024,
      experience_years: 3.0,
      interests: ['LLMs', 'autonomous agents', 'backend'],
      weekly_hours: 10,
      deadline_weeks: 12,
    });
    setExtractedSkills(mockProfile.profile.skills);
    setUnmappedSkills(mockProfile.profile.unmapped_skills);
    setStoreProfile(mockProfile.profile);
    setSelectedRoleId('genai_engineer');
    showToast({
      type: 'success',
      title: 'Sample Profile Loaded',
      message: 'Populated profile with sample data. Click "Analyze Career" below to generate your roadmap.',
    });
  };

  const selectedRole = roles.find((r) => r.role_id === selectedRoleId);
  const isFormLocked = isExtractingSkills || isAnalyzing;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Build Your Career Profile
          </h1>
          <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
            Follow the steps below to calibrate your skills against industry standards, select your target role, and generate an evidence-grounded career roadmap.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleLoadSampleData}
          className="self-start sm:self-auto flex-shrink-0 font-black bg-[#ffe566] text-black border-2 border-black shadow-neo-xs hover:bg-[#fed633]"
          leftIcon={<Sparkles className="w-4 h-4 mr-1.5" />}
        >
          ⚡ Load Sample Profile
        </Button>
      </div>

      {/* Step 1 — About You */}
      <AboutYouStep
        data={aboutYou}
        onChange={setAboutYou}
        errors={aboutYouErrors}
        disabled={isFormLocked}
      />

      {/* Step 2 — Skills Input */}
      <SkillsInputStep
        resumeFile={resumeFile}
        onSetResumeFile={setResumeFile}
        resumeText={resumeText}
        onSetResumeText={setResumeText}
        manualSkills={manualSkills}
        onSetManualSkills={setManualSkills}
        onSubmit={handleExtractSkills}
        isLoading={isExtractingSkills}
        disabled={isFormLocked}
      />

      {/* Step 3 — Review Extracted Skills */}
      <ExtractedSkillsReview
        skills={extractedSkills}
        unmappedSkills={unmappedSkills}
        skillOverrides={skillOverrides}
        onOverrideSkill={handleOverrideSkill}
        disabled={isFormLocked}
      />

      {/* Step 4 — Target Role */}
      <TargetRoleSelector
        roles={roles}
        selectedRoleId={selectedRoleId}
        onSelectRole={setSelectedRoleId}
        onCustomRoleCreated={handleCustomRoleCreated}
        isLoadingRoles={isLoadingRoles}
        disabled={isFormLocked}
      />

      {/* Step 5 — Analyze Action Bar (In-Flow Card) */}
      <Card className="p-5 sm:p-6 bg-white border-2 border-black rounded-2xl shadow-neo-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-[#ffe566] text-black border-2 border-black flex items-center justify-center text-xs font-black shadow-neo-xs flex-shrink-0">
                5
              </span>
              <h3 className="text-base sm:text-lg font-black text-black">Ready to Analyze</h3>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-black font-semibold">
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                Target Role:
                <strong className="text-black bg-[#ffe566] px-2.5 py-0.5 rounded-lg border border-black shadow-neo-xs font-black">
                  {selectedRole ? selectedRole.title : 'None selected'}
                </strong>
              </span>
              <span className="text-neutral-400 hidden sm:inline">&bull;</span>
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                Extracted Skills:
                <strong className="text-black bg-[#79e7a8] px-2.5 py-0.5 rounded-lg border border-black shadow-neo-xs font-black">
                  {extractedSkills.length}
                </strong>
              </span>
              {Object.keys(skillOverrides).length > 0 && (
                <>
                  <span className="text-neutral-400 hidden sm:inline">&bull;</span>
                  <span className="text-black bg-[#ff70a6] px-2.5 py-0.5 rounded-lg border border-black shadow-neo-xs font-black">
                    {Object.keys(skillOverrides).length} override(s)
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto flex-shrink-0">
            <Button
              size="lg"
              onClick={handleAnalyze}
              isLoading={isAnalyzing}
              disabled={isFormLocked || !selectedRoleId || extractedSkills.length === 0}
              className="w-full lg:w-auto text-sm sm:text-base font-black py-3 px-6 shadow-neo whitespace-normal text-center"
              rightIcon={<ArrowRight className="w-5 h-5 ml-1 stroke-[3] flex-shrink-0" />}
            >
              Analyze Career &amp; Generate Roadmap
            </Button>
          </div>
        </div>

        {extractedSkills.length === 0 && (
          <div className="mt-4 pt-3 border-t-2 border-black flex items-center gap-2 text-xs font-bold text-amber-900 bg-[#ffd166]/30 p-3 rounded-xl border border-black">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-900" />
            <span>Click &quot;Extract Skills&quot; in Step 2 to populate your skills before running analysis.</span>
          </div>
        )}
      </Card>
    </div>
  );
};
