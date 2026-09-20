import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Gap, RoadmapItem } from '../../types/api';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  BarChart2,
} from 'lucide-react';

export interface GapListProps {
  gaps: Gap[];
  roadmapItems?: RoadmapItem[];
}

export const GapList: React.FC<GapListProps> = ({ gaps, roadmapItems = [] }) => {
  const [expandedGapIds, setExpandedGapIds] = useState<Set<string>>(
    new Set(gaps.slice(0, 1).map((g) => g.skill_id))
  );

  const toggleExpand = (skillId: string) => {
    setExpandedGapIds((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary-600" />
            <CardTitle>All Prioritized Gaps ({gaps.length})</CardTitle>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Sorted deterministically by priority (importance &times; gap &times; dependency &times; interest)
          </p>
        </div>
        <CardDescription>
          Click any skill gap to inspect its complete grounded mathematical explanation and narrative.
        </CardDescription>
      </CardHeader>

      <div className="divide-y divide-slate-100">
        {gaps.map((gap) => {
          const isExpanded = expandedGapIds.has(gap.skill_id);
          const roadmapItem = roadmapItems.find((item) => item.skill_id === gap.skill_id);
          const why = roadmapItem?.why;

          const narrative =
            why?.narrative ||
            `${gap.skill_name} is ${gap.priority_label} priority because your current level is ${gap.level.toFixed(
              1
            )}/10 vs target of ${gap.target.toFixed(1)}/10. Role importance is ${(
              gap.importance * 100
            ).toFixed(0)}%.`;

          const narrativeSource = why?.narrative_source || 'template';

          // Level vs target percentages (0-10 scale)
          const levelPct = Math.min(Math.max((gap.level / 10) * 100, 0), 100);
          const targetPct = Math.min(Math.max((gap.target / 10) * 100, 0), 100);

          return (
            <div
              key={gap.skill_id}
              className={`transition-colors ${
                isExpanded ? 'bg-slate-50/60' : 'hover:bg-slate-50/30'
              }`}
            >
              {/* Main Summary Row */}
              <div
                onClick={() => toggleExpand(gap.skill_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(gap.skill_id);
                  }
                }}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
              >
                {/* Left: Skill name, category, unverified, unblocks */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="text-sm font-bold text-slate-900">{gap.skill_name}</h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      &bull; {gap.category}
                    </span>

                    {/* Unverified icon */}
                    {gap.flag === 'unverified' && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                        title="Unverified difference between self-rating and resume evidence"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        unverified
                      </span>
                    )}
                  </div>

                  {/* Unblocks chips */}
                  {gap.unblocks.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-0.5">
                        <ArrowUpRight className="w-3 h-3" /> unblocks:
                      </span>
                      {gap.unblocks.map((u) => (
                        <span
                          key={u.skill_id}
                          className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200 px-1.5 py-0.2 rounded"
                        >
                          {u.skill_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Middle: Level-vs-Target visual bar */}
                <div className="w-full md:w-56 flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-medium text-slate-600">
                    <span>
                      Level: <strong className="text-slate-900">{gap.level.toFixed(1)}</strong>
                    </span>
                    <span>
                      Target: <strong className="text-slate-900">{gap.target.toFixed(1)}</strong>
                    </span>
                  </div>
                  {/* Dual Bar (0-10 scale) */}
                  <div className="relative w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    {/* Target zone bar (light emerald) */}
                    <div
                      className="absolute top-0 left-0 h-full bg-emerald-200/80 rounded-full"
                      style={{ width: `${targetPct}%` }}
                    />
                    {/* Current level bar (primary indigo) */}
                    <div
                      className="absolute top-0 left-0 h-full bg-primary-600 rounded-full transition-all duration-500"
                      style={{ width: `${levelPct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-right text-red-600 font-semibold">
                    Gap: +{gap.gap.toFixed(1)} levels
                  </div>
                </div>

                {/* Right: Priority, Status badges & expand toggle */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                  <Badge priority={gap.priority_label} size="md">
                    {gap.priority_label} {gap.priority}
                  </Badge>
                  <Badge status={gap.status} size="md">
                    {gap.status.replace('_', ' ')}
                  </Badge>
                  <div className="text-slate-400 p-1">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded "Why" Details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-white/70">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                    {/* Why Header + Source Badge */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                        <HelpCircle className="w-4 h-4 text-primary-600" />
                        Why is this prioritized?
                      </div>

                      <div className="flex items-center gap-2">
                        {narrativeSource === 'llm' ? (
                          <Badge variant="primary" size="sm" className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI Personalized
                          </Badge>
                        ) : (
                          <Badge variant="medium" size="sm">
                            Template Fact
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Grounded Narrative Sentence */}
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      &ldquo;{narrative}&rdquo;
                    </p>

                    {/* Numeric Fact Breakdown Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200 text-center">
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">
                          Current
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {gap.level.toFixed(1)} / 10
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">
                          Target
                        </span>
                        <span className="text-sm font-bold text-emerald-600">
                          {gap.target.toFixed(1)} / 10
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">
                          Skill Gap
                        </span>
                        <span className="text-sm font-bold text-red-600">
                          +{gap.gap.toFixed(1)}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">
                          Role Importance
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {(gap.importance * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200 col-span-2 sm:col-span-1">
                        <span className="block text-[10px] text-slate-400 uppercase font-bold">
                          Dependency
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {(gap.dependency_impact * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Unblocks details if any */}
                    {gap.unblocks.length > 0 && (
                      <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700">Competencies unlocked:</span>
                        {gap.unblocks.map((u) => (
                          <span
                            key={u.skill_id}
                            className="font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]"
                          >
                            {u.skill_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
