import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getRoadmap } from '../api/endpoints';
import { ApiError } from '../api/client';
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
  AlertCircle,
} from 'lucide-react';

export const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const state = useStore((s) => s.state);
  const setState = useStore((s) => s.setState);

  const [isLoading, setIsLoading] = useState<boolean>(!state);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAnalysis = () => {
    setIsLoading(true);
    setLoadError(null);

    getRoadmap()
      .then((res) => {
        setState(res);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof ApiError ? err.message : 'Failed to load analysis state.';
        setLoadError(message);
        showToast({
          type: 'error',
          title: 'Error Loading Analysis',
          message,
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // If store.state is empty on mount, call GET /roadmap once
  useEffect(() => {
    if (state !== null) {
      setIsLoading(false);
      return;
    }

    fetchAnalysis();
  }, [state]);

  if (!state && loadError) {
    return (
      <div className="py-16 px-4 max-w-md mx-auto text-center">
        <Card className="p-8 border-slate-200 bg-white shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Failed to Load Analysis</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{loadError}</p>
          <Button variant="primary" size="sm" onClick={fetchAnalysis}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  // Loading Skeleton
  if (isLoading || !state) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
        {/* Header Skeleton */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 w-full md:w-2/3">
            <Skeleton height="32px" width="60%" />
            <Skeleton height="16px" width="80%" />
            <Skeleton height="14px" width="40%" />
          </div>
          <Skeleton variant="circular" width={140} height={140} />
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton height="320px" className="rounded-xl" />
          <Skeleton height="320px" className="rounded-xl" />
        </div>

        {/* Gaps Skeleton */}
        <Skeleton height="200px" className="rounded-xl" />
        <Skeleton height="350px" className="rounded-xl" />
      </div>
    );
  }

  const { role, analysis, roadmap } = state;
  const hasGaps = analysis.gaps && analysis.gaps.length > 0;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 pb-32">
      {/* 1. Header Banner */}
      <Card className="p-6 sm:p-8 border-slate-200 bg-white shadow-sm overflow-hidden relative">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left: Role Info + Readiness Note */}
          <div className="space-y-3 text-center md:text-left flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Target Benchmark</span>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {role.title}
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                v{role.version}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
              Comparative skill calibration against required industry competencies. Review prioritized gaps and evidence-backed explanations below.
            </p>

            {/* API readiness_note as small print */}
            <div className="flex items-center justify-center md:justify-start gap-1.5 text-[11px] text-slate-500 pt-1">
              <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="italic">{analysis.readiness_note}</span>
            </div>
          </div>

          {/* Right: Readiness Gauge */}
          <div className="flex flex-col items-center flex-shrink-0 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-100">
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
          icon={<Trophy className="w-6 h-6 text-emerald-600" />}
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
      <Card className="p-5 bg-white border-slate-300 shadow-md sticky bottom-4 z-30">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h4 className="text-sm font-bold text-slate-900">
              Next Step: Topological Career Roadmap
            </h4>
            <p className="text-xs text-slate-500">
              Transform identified skill gaps into a structured schedule fitting your hours.
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => navigate('/roadmap')}
            className="w-full sm:w-auto"
            rightIcon={<ArrowRight className="w-5 h-5 ml-1" />}
          >
            Continue to Roadmap
          </Button>
        </div>
      </Card>
    </div>
  );
};
