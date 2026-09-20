import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { RoadmapItem } from '../../types/api';
import {
  Compass,
  ArrowRight,
  Clock,
  CheckCircle2,
  Lock,
  Unlock,
  PlayCircle,
  Layers,
} from 'lucide-react';

export interface FocusNextUpCardProps {
  items: RoadmapItem[];
  onSelectItem?: (item: RoadmapItem) => void;
}

export const FocusNextUpCard: React.FC<FocusNextUpCardProps> = ({
  items,
  onSelectItem,
}) => {
  // Sort items by position
  const sortedItems = [...items].sort((a, b) => a.position - b.position);

  // Current focus: first in_progress item, or first available item, or first non-done item
  const currentFocus =
    sortedItems.find((item) => item.status === 'in_progress') ||
    sortedItems.find((item) => item.status === 'available') ||
    sortedItems.find((item) => item.status !== 'done') ||
    null;

  // Next up: the 1 or 2 items immediately following current focus that aren't done
  const nextUp = currentFocus
    ? sortedItems
        .filter(
          (item) =>
            item.item_id !== currentFocus.item_id &&
            item.status !== 'done' &&
            item.position > currentFocus.position
        )
        .slice(0, 2)
    : [];

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

  const getStatusBadge = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'done':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {getStatusIcon(status)} Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
            {getStatusIcon(status)} In Progress
          </span>
        );
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            {getStatusIcon(status)} Ready to Start
          </span>
        );
      case 'locked':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            {getStatusIcon(status)} Locked
          </span>
        );
    }
  };

  return (
    <Card className="p-5 border-slate-200 bg-white shadow-xs">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-primary-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Trajectory & Pipeline
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Roadmap Sequence
        </span>
      </div>

      {/* Current Focus Section */}
      <div className="mb-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
          <span>Current Target Milestone</span>
        </div>

        {currentFocus ? (
          <div
            onClick={() => onSelectItem?.(currentFocus)}
            className="p-3.5 rounded-xl border border-primary-100 bg-primary-50/30 hover:border-primary-300 transition-colors cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                  #{currentFocus.position}
                </span>
                <span className="text-sm font-bold text-slate-900 group-hover:text-primary-700 transition-colors">
                  {currentFocus.skill_name}
                </span>
                {currentFocus.is_capstone && (
                  <Badge variant="primary" size="sm">Capstone</Badge>
                )}
              </div>
              {getStatusBadge(currentFocus.status)}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
              <span className="inline-flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                {currentFocus.phase}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {currentFocus.hours} hours (Weeks {currentFocus.week_start}–{currentFocus.week_end})
              </span>
            </div>

            {currentFocus.why?.narrative && (
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-white/70 p-2 rounded-lg border border-slate-100">
                {currentFocus.why.narrative}
              </p>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-slate-50 text-xs text-slate-500 italic">
            All roadmap milestones completed!
          </div>
        )}
      </div>

      {/* Next Up Section */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
          <span>Next in Queue</span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
        </div>

        {nextUp.length > 0 ? (
          <div className="space-y-2">
            {nextUp.map((item) => (
              <div
                key={item.item_id}
                onClick={() => onSelectItem?.(item)}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-100/70 hover:border-slate-200 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-semibold text-slate-400 w-5">
                    #{item.position}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-slate-800 truncate block">
                      {item.skill_name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {item.phase} · {item.hours} hrs
                    </span>
                  </div>
                </div>
                <div>{getStatusBadge(item.status)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">
            No further items pending in queue.
          </div>
        )}
      </div>
    </Card>
  );
};
