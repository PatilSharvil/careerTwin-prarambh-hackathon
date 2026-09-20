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
    <Card className="p-4 sm:p-5 border-slate-200 bg-white shadow-xs">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Role Info & Stats Grid */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {role.title}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                v{role.version}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized curriculum schedule &bull; Roadmap v{roadmap.version}
            </p>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden sm:block" />

          {/* Metric Chips */}
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap text-xs">
            {/* Timeline vs Deadline */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-600" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Timeline</span>
                <span className="font-bold text-slate-900">
                  {roadmap.total_weeks} wks{' '}
                  <span className="text-slate-400 font-normal">/ {roadmap.deadline_weeks} wks target</span>
                </span>
              </div>
              <Badge variant={isWithinDeadline ? 'done' : 'high'} size="sm" className="ml-1">
                {isWithinDeadline ? 'On Track' : 'Stretch'}
              </Badge>
            </div>

            {/* Weekly Hours */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Weekly Commitment</span>
                <span className="font-bold text-slate-900">{roadmap.weekly_hours} hrs / week</span>
              </div>
            </div>

            {/* Total Hours */}
            <div className="flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-primary-600" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Budget</span>
                <span className="font-bold text-slate-900">{roadmap.total_hours} hrs total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: View Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-stretch sm:self-auto justify-center">
          <button
            type="button"
            onClick={() => onToggleViewMode('timeline')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'timeline'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleViewMode('graph')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'graph'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Dependency Graph</span>
          </button>
        </div>
      </div>
    </Card>
  );
};
