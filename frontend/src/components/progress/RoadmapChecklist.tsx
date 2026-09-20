import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Phase, RoadmapItem } from '../../types/api';
import {
  CheckCircle2,
  PlayCircle,
  Unlock,
  Lock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Code2,
  FileText,
  Award,
  Check,
  Award as KnownIcon,
  Clock,
  Sparkles,
} from 'lucide-react';

export interface RoadmapChecklistProps {
  items: RoadmapItem[];
  phases: Phase[];
  highlightedSkillIds: Set<string>;
  onCompleteSkill: (skillId: string) => Promise<void>;
  onCompleteActivity: (skillId: string, activityId: string) => Promise<void>;
  onMarkKnown: (skillId: string, level: number) => Promise<void>;
  loadingAction: string | null;
}

export const RoadmapChecklist: React.FC<RoadmapChecklistProps> = ({
  items,
  phases,
  highlightedSkillIds,
  onCompleteSkill,
  onCompleteActivity,
  onMarkKnown,
  loadingAction,
}) => {
  // Accordion open state for activities per item
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Inline "I already know this" level input state: itemId -> number | undefined
  const [knownLevelInputs, setKnownLevelInputs] = useState<Record<string, number>>({});
  const [showKnownInput, setShowKnownInput] = useState<Record<string, boolean>>({});

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const getStatusIcon = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'in_progress':
        return <PlayCircle className="w-4 h-4 text-violet-600" />;
      case 'available':
        return <Unlock className="w-4 h-4 text-blue-600" />;
      case 'locked':
        return <Lock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-3.5 h-3.5 text-blue-500" />;
      case 'project':
        return <Code2 className="w-3.5 h-3.5 text-purple-500" />;
      case 'doc':
        return <FileText className="w-3.5 h-3.5 text-amber-500" />;
      case 'certification':
        return <Award className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getPhaseStyles = (phase: Phase) => {
    switch (phase) {
      case 'Foundation':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Core':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'Applied':
        return 'bg-violet-50 text-violet-800 border-violet-200';
      case 'Capstone':
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  // Group items by phase following the given phase order
  const groupedItems = phases.map((phase) => ({
    phase,
    items: items
      .filter((item) => item.phase === phase)
      .sort((a, b) => a.position - b.position),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Roadmap Execution Checklist
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mark individual activities or full skills complete to dynamically advance your career twin readiness.
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {items.filter((i) => i.status === 'done').length} / {items.length} Completed
        </span>
      </div>

      {groupedItems.map(({ phase, items: phaseItems }) => {
        if (phaseItems.length === 0) return null;

        return (
          <div key={phase} className="space-y-3">
            {/* Phase Header */}
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${getPhaseStyles(
                  phase
                )}`}
              >
                {phase} Phase
              </span>
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs text-slate-400 font-medium">
                {phaseItems.length} milestone{phaseItems.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* List of Roadmap Items */}
            <div className="space-y-3">
              {phaseItems.map((item) => {
                const isHighlighted =
                  highlightedSkillIds.has(item.skill_id || '') ||
                  highlightedSkillIds.has(item.item_id);
                const isExpanded = expandedItems[item.item_id] ?? (item.status === 'in_progress');
                const isDone = item.status === 'done';
                const isLocked = item.status === 'locked';
                const isShowingKnown = showKnownInput[item.item_id] || false;
                const enteredLevel = knownLevelInputs[item.item_id] ?? (item.why?.target ?? 7.0);

                const isSkillActionLoading =
                  loadingAction === `skill_${item.skill_id}` ||
                  loadingAction === `known_${item.skill_id}`;

                return (
                  <Card
                    key={item.item_id}
                    className={`border transition-all duration-700 overflow-hidden ${
                      isHighlighted
                        ? 'ring-2 ring-primary-500 bg-primary-50/40 shadow-md'
                        : isDone
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : isLocked
                        ? 'border-slate-200 bg-slate-50/60 opacity-90'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    {/* Item Row Header */}
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left: Position, Status, Skill name & metadata */}
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              isDone
                                ? 'bg-emerald-100 text-emerald-800'
                                : isLocked
                                ? 'bg-slate-200 text-slate-500'
                                : 'bg-primary-100 text-primary-800'
                            }`}
                          >
                            #{item.position}
                          </span>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <h3
                                className={`text-base font-bold truncate ${
                                  isDone
                                    ? 'text-emerald-900 line-through'
                                    : 'text-slate-900'
                                }`}
                              >
                                {item.skill_name}
                              </h3>

                              {isHighlighted && (
                                <span className="inline-flex items-center text-[10px] font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full animate-pulse">
                                  <Sparkles className="w-2.5 h-2.5 mr-1" />
                                  Just Updated
                                </span>
                              )}

                              {item.is_capstone && (
                                <Badge variant="primary" size="sm">
                                  Capstone Project
                                </Badge>
                              )}

                              <Badge
                                status={item.status}
                                size="sm"
                              >
                                <span className="inline-flex items-center gap-1">
                                  {getStatusIcon(item.status)}
                                  <span className="capitalize">
                                    {item.status.replace('_', ' ')}
                                  </span>
                                </span>
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {item.hours} hrs total (Weeks {item.week_start}–{item.week_end})
                              </span>
                              {item.why && (
                                <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                                  Level {item.why.level.toFixed(1)} / {item.why.target.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                          {!isDone && item.skill_id && (
                            <>
                              {/* "I already know this" Button or Form */}
                              {isShowingKnown ? (
                                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 border border-slate-300">
                                  <label className="text-[11px] font-semibold text-slate-600 pl-1">
                                    Level:
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.5"
                                    value={enteredLevel}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val)) {
                                        setKnownLevelInputs((prev) => ({
                                          ...prev,
                                          [item.item_id]: Math.min(Math.max(val, 0), 10),
                                        }));
                                      }
                                    }}
                                    className="w-14 px-1.5 py-0.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded text-center focus:ring-1 focus:ring-primary-500 outline-none"
                                  />
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="px-2 py-0.5 text-[11px]"
                                    disabled={Boolean(loadingAction)}
                                    onClick={async () => {
                                      if (!item.skill_id) return;
                                      await onMarkKnown(item.skill_id, enteredLevel);
                                      setShowKnownInput((prev) => ({ ...prev, [item.item_id]: false }));
                                    }}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-1.5 py-0.5 text-[11px] text-slate-500"
                                    onClick={() =>
                                      setShowKnownInput((prev) => ({ ...prev, [item.item_id]: false }))
                                    }
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    setShowKnownInput((prev) => ({ ...prev, [item.item_id]: true }))
                                  }
                                  disabled={Boolean(loadingAction) || isLocked}
                                  className="text-xs"
                                >
                                  <KnownIcon className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                  I already know this
                                </Button>
                              )}

                              {/* "Mark complete" Button */}
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => item.skill_id && onCompleteSkill(item.skill_id)}
                                disabled={Boolean(loadingAction) || isLocked}
                                isLoading={isSkillActionLoading}
                                className="text-xs shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Mark complete
                              </Button>
                            </>
                          )}

                          {isDone && (
                            <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-3 py-1 rounded-md">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Completed
                            </span>
                          )}

                          {/* Toggle Activities Button */}
                          {item.activities && item.activities.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleExpand(item.item_id)}
                              className="text-slate-500 hover:text-slate-800 text-xs px-2"
                              aria-label="Toggle activities"
                            >
                              <span className="mr-1">{item.activities.length} activities</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Prerequisites info banner if present and not met */}
                      {item.prerequisites && item.prerequisites.length > 0 && !isDone && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-slate-600">Prerequisites:</span>
                          {item.prerequisites.map((p) => (
                            <span
                              key={p.skill_id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${
                                p.met
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {p.met ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Lock className="w-3 h-3 text-amber-600" />
                              )}
                              {p.skill_name} (min lvl {p.min_level})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expandable Activities Checklist */}
                    {isExpanded && item.activities && item.activities.length > 0 && (
                      <div className="bg-slate-50/70 border-t border-slate-100 p-4 sm:p-5 space-y-2.5">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Required Learning Activities
                        </div>

                        {item.activities.map((act) => {
                          const isActLoading = loadingAction === `act_${act.activity_id}`;

                          return (
                            <div
                              key={act.activity_id}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border transition-colors ${
                                act.completed
                                  ? 'bg-emerald-50/40 border-emerald-200'
                                  : 'bg-white border-slate-200/90 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <span className="p-1 rounded bg-slate-100 text-slate-600 flex-shrink-0 mt-0.5">
                                  {getActivityTypeIcon(act.type)}
                                </span>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4
                                      className={`text-xs font-semibold ${
                                        act.completed
                                          ? 'text-emerald-900 line-through'
                                          : 'text-slate-900'
                                      }`}
                                    >
                                      {act.title}
                                    </h4>
                                    <Badge variant="outline" size="sm" className="capitalize text-[10px]">
                                      {act.type}
                                    </Badge>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                    <span>by {act.provider}</span>
                                    <span>•</span>
                                    <span>{act.hours} hrs</span>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-medium">
                                      +{act.level_gain.toFixed(1)} level
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Activity Actions */}
                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {act.url && (
                                  <a
                                    href={act.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium text-primary-600 hover:text-primary-800 inline-flex items-center px-2 py-1 rounded hover:bg-primary-50 transition-colors"
                                  >
                                    <span>Open</span>
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                  </a>
                                )}

                                {act.completed ? (
                                  <span className="inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-md">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                    Done
                                  </span>
                                ) : (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                      item.skill_id &&
                                      onCompleteActivity(item.skill_id, act.activity_id)
                                    }
                                    disabled={Boolean(loadingAction) || isLocked}
                                    isLoading={isActLoading}
                                    className="text-xs px-2.5 py-1"
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Done
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
