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
    <Card className="border-2 border-black bg-white rounded-2xl shadow-neo overflow-hidden">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-black stroke-[2.5]" />
            <CardTitle className="text-base font-black text-black">All Prioritized Gaps ({gaps.length})</CardTitle>
          </div>
          <p className="text-xs text-black font-bold">
            Sorted deterministically by priority (importance &times; gap &times; dependency &times; interest)
          </p>
        </div>
        <CardDescription className="text-xs font-medium text-slate-700">
          Click any skill gap to inspect its complete grounded mathematical explanation and narrative.
        </CardDescription>
      </CardHeader>

      <div className="divide-y-2 divide-black border-t-2 border-black">
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
                isExpanded ? 'bg-[#faf6ee]' : 'hover:bg-[#fdfbf7]'
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
                    <h4 className="text-sm font-black text-black">{gap.skill_name}</h4>
                    <span className="text-[11px] text-slate-700 font-bold">
                      &bull; {gap.category}
                    </span>

                    {/* Unverified icon */}
                    {gap.flag === 'unverified' && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-black text-black bg-[#ff9770] px-2 py-0.5 rounded-lg border border-black shadow-neo-xs"
                        title="Unverified difference between self-rating and resume evidence"
                      >
                        <AlertTriangle className="w-3 h-3 text-black stroke-[3]" />
                        unverified
                      </span>
                    )}
                  </div>

                  {/* Unblocks chips */}
                  {gap.unblocks.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="text-[10px] font-black text-black flex items-center gap-0.5">
                        <ArrowUpRight className="w-3.5 h-3.5 text-black stroke-[3]" /> unblocks:
                      </span>
                      {gap.unblocks.map((u) => (
                        <span
                          key={u.skill_id}
                          className="text-[10px] font-bold text-black bg-white border border-black px-2 py-0.5 rounded-md shadow-neo-xs"
                        >
                          {u.skill_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Middle: Level-vs-Target visual bar */}
                <div className="w-full md:w-56 flex flex-col gap-1.5 flex-shrink-0">
                  <div className="flex justify-between text-[11px] font-black text-black">
                    <span className="inline-flex items-center gap-1">
                      Level: <strong className="text-black bg-white px-1.5 py-0.5 rounded border border-black shadow-neo-xs">{gap.level.toFixed(1)}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      Target: <strong className="text-black bg-[#79e7a8] px-1.5 py-0.5 rounded border border-black shadow-neo-xs">{gap.target.toFixed(1)}</strong>
                    </span>
                  </div>
                  {/* Dual Bar (0-10 scale) */}
                  <div className="relative w-full h-3 bg-slate-200 border-2 border-black rounded-full overflow-hidden shadow-neo-xs">
                    {/* Target zone bar (light emerald) */}
                    <div
                      className="absolute top-0 left-0 h-full bg-[#79e7a8]"
                      style={{ width: `${targetPct}%` }}
                    />
                    {/* Current level bar (cyan) */}
                    <div
                      className="absolute top-0 left-0 h-full bg-[#70d6ff] border-r-2 border-black transition-all duration-500"
                      style={{ width: `${levelPct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-right text-red-700 font-black">
                    Gap: +{gap.gap.toFixed(1)} levels
                  </div>
                </div>

                {/* Right: Priority, Status badges & expand toggle */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center flex-wrap justify-end">
                  <Badge priority={gap.priority_label} size="md">
                    {gap.priority_label} {gap.priority}
                  </Badge>
                  <Badge status={gap.status} size="md">
                    {gap.status.replace('_', ' ')}
                  </Badge>
                  <div className="text-black p-1 flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 stroke-[3]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 stroke-[3]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded "Why" Details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t-2 border-black bg-white">
                  <div className="p-5 rounded-2xl bg-[#faf6ee] border-2 border-black shadow-neo-xs space-y-4">
                    {/* Why Header + Source Badge */}
                    <div className="flex items-center justify-between pb-2 border-b-2 border-black">
                      <div className="flex items-center gap-1.5 text-xs font-black text-black uppercase tracking-wider">
                        <HelpCircle className="w-4 h-4 text-black stroke-[2.5]" />
                        Why is this prioritized?
                      </div>

                      <div className="flex items-center gap-2">
                        {narrativeSource === 'llm' ? (
                          <Badge variant="primary" size="sm" className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 stroke-[2.5]" /> AI Personalized
                          </Badge>
                        ) : (
                          <Badge variant="medium" size="sm">
                            Template Fact
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Grounded Narrative Sentence */}
                    <p className="text-xs text-black leading-relaxed font-bold bg-white p-3 rounded-xl border border-black">
                      &ldquo;{narrative}&rdquo;
                    </p>

                    {/* Numeric Fact Breakdown Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-black text-center">
                      <div className="p-2.5 rounded-xl bg-white border-2 border-black shadow-neo-xs">
                        <span className="block text-[10px] text-slate-600 uppercase font-black">
                          Current
                        </span>
                        <span className="text-sm font-black text-black">
                          {gap.level.toFixed(1)} / 10
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#79e7a8] border-2 border-black shadow-neo-xs">
                        <span className="block text-[10px] text-black uppercase font-black">
                          Target
                        </span>
                        <span className="text-sm font-black text-black">
                          {gap.target.toFixed(1)} / 10
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#ff6b6b]/20 border-2 border-black shadow-neo-xs">
                        <span className="block text-[10px] text-red-900 uppercase font-black">
                          Skill Gap
                        </span>
                        <span className="text-sm font-black text-red-700">
                          +{gap.gap.toFixed(1)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border-2 border-black shadow-neo-xs">
                        <span className="block text-[10px] text-slate-600 uppercase font-black">
                          Role Importance
                        </span>
                        <span className="text-sm font-black text-black">
                          {(gap.importance * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border-2 border-black shadow-neo-xs col-span-2 sm:col-span-1">
                        <span className="block text-[10px] text-slate-600 uppercase font-black">
                          Dependency
                        </span>
                        <span className="text-sm font-black text-black">
                          {(gap.dependency_impact * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Unblocks details if any */}
                    {gap.unblocks.length > 0 && (
                      <div className="text-xs text-black flex items-center gap-2 flex-wrap">
                        <span className="font-black text-black">Competencies unlocked:</span>
                        {gap.unblocks.map((u) => (
                          <span
                            key={u.skill_id}
                            className="font-black px-2.5 py-0.5 rounded-lg bg-[#70d6ff] text-black border border-black text-[11px] shadow-neo-xs"
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
