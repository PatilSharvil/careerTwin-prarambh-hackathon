import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Gap, RoadmapItem } from '../../types/api';
import { ArrowUpRight, Flame } from 'lucide-react';

export interface TopGapsSummaryProps {
  topGaps: Gap[];
  roadmapItems?: RoadmapItem[];
}

export const TopGapsSummary: React.FC<TopGapsSummaryProps> = ({
  topGaps,
  roadmapItems = [],
}) => {
  if (topGaps.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-black bg-white rounded-2xl shadow-neo overflow-hidden">
      <CardHeader className="bg-[#faf6ee] border-b-2 border-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-600 stroke-[2.5]" />
            <CardTitle className="text-base font-black text-black">Top 3 Critical Skill Gaps</CardTitle>
          </div>
          <Badge variant="critical" size="sm">
            Highest Priority
          </Badge>
        </div>
        <CardDescription className="text-xs font-medium text-slate-700">
          Highest leverage skill gaps determined by role importance, dependency closure, and current proficiency.
        </CardDescription>
      </CardHeader>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        {topGaps.slice(0, 3).map((gap, index) => {
          // Find matching roadmap item why narrative
          const roadmapItem = roadmapItems.find((item) => item.skill_id === gap.skill_id);
          const narrative =
            roadmapItem?.why?.narrative ||
            `${gap.skill_name} is a ${gap.priority_label} gap (${gap.level.toFixed(1)}/10 vs ${gap.target.toFixed(1)}/10 required). Resolving this unblocks key downstream competencies.`;

          return (
            <div
              key={gap.skill_id}
              className="p-5 rounded-2xl border-2 border-black bg-[#faf6ee] shadow-neo-xs hover:shadow-neo hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-black text-[#ffe566] border border-black flex items-center justify-center text-xs font-black shadow-neo-xs">
                      {index + 1}
                    </span>
                    <h4 className="text-sm font-black text-black">{gap.skill_name}</h4>
                  </div>
                  <Badge priority={gap.priority_label} size="sm">
                    {gap.priority_label} {gap.priority}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-black mb-3 font-bold">
                  <span className="whitespace-nowrap">Level: <strong className="text-black bg-white px-1.5 py-0.5 rounded border border-black shadow-neo-xs">{gap.level.toFixed(1)}</strong></span>
                  <span className="text-black">&rarr;</span>
                  <span className="whitespace-nowrap">Target: <strong className="text-black bg-[#79e7a8] px-1.5 py-0.5 rounded border border-black shadow-neo-xs">{gap.target.toFixed(1)}</strong></span>
                  <span className="text-red-700 font-black bg-[#ff6b6b]/20 px-1.5 py-0.5 rounded border border-red-400 text-[11px] whitespace-nowrap">(+{gap.gap.toFixed(1)})</span>
                </div>

                <p className="text-xs text-slate-800 leading-relaxed italic bg-white p-3 rounded-xl border border-black mb-3 font-medium">
                  &ldquo;{narrative}&rdquo;
                </p>
              </div>

              {gap.unblocks.length > 0 && (
                <div className="pt-2 border-t border-black flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-black font-black flex items-center gap-0.5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-black stroke-[3]" /> Unlocks:
                  </span>
                  {gap.unblocks.map((u) => (
                    <span
                      key={u.skill_id}
                      className="text-[10px] font-black text-black bg-[#70d6ff] px-2 py-0.5 rounded-lg border border-black shadow-neo-xs"
                    >
                      {u.skill_name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
