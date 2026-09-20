import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Phase, RoadmapItem } from '../../types/api';
import {
  Calendar,
  Clock,
  Lock,
  Unlock,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Milestone,
} from 'lucide-react';

export interface RoadmapTimelineViewProps {
  items: RoadmapItem[];
  phases: Phase[];
  deadlineWeeks: number;
  onSelectItem: (item: RoadmapItem) => void;
}

export const RoadmapTimelineView: React.FC<RoadmapTimelineViewProps> = ({
  items,
  phases,
  deadlineWeeks,
  onSelectItem,
}) => {
  const getStatusIcon = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case 'in_progress':
        return <PlayCircle className="w-3.5 h-3.5 text-violet-600" />;
      case 'available':
        return <Unlock className="w-3.5 h-3.5 text-blue-600" />;
      case 'locked':
        return <Lock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getStatusCardStyles = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'done':
        return 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-400';
      case 'in_progress':
        return 'border-violet-300 bg-violet-50/40 hover:border-violet-500 ring-1 ring-violet-400/20';
      case 'available':
        return 'border-blue-200 bg-white hover:border-blue-400 hover:shadow-xs';
      case 'locked':
        return 'border-slate-200 bg-slate-50/80 opacity-80 hover:opacity-100 hover:border-slate-300';
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

  // Group items by phase in the order given by phases
  const groupedByPhase = phases.map((phase) => ({
    phase,
    items: items
      .filter((item) => item.phase === phase)
      .sort((a, b) => a.position - b.position),
  }));

  return (
    <div className="space-y-8">
      {groupedByPhase.map(({ phase, items: phaseItems }) => {
        if (phaseItems.length === 0) return null;

        return (
          <div key={phase} className="space-y-3">
            {/* Phase Group Header */}
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
                {phaseItems.length} item{phaseItems.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Phase Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {phaseItems.map((item) => {
                const isStretch = item.stretch || item.week_end > deadlineWeeks;

                return (
                  <Card
                    key={item.item_id}
                    hoverable
                    onClick={() => onSelectItem(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectItem(item);
                      }
                    }}
                    className={`p-5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${getStatusCardStyles(
                      item.status
                    )}`}
                  >
                    <div>
                      {/* Top: Position + Status + Stretch Tag */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                            {item.position}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Weeks {item.week_start}–{item.week_end}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isStretch && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-0.5">
                              <AlertCircle className="w-3 h-3" /> stretch
                            </span>
                          )}
                          <Badge status={item.status} size="sm" className="flex items-center gap-1 capitalize">
                            {getStatusIcon(item.status)}
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      {/* Item Title */}
                      <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1">
                        {item.skill_name}
                      </h3>

                      {/* Capstone badge or Priority Chip */}
                      <div className="flex items-center gap-1.5 mb-3">
                        {item.is_capstone ? (
                          <Badge variant="medium" size="sm" className="flex items-center gap-1">
                            <Milestone className="w-3 h-3 text-amber-600" />
                            Capstone Synthesis
                          </Badge>
                        ) : (
                          item.why && (
                            <Badge priority={item.why.priority_label} size="sm">
                              {item.why.priority_label} Priority
                            </Badge>
                          )
                        )}
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {item.hours} hrs
                        </span>
                      </div>
                    </div>

                    {/* Bottom Metadata: Prerequisites & Activities Summary */}
                    <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span>
                          {item.activities.length} activit{item.activities.length === 1 ? 'y' : 'ies'}
                        </span>
                        {item.prerequisites.length > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className="text-[11px]">
                              {item.prerequisites.filter((p) => p.met).length}/{item.prerequisites.length} prereqs met
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-primary-600 font-semibold text-[11px] hover:underline">
                        Details &rarr;
                      </span>
                    </div>
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
