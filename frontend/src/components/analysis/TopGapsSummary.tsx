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
    <Card className="border-slate-200 overflow-hidden">
      <CardHeader className="bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500" />
            <CardTitle>Top 3 Critical Skill Gaps</CardTitle>
          </div>
          <Badge variant="critical" size="sm">
            Highest Priority
          </Badge>
        </div>
        <CardDescription>
          Highest leverage skill gaps determined by role importance, dependency closure, and current proficiency.
        </CardDescription>
      </CardHeader>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {topGaps.slice(0, 3).map((gap, index) => {
          // Find matching roadmap item why narrative
          const roadmapItem = roadmapItems.find((item) => item.skill_id === gap.skill_id);
          const narrative =
            roadmapItem?.why?.narrative ||
            `${gap.skill_name} is a ${gap.priority_label} gap (${gap.level.toFixed(1)}/10 vs ${gap.target.toFixed(1)}/10 required). Resolving this unblocks key downstream competencies.`;

          return (
            <div
              key={gap.skill_id}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{gap.skill_name}</h4>
                  </div>
                  <Badge priority={gap.priority_label} size="sm">
                    {gap.priority_label} {gap.priority}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 mb-3 font-medium">
                  <span>Level: <strong className="text-slate-900">{gap.level.toFixed(1)}</strong></span>
                  <span className="text-slate-300">&rarr;</span>
                  <span>Target: <strong className="text-slate-900">{gap.target.toFixed(1)}</strong></span>
                  <span className="text-red-600 font-semibold">(+{gap.gap.toFixed(1)})</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3">
                  &ldquo;{narrative}&rdquo;
                </p>
              </div>

              {gap.unblocks.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-0.5">
                    <ArrowUpRight className="w-3 h-3 text-slate-400" /> Unlocks:
                  </span>
                  {gap.unblocks.map((u) => (
                    <span
                      key={u.skill_id}
                      className="text-[10px] font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-200"
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
