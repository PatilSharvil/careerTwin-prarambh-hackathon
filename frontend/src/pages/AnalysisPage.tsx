import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getRoadmap } from '../api/endpoints';
import { mockAnalyzeInitial, mockProfile, mockRoles } from '../mocks/fixtures';
import { Gauge } from '../components/ui/Gauge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';

import { CategoryScoreBars } from '../components/analysis/CategoryScoreBars';
import { RadarChartCard } from '../components/analysis/RadarChartCard';
import { TopGapsSummary } from '../components/analysis/TopGapsSummary';
import { GapList } from '../components/analysis/GapList';
import { StrengthsCard } from '../components/analysis/StrengthsCard';

import {
  ArrowRight,
  Sparkles,
  Trophy,
  RefreshCw,
  Info,
} from 'lucide-react';

export const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const state = useStore((s) => s.state);
  const setState = useStore((s) => s.setState);
  const setStoreProfile = useStore((s) => s.setProfile);
  const setStoreRoles = useStore((s) => s.setRoles);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchAnalysis = () => {
    setIsLoading(true);

    getRoadmap()
      .then((res) => {
        setState(res);
      })
      .catch(() => {
        // Silently ignore if no state is created yet
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // If store.state is empty on mount, attempt to fetch existing roadmap once
  useEffect(() => {
    if (state !== null) {
      setIsLoading(false);
      return;
    }

    fetchAnalysis();
  }, [state]);

  const handleLoadDemo = () => {
    setIsLoading(true);
    setStoreProfile(mockProfile.profile);
    setStoreRoles(mockRoles.roles);
    setState(mockAnalyzeInitial);
    showToast({
      type: 'success',
      title: 'Demo Profile Loaded',
      message: 'Generated GenAI Engineer roadmap with readiness score of 42.5%.',
    });
    setIsLoading(false);
  };

  // Loading Skeleton
  if (isLoading) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
        <div className="p-6 bg-white rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 w-full md:w-2/3">
            <Skeleton height="32px" width="60%" />
            <Skeleton height="16px" width="80%" />
            <Skeleton height="14px" width="40%" />
          </div>
          <Skeleton variant="circular" width={140} height={140} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton height="320px" className="rounded-xl" />
          <Skeleton height="320px" className="rounded-xl" />
        </div>

        <Skeleton height="200px" className="rounded-xl" />
        <Skeleton height="350px" className="rounded-xl" />
      </div>
    );
  }

  // Smooth Empty State when no profile is analyzed yet
  if (!state) {
    return (
      <div className="py-16 px-4 max-w-xl mx-auto text-center">
        <Card className="p-8 sm:p-10 border-2 border-black bg-white shadow-neo-lg rounded-3xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#ffe566] text-black flex items-center justify-center mx-auto border-2 border-black shadow-neo-sm">
            <Sparkles className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-black">No Profile Analyzed Yet</h2>
            <p className="text-sm text-slate-700 font-medium leading-relaxed">
              To view your Skill-Gap Analysis, build your profile in Step 1 or load our pre-configured demo profile in one click.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleLoadDemo}
              className="w-full sm:w-auto font-black shadow-neo-sm"
              leftIcon={<Sparkles className="w-4 h-4 mr-1.5" />}
            >
              ⚡ Load Demo &amp; Analyze
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/profile')}
              className="w-full sm:w-auto font-bold"
              rightIcon={<ArrowRight className="w-4 h-4 ml-1.5" />}
            >
              Go to Step 1 (Profile)
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { role, analysis, roadmap } = state;
  const hasGaps = analysis.gaps && analysis.gaps.length > 0;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 pb-32">
      {/* 1. Header Banner */}
      <Card className="p-6 sm:p-8 border-2 border-black bg-white shadow-neo-lg rounded-3xl overflow-hidden relative">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Role Info + Readiness Note */}
          <div className="space-y-3 text-center md:text-left flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-[#ffe566] border-2 border-black text-black text-xs font-black shadow-neo-xs">
              <Sparkles className="w-4 h-4 text-black stroke-[2.5]" />
              <span>Target Benchmark</span>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight">
                {role.title}
              </h1>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-white text-black font-black border-2 border-black shadow-neo-xs">
                v{role.version}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed max-w-xl">
              Comparative skill calibration against required industry competencies. Review prioritized gaps and evidence-backed explanations below.
            </p>

            {/* API readiness_note as small print */}
            <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs text-black font-semibold pt-1">
              <Info className="w-4 h-4 text-black flex-shrink-0 stroke-[2.5]" />
              <span className="italic">{analysis.readiness_note}</span>
            </div>
          </div>

          {/* Right: Readiness Gauge */}
          <div className="flex flex-col items-center flex-shrink-0 bg-[#faf6ee] p-4 sm:p-5 rounded-2xl border-2 border-black shadow-neo-sm">
            <Gauge
              value={analysis.readiness}
              size={140}
              strokeWidth={12}
              label="Readiness"
              animate={true}
            />
          </div>
        </div>
      </Card>

      {/* 2. Top Analytics Grid: Category Scores & Radar Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CategoryScoreBars categoryScores={analysis.category_scores} />
        <RadarChartCard radarData={analysis.radar} />
      </div>

      {/* 3. Strengths Section (Compact) */}
      <StrengthsCard strengths={analysis.strengths} />

      {/* 4. Gaps Section: Top 3 Summary & Complete Gap List */}
      {hasGaps ? (
        <div className="space-y-6">
          <TopGapsSummary
            topGaps={analysis.gaps}
            roadmapItems={roadmap?.items}
          />
          <GapList
            gaps={analysis.gaps}
            roadmapItems={roadmap?.items}
          />
        </div>
      ) : (
        /* Empty State when gaps is empty */
        <EmptyState
          icon={<Trophy className="w-6 h-6 text-emerald-600 stroke-[2.5]" />}
          title="You already meet this role's targets"
          description={`Outstanding! Your calibrated proficiencies across all ${role.title} requirements meet or exceed target expectations. You are fully aligned with this role.`}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile')}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Explore Other Roles
            </Button>
          }
          className="p-12 bg-white"
        />
      )}

      {/* 5. Sticky Bottom Action Bar (CTA -> /roadmap) */}
      <Card className="p-5 bg-white border-2 border-black rounded-2xl shadow-neo-lg sticky bottom-4 z-30">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h4 className="text-sm font-black text-black">
              Next Step: Topological Career Roadmap
            </h4>
            <p className="text-xs text-slate-600 font-medium">
              Transform identified skill gaps into a structured schedule fitting your hours.
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => navigate('/roadmap')}
            className="w-full sm:w-auto"
            rightIcon={<ArrowRight className="w-5 h-5 ml-1 stroke-[3]" />}
          >
            Continue to Roadmap
          </Button>
        </div>
      </Card>
    </div>
  );
};
