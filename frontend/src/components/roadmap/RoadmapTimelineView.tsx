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
        return <CheckCircle2 className="w-3.5 h-3.5 text-black stroke-[3]" />;
      case 'in_progress':
        return <PlayCircle className="w-3.5 h-3.5 text-black stroke-[2.5]" />;
      case 'available':
        return <Unlock className="w-3.5 h-3.5 text-black stroke-[2.5]" />;
      case 'locked':
        return <Lock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getStatusCardStyles = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'done':
        return 'border-2 border-black bg-[#79e7a8]/30 shadow-neo hover:shadow-neo-lg';
      case 'in_progress':
        return 'border-2 border-black bg-[#b892ff]/30 shadow-neo hover:shadow-neo-lg';
      case 'available':
        return 'border-2 border-black bg-white shadow-neo hover:shadow-neo-lg';
      case 'locked':
        return 'border-2 border-black bg-slate-100 opacity-80 shadow-neo-xs hover:opacity-100';
    }
  };

  const getPhaseStyles = (phase: Phase) => {
    switch (phase) {
      case 'Foundation':
        return 'bg-[#70d6ff] text-black border-2 border-black shadow-neo-xs';
      case 'Core':
        return 'bg-[#ffe566] text-black border-2 border-black shadow-neo-xs';
      case 'Applied':
        return 'bg-[#b892ff] text-black border-2 border-black shadow-neo-xs';
      case 'Capstone':
        return 'bg-[#ff9770] text-black border-2 border-black shadow-neo-xs';
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
                className={`text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-xl ${getPhaseStyles(
                  phase
                )}`}
              >
                {phase} Phase
              </span>
              <div className="h-0.5 bg-black flex-1" />
              <span className="text-xs text-black font-black bg-white px-2 py-0.5 rounded-md border border-black shadow-neo-xs">
                {phaseItems.length} item{phaseItems.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Phase Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                    className={`p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between hover:-translate-y-1 ${getStatusCardStyles(
                      item.status
                    )}`}
                  >
                    <div>
                      {/* Top: Position + Status + Stretch Tag */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-lg bg-black text-[#ffe566] border border-black flex items-center justify-center text-[10px] font-black shadow-neo-xs">
                            {item.position}
                          </span>
                          <span className="text-xs font-black text-black flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                            Weeks {item.week_start}–{item.week_end}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isStretch && (
                            <span className="text-[10px] font-black text-black bg-[#ff6b6b] px-2 py-0.5 rounded-lg border border-black shadow-neo-xs flex items-center gap-0.5">
                              <AlertCircle className="w-3 h-3 text-black stroke-[3]" /> stretch
                            </span>
                          )}
                          <Badge status={item.status} size="sm" className="flex items-center gap-1 capitalize">
                            {getStatusIcon(item.status)}
                            {item.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      {/* Item Title */}
                      <h3 className="text-base font-black text-black tracking-tight mb-1">
                        {item.skill_name}
                      </h3>

                      {/* Capstone badge or Priority Chip */}
                      <div className="flex items-center gap-1.5 mb-3">
                        {item.is_capstone ? (
                          <Badge variant="medium" size="sm" className="flex items-center gap-1">
                            <Milestone className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                            Capstone Synthesis
                          </Badge>
                        ) : (
                          item.why && (
                            <Badge priority={item.why.priority_label} size="sm">
                              {item.why.priority_label} Priority
                            </Badge>
                          )
                        )}
                        <span className="text-xs text-black font-bold flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-black shadow-neo-xs">
                          <Clock className="w-3.5 h-3.5 text-black" />
                          {item.hours} hrs
                        </span>
                      </div>
                    </div>

                    {/* Bottom Metadata: Prerequisites & Activities Summary */}
                    <div className="pt-3 border-t-2 border-black flex items-center justify-between text-xs text-black font-bold">
                      <div className="flex items-center gap-2">
                        <span>
                          {item.activities.length} activit{item.activities.length === 1 ? 'y' : 'ies'}
                        </span>
                        {item.prerequisites.length > 0 && (
                          <>
                            <span>&bull;</span>
                            <span className="text-[11px] text-slate-700 font-bold">
                              {item.prerequisites.filter((p) => p.met).length}/{item.prerequisites.length} prereqs met
                            </span>
                          </>
                        )}
                      </div>
                      <span className="text-black font-black text-xs hover:underline flex items-center">
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
