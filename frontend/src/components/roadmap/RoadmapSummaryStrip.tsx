import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Roadmap, RoleRef } from '../../types/api';
import {
  Calendar,
  Clock,
  Hourglass,
  Layers,
  Network,
} from 'lucide-react';

export interface RoadmapSummaryStripProps {
  roadmap: Roadmap;
  role: RoleRef;
  viewMode: 'timeline' | 'graph';
  onToggleViewMode: (mode: 'timeline' | 'graph') => void;
}

export const RoadmapSummaryStrip: React.FC<RoadmapSummaryStripProps> = ({
  roadmap,
  role,
  viewMode,
  onToggleViewMode,
}) => {
  const isWithinDeadline = roadmap.total_weeks <= roadmap.deadline_weeks;

  return (
    <Card className="p-4 sm:p-5 border-2 border-black bg-white rounded-2xl shadow-neo">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Role Info & Stats Grid */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-black tracking-tight">
                {role.title}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-white text-black font-black border-2 border-black shadow-neo-xs">
                v{role.version}
              </span>
            </div>
            <p className="text-xs text-slate-700 font-bold mt-0.5">
              Personalized curriculum schedule &bull; Roadmap v{roadmap.version}
            </p>
          </div>

          <div className="h-8 w-0.5 bg-black hidden sm:block" />

          {/* Metric Chips */}
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap text-xs">
            {/* Timeline vs Deadline */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-black stroke-[2.5]" />
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-black">Timeline</span>
                <span className="font-black text-black">
                  {roadmap.total_weeks} wks{' '}
                  <span className="text-slate-500 font-bold">/ {roadmap.deadline_weeks} wks target</span>
                </span>
              </div>
              <Badge variant={isWithinDeadline ? 'done' : 'high'} size="sm" className="ml-1">
                {isWithinDeadline ? 'On Track' : 'Stretch'}
              </Badge>
            </div>

            {/* Weekly Hours */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-black stroke-[2.5]" />
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-black">Weekly Commitment</span>
                <span className="font-black text-black">{roadmap.weekly_hours} hrs / week</span>
              </div>
            </div>

            {/* Total Hours */}
            <div className="flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-black stroke-[2.5]" />
              <div>
                <span className="text-slate-600 block text-[10px] uppercase font-black">Total Budget</span>
                <span className="font-black text-black">{roadmap.total_hours} hrs total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: View Mode Toggle */}
        <div className="flex items-center bg-[#faf6ee] p-1 rounded-2xl border-2 border-black shadow-neo-xs self-stretch sm:self-auto justify-center gap-1">
          <button
            type="button"
            onClick={() => onToggleViewMode('timeline')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              viewMode === 'timeline'
                ? 'bg-[#ffe566] text-black border-2 border-black shadow-neo-xs scale-105'
                : 'text-slate-700 hover:text-black border-2 border-transparent'
            }`}
          >
            <Layers className="w-4 h-4 stroke-[2.5]" />
            <span>Timeline</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleViewMode('graph')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              viewMode === 'graph'
                ? 'bg-[#ffe566] text-black border-2 border-black shadow-neo-xs scale-105'
                : 'text-slate-700 hover:text-black border-2 border-transparent'
            }`}
          >
            <Network className="w-4 h-4 stroke-[2.5]" />
            <span>Dependency Graph</span>
          </button>
        </div>
      </div>
    </Card>
  );
};
