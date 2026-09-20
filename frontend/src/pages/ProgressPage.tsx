import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import {
  getRoadmap,
  getRoles,
  getToday,
  completeProgress,
  markKnown,
  updateMarket,
} from '../api/endpoints';
import { ApiError } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { Gauge } from '../components/ui/Gauge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import type { AnalyzeResponse, Diff, ProgressResponse } from '../types/api';

import {
  TodayCard,
  FocusNextUpCard,
  DiffBanner,
  RoadmapChecklist,
  CoachPanel,
} from '../components/progress';

import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react';

export const ProgressPage: React.FC = () => {
  const { showToast } = useToast();

  const state = useStore((s) => s.state);
  const setState = useStore((s) => s.setState);
  const roles = useStore((s) => s.roles);
  const setRoles = useStore((s) => s.setRoles);
  const lastDiff = useStore((s) => s.lastDiff);
  const setLastDiff = useStore((s) => s.setLastDiff);
  const lastNarrative = useStore((s) => s.lastNarrative);
  const setLastNarrative = useStore((s) => s.setLastNarrative);
  const today = useStore((s) => s.today);
  const setToday = useStore((s) => s.setToday);
  const todayMessage = useStore((s) => s.todayMessage);
  const setTodayMessage = useStore((s) => s.setTodayMessage);

  const [isLoading, setIsLoading] = useState<boolean>(!state);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isTodayLoading, setIsTodayLoading] = useState<boolean>(false);
  const [highlightedSkillIds, setHighlightedSkillIds] = useState<Set<string>>(new Set());

  // Load initial roadmap, today pick, and roles if missing
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        if (!state) {
          setIsLoading(true);
          const roadmapRes = await getRoadmap();
          if (isMounted) {
            setState(roadmapRes);
          }
        }

        // Fetch roles to know market_update_available status
        if (roles.length === 0) {
          const rolesRes = await getRoles();
          if (isMounted) {
            setRoles(rolesRes.roles);
          }
        }

        // Fetch today pick
        if (!today) {
          setIsTodayLoading(true);
          const todayRes = await getToday();
          if (isMounted) {
            setToday(todayRes.today);
            setTodayMessage(todayRes.message);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message =
            err instanceof ApiError ? err.message : 'Failed to initialize progress view.';
          showToast({
            type: 'error',
            title: 'Loading Error',
            message,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsTodayLoading(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, [state, setState, roles.length, setRoles, today, setToday, setTodayMessage, showToast]);

  // Helper to trigger 4-second highlight on changed skills
  const highlightChanges = useCallback((diff: Diff) => {
    const changed = new Set<string>();

    if (diff.trigger.skill_id) changed.add(diff.trigger.skill_id);
    diff.level_changes?.forEach((l) => changed.add(l.skill_id));
    diff.unlocked?.forEach((u) => changed.add(u.skill_id));
    diff.removed?.forEach((r) => changed.add(r.item_id));
    diff.added?.forEach((a) => changed.add(a.item_id));
    diff.reordered?.forEach((r) => changed.add(r.item_id));
    diff.reprioritized?.forEach((r) => changed.add(r.skill_id));
    diff.requirement_changes?.forEach((req) => changed.add(req.skill_id));

    setHighlightedSkillIds(changed);

    // Auto-clear highlight after 4 seconds as per prompt requirement
    setTimeout(() => {
      setHighlightedSkillIds(new Set());
    }, 4000);
  }, []);

  // Central handler after any state-changing action
  const handleProgressUpdate = useCallback(
    async (res: ProgressResponse, actionTitle: string) => {
      // 1. Replace store.state with response.state
      setState(res.state);

      // 2. Store lastDiff and narrative
      setLastDiff(res.diff);
      setLastNarrative({
        narrative: res.narrative,
        source: res.narrative_source,
      });

      // 3. Highlight changed items for 4 seconds
      highlightChanges(res.diff);

      // 4. Refetch /today
      try {
        setIsTodayLoading(true);
        const todayRes = await getToday();
        setToday(todayRes.today);
        setTodayMessage(todayRes.message);
      } catch {
        // Silently handle today pick error if secondary
      } finally {
        setIsTodayLoading(false);
      }

      // 5. Show toast
      showToast({
        type: 'success',
        title: actionTitle,
        message: res.narrative,
      });
    },
    [setState, setLastDiff, setLastNarrative, highlightChanges, setToday, setTodayMessage, showToast]
  );

  // Action: Mark skill complete
  const handleCompleteSkill = async (skillId: string) => {
    setLoadingAction(`skill_${skillId}`);
    try {
      const res = await completeProgress({ skill_id: skillId });
      await handleProgressUpdate(res, `Skill Completed: ${skillId}`);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to mark skill complete.';
      showToast({
        type: 'error',
        title: 'Action Failed',
        message,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Action: Mark activity complete
  const handleCompleteActivity = async (skillId: string, activityId: string) => {
    setLoadingAction(`act_${activityId}`);
    try {
      const res = await completeProgress({ skill_id: skillId, activity_id: activityId });
      await handleProgressUpdate(res, 'Activity Completed');
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to complete activity.';
      showToast({
        type: 'error',
        title: 'Action Failed',
        message,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Action: Mark skill known with level
  const handleMarkKnown = async (skillId: string, level: number) => {
    setLoadingAction(`known_${skillId}`);
    try {
      const res = await markKnown({ skill_id: skillId, level });
      await handleProgressUpdate(res, `Marked Known: ${skillId}`);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to record known skill.';
      showToast({
        type: 'error',
        title: 'Action Failed',
        message,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Action: Market update
  const handleMarketUpdate = async () => {
    setLoadingAction('market_update');
    try {
      const res = await updateMarket({ role_id: null });

      // Update market_update_available on active role in store
      if (state?.role?.role_id) {
        setRoles(
          roles.map((r) =>
            r.role_id === state.role.role_id
              ? { ...r, market_update_available: false, version: '2026.10' }
              : r
          )
        );
      }

      await handleProgressUpdate(res, 'Market Standards Updated');
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to update market standards.';
      showToast({
        type: 'error',
        title: 'Market Update Failed',
        message,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Callback for when Coach modifies the plan
  const handleCoachPlanUpdated = (
    newState: AnalyzeResponse,
    diff: Diff | null,
    coachReply: string
  ) => {
    setState(newState);
    if (diff) {
      setLastDiff(diff);
      setLastNarrative({
        narrative: coachReply,
        source: 'llm',
      });
      highlightChanges(diff);
    }

    // Refetch /today
    getToday().then((todayRes) => {
      setToday(todayRes.today);
      setTodayMessage(todayRes.message);
    });

    showToast({
      type: 'success',
      title: 'Plan Updated by Coach',
      message: coachReply,
    });
  };

  if (isLoading || !state?.roadmap) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <Skeleton height="140px" className="rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <Skeleton height="260px" className="rounded-xl" />
            <Skeleton height="200px" className="rounded-xl" />
          </div>
          <div className="lg:col-span-7">
            <Skeleton height="480px" className="rounded-xl" />
          </div>
        </div>
        <Skeleton height="400px" className="rounded-xl" />
      </div>
    );
  }

  // Active role info & market update availability
  const activeRoleId = state.role.role_id;
  const currentRole = roles.find((r) => r.role_id === activeRoleId);
  const isMarketUpdateAvailable = currentRole?.market_update_available ?? false;

  // Completed items count
  const completedCount = state.roadmap.items.filter((item) => item.status === 'done').length;
  const totalCount = state.roadmap.items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Readiness delta from lastDiff
  const readinessDelta = lastDiff
    ? Number((lastDiff.readiness_after - lastDiff.readiness_before).toFixed(1))
    : null;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* 1. Header Bar: Progress Counter + Readiness Gauge with Delta + Market Update Button */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Role Info & Completed Counter */}
        <div className="space-y-2 text-center md:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-3 py-1 rounded-full border border-primary-200">
              Target: {state.role.title}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Version {state.role.version}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Plan v{state.roadmap.version}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Completed {completedCount} / {totalCount} items
          </h1>

          <div className="flex items-center justify-center md:justify-start gap-3 text-xs text-slate-600">
            <span>{progressPercent}% Roadmap Completion</span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {state.roadmap.total_hours} total hours planned
            </span>
          </div>

          {/* Mini progress bar */}
          <div className="w-full max-w-md h-2 rounded-full bg-slate-100 overflow-hidden mt-2">
            <div
              className="h-full bg-primary-600 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Readiness Gauge with Delta & Market Update Button */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Gauge & Delta Stat */}
          <div className="flex items-center gap-4 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
            <Gauge
              value={state.analysis.readiness}
              size={100}
              strokeWidth={10}
              label="Readiness"
            />

            <div className="text-left space-y-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Alignment Delta
              </div>
              {lastDiff && readinessDelta !== null ? (
                <div>
                  <div
                    className={`inline-flex items-center gap-1 text-sm font-black px-2 py-0.5 rounded-md border ${
                      readinessDelta >= 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {readinessDelta >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>{readinessDelta >= 0 ? `+${readinessDelta}%` : `${readinessDelta}%`}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {lastDiff.readiness_before.toFixed(1)}% → {lastDiff.readiness_after.toFixed(1)}%
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-medium">
                  Baseline calibrated
                </div>
              )}
            </div>
          </div>

          {/* Market Update Button (only when market_update_available is true) */}
          {isMarketUpdateAvailable && (
            <div className="flex flex-col items-center sm:items-start">
              <Button
                variant="primary"
                size="md"
                onClick={handleMarketUpdate}
                disabled={Boolean(loadingAction)}
                isLoading={loadingAction === 'market_update'}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md ring-4 ring-purple-500/20 text-xs font-bold"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-purple-200 animate-spin" />
                Apply Market Update
              </Button>
              <span className="text-[10px] text-purple-700 font-semibold mt-1">
                New benchmark v2026.10 available
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main 2-Column Split:
          Left: Today card + Current focus + Next up
          Right: "Changes since last plan" (DiffBanner)
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Today Card + Focus & Next Up */}
        <div className="lg:col-span-6 space-y-6">
          <TodayCard
            today={today}
            message={todayMessage}
            isLoading={isTodayLoading}
          />

          <FocusNextUpCard
            items={state.roadmap.items}
          />
        </div>

        {/* Right Column: Changes Since Last Plan (DiffBanner) */}
        <div className="lg:col-span-6">
          <DiffBanner
            diff={lastDiff}
            narrative={lastNarrative?.narrative}
            narrativeSource={lastNarrative?.source}
          />
        </div>
      </div>

      {/* 3. Below: Roadmap Execution Checklist */}
      <div className="pt-4">
        <RoadmapChecklist
          items={state.roadmap.items}
          phases={state.roadmap.phases}
          highlightedSkillIds={highlightedSkillIds}
          onCompleteSkill={handleCompleteSkill}
          onCompleteActivity={handleCompleteActivity}
          onMarkKnown={handleMarkKnown}
          loadingAction={loadingAction}
        />
      </div>

      {/* 4. Collapsible Coach Chat Panel */}
      <CoachPanel onPlanUpdated={handleCoachPlanUpdated} />
    </div>
  );
};
