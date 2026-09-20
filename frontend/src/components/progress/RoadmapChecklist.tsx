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
        return <CheckCircle2 className="w-4 h-4 text-black" />;
      case 'in_progress':
        return <PlayCircle className="w-4 h-4 text-black" />;
      case 'available':
        return <Unlock className="w-4 h-4 text-black" />;
      case 'locked':
        return <Lock className="w-4 h-4 text-neutral-500" />;
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-4 h-4 text-black" />;
      case 'project':
        return <Code2 className="w-4 h-4 text-black" />;
      case 'doc':
        return <FileText className="w-4 h-4 text-black" />;
      case 'certification':
        return <Award className="w-4 h-4 text-black" />;
      default:
        return <FileText className="w-4 h-4 text-black" />;
    }
  };

  const getPhaseStyles = (phase: Phase) => {
    switch (phase) {
      case 'Foundation':
        return 'bg-[#70d6ff] text-black border-2 border-black shadow-neo-xs';
      case 'Core':
        return 'bg-[#b892ff] text-black border-2 border-black shadow-neo-xs';
      case 'Applied':
        return 'bg-[#ff9770] text-black border-2 border-black shadow-neo-xs';
      case 'Capstone':
        return 'bg-[#ffe566] text-black border-2 border-black shadow-neo-xs';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-2 border-black gap-3">
        <div>
          <h2 className="text-2xl font-black text-black tracking-tight">
            Roadmap Execution Checklist
          </h2>
          <p className="text-xs font-bold text-neutral-600 mt-0.5">
            Mark individual activities or full skills complete to dynamically advance your career twin readiness.
          </p>
        </div>
        <span className="text-xs font-black text-black bg-[#ffe566] border-2 border-black shadow-neo-xs px-3.5 py-1.5 rounded-xl self-start sm:self-center">
          {items.filter((i) => i.status === 'done').length} / {items.length} Completed
        </span>
      </div>

      {groupedItems.map(({ phase, items: phaseItems }) => {
        if (phaseItems.length === 0) return null;

        return (
          <div key={phase} className="space-y-4">
            {/* Phase Header */}
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl ${getPhaseStyles(
                  phase
                )}`}
              >
                {phase} Phase
              </span>
              <div className="h-0.5 bg-black flex-1" />
              <span className="text-xs text-neutral-600 font-black">
                {phaseItems.length} milestone{phaseItems.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* List of Roadmap Items */}
            <div className="space-y-3.5">
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
                    className={`border-2 border-black rounded-2xl transition-all duration-300 overflow-hidden ${
                      isHighlighted
                        ? 'bg-[#ffe566]/20 ring-3 ring-black shadow-neo-lg'
                        : isDone
                        ? 'bg-[#79e7a8]/20 shadow-neo-xs'
                        : isLocked
                        ? 'bg-neutral-100 opacity-80 shadow-none'
                        : 'bg-white shadow-neo hover:shadow-neo-lg'
                    }`}
                  >
                    {/* Item Row Header */}
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Left: Position, Status, Skill name & metadata */}
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <span
                            className={`w-8 h-8 rounded-xl border-2 border-black flex items-center justify-center text-xs font-black flex-shrink-0 shadow-neo-xs ${
                              isDone
                                ? 'bg-[#79e7a8] text-black'
                                : isLocked
                                ? 'bg-neutral-200 text-neutral-600'
                                : 'bg-[#ffe566] text-black'
                            }`}
                          >
                            #{item.position}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3
                                className={`text-base font-black break-words [overflow-wrap:anywhere] ${
                                  isDone
                                    ? 'text-neutral-500 line-through'
                                    : 'text-black'
                                }`}
                              >
                                {item.skill_name}
                              </h3>

                              {isHighlighted && (
                                <span className="inline-flex items-center text-[10px] font-black text-black bg-[#ff70a6] border-2 border-black px-2 py-0.5 rounded-lg shadow-neo-xs animate-pulse">
                                  <Sparkles className="w-2.5 h-2.5 mr-1" />
                                  Just Updated
                                </span>
                              )}

                              {item.is_capstone && (
                                <span className="text-[10px] font-black uppercase bg-[#ff9770] text-black border-2 border-black px-2 py-0.5 rounded-lg shadow-neo-xs">
                                  Capstone Project
                                </span>
                              )}

                              <Badge
                                status={item.status}
                                size="sm"
                              >
                                <span className="inline-flex items-center gap-1 font-black">
                                  {getStatusIcon(item.status)}
                                  <span className="capitalize">
                                    {item.status.replace('_', ' ')}
                                  </span>
                                </span>
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600 font-bold">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                                {item.hours} hrs total (Weeks {item.week_start}–{item.week_end})
                              </span>
                              {item.why && (
                                <span className="inline-flex items-center gap-1 text-black font-black bg-neutral-100 px-2 py-0.5 rounded-md border border-black/30">
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
                                <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#faf6ee] border-2 border-black shadow-neo-xs">
                                  <label className="text-[11px] font-black text-black pl-1">
                                    Lvl:
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
                                    className="w-14 px-1.5 py-0.5 text-xs font-black text-black bg-white border-2 border-black rounded-lg text-center focus:ring-0 outline-none shadow-neo-xs"
                                  />
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="px-2.5 py-1 text-[11px]"
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
                                    className="px-2 py-1 text-[11px] text-neutral-600 hover:text-black font-bold"
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
                                  <KnownIcon className="w-3.5 h-3.5 mr-1 text-black" />
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
                                className="text-xs"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Mark complete
                              </Button>
                            </>
                          )}

                          {isDone && (
                            <span className="inline-flex items-center text-xs font-black text-black bg-[#79e7a8] border-2 border-black shadow-neo-xs px-3 py-1 rounded-xl">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-black" />
                              Completed
                            </span>
                          )}

                          {/* Toggle Activities Button */}
                          {item.activities && item.activities.length > 0 && (
                            <button
                              onClick={() => toggleExpand(item.item_id)}
                              className="inline-flex items-center text-black font-black text-xs px-3 py-1.5 rounded-xl border-2 border-black bg-white hover:bg-[#faf6ee] shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5 transition-all"
                              aria-label="Toggle activities"
                            >
                              <span className="mr-1">{item.activities.length} activities</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Prerequisites info banner if present and not met */}
                      {item.prerequisites && item.prerequisites.length > 0 && !isDone && (
                        <div className="mt-3.5 pt-3 border-t-2 border-black/10 flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-black text-black">Prerequisites:</span>
                          {item.prerequisites.map((p) => (
                            <span
                              key={p.skill_id}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border-2 border-black shadow-neo-xs ${
                                p.met
                                  ? 'bg-[#79e7a8] text-black'
                                  : 'bg-[#ffe566] text-black'
                              }`}
                            >
                              {p.met ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-black" />
                              )}
                              {p.skill_name} (min lvl {p.min_level})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expandable Activities Checklist */}
                    {isExpanded && item.activities && item.activities.length > 0 && (
                      <div className="bg-[#fdfbf7] border-t-2 border-black p-4 sm:p-5 space-y-3">
                        <div className="text-xs font-black uppercase tracking-wider text-black mb-2">
                          Required Learning Activities
                        </div>

                        {item.activities.map((act) => {
                          const isActLoading = loadingAction === `act_${act.activity_id}`;

                          return (
                            <div
                              key={act.activity_id}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border-2 border-black transition-all ${
                                act.completed
                                  ? 'bg-[#79e7a8]/30 shadow-neo-xs'
                                  : 'bg-white shadow-neo-xs hover:shadow-neo'
                              }`}
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <span className="p-1.5 rounded-lg bg-[#ffe566] border-2 border-black text-black flex-shrink-0 shadow-neo-xs">
                                  {getActivityTypeIcon(act.type)}
                                </span>

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4
                                      className={`text-xs font-black break-words [overflow-wrap:anywhere] ${
                                        act.completed
                                          ? 'text-neutral-500 line-through'
                                          : 'text-black'
                                      }`}
                                    >
                                      {act.title}
                                    </h4>
                                    <span className="capitalize text-[10px] font-black bg-neutral-100 border border-black px-2 py-0.5 rounded-md">
                                      {act.type}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-neutral-600 font-bold">
                                    <span>by {act.provider}</span>
                                    <span>•</span>
                                    <span>{act.hours} hrs</span>
                                    <span>•</span>
                                    <span className="text-black font-black bg-[#79e7a8] px-1.5 py-0.2 rounded border border-black">
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
                                    className="text-xs font-black text-black hover:bg-[#ffe566] inline-flex items-center px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs transition-colors"
                                  >
                                    <span>Open</span>
                                    <ExternalLink className="w-3.5 h-3.5 ml-1" />
                                  </a>
                                )}

                                {act.completed ? (
                                  <span className="inline-flex items-center text-xs font-black text-black bg-[#79e7a8] border-2 border-black shadow-neo-xs px-2.5 py-1 rounded-xl">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-black" />
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
                                    className="text-xs px-3 py-1"
                                  >
                                    <Check className="w-3.5 h-3.5 mr-1" />
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
