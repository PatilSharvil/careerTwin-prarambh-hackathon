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
        return <CheckCircle2 className="w-3.5 h-3.5 text-black stroke-[3]" />;
      case 'in_progress':
        return <PlayCircle className="w-3.5 h-3.5 text-black stroke-[2.5]" />;
      case 'available':
        return <Unlock className="w-3.5 h-3.5 text-black stroke-[2.5]" />;
      case 'locked':
        return <Lock className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: RoadmapItem['status']) => {
    switch (status) {
      case 'done':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-black bg-[#79e7a8] px-2.5 py-0.5 rounded-lg border border-black shadow-neo-xs">
            {getStatusIcon(status)} Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-black bg-[#ffe566] px-2.5 py-0.5 rounded-lg border border-black shadow-neo-xs">
            {getStatusIcon(status)} In Progress
          </span>
        );
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-black bg-[#70d6ff] px-2.5 py-0.5 rounded-lg border border-black shadow-neo-xs">
            {getStatusIcon(status)} Ready
          </span>
        );
      case 'locked':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-lg border border-black">
            {getStatusIcon(status)} Locked
          </span>
        );
    }
  };

  return (
    <Card className="p-5 border-2 border-black bg-white shadow-neo rounded-2xl">
      <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-black">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-black stroke-[2.5]" />
          <h3 className="text-sm font-black text-black uppercase tracking-wider">
            Trajectory &amp; Pipeline
          </h3>
        </div>
        <span className="text-xs text-black font-bold bg-[#faf6ee] px-2 py-0.5 rounded border border-black">
          Roadmap Sequence
        </span>
      </div>

      {/* Current Focus Section */}
      <div className="mb-4">
        <div className="text-[11px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1">
          <span>Current Target Milestone</span>
        </div>

        {currentFocus ? (
          <div
            onClick={() => onSelectItem?.(currentFocus)}
            className="p-4 rounded-2xl border-2 border-black bg-[#faf6ee] shadow-neo-xs hover:shadow-neo transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-black text-[#ffe566] text-xs font-black flex items-center justify-center border border-black shadow-neo-xs">
                  #{currentFocus.position}
                </span>
                <span className="text-sm font-black text-black">
                  {currentFocus.skill_name}
                </span>
                {currentFocus.is_capstone && (
                  <Badge variant="primary" size="sm">Capstone</Badge>
                )}
              </div>
              {getStatusBadge(currentFocus.status)}
            </div>

            <div className="flex items-center gap-3 text-xs text-black font-bold mb-2">
              <span className="inline-flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-black" />
                {currentFocus.phase}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-black" />
                {currentFocus.hours} hours (Weeks {currentFocus.week_start}–{currentFocus.week_end})
              </span>
            </div>

            {currentFocus.why?.narrative && (
              <p className="text-xs text-black leading-relaxed bg-white p-2.5 rounded-xl border border-black font-medium">
                {currentFocus.why.narrative}
              </p>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#faf6ee] border-2 border-dashed border-black text-xs text-black font-bold">
            All roadmap milestones completed!
          </div>
        )}
      </div>

      {/* Next Up Section */}
      <div>
        <div className="text-[11px] font-black uppercase tracking-wider text-black mb-2 flex items-center gap-1">
          <span>Next in Queue</span>
          <ArrowRight className="w-3.5 h-3.5 text-black stroke-[3]" />
        </div>

        {nextUp.length > 0 ? (
          <div className="space-y-2">
            {nextUp.map((item) => (
              <div
                key={item.item_id}
                onClick={() => onSelectItem?.(item)}
                className="flex items-center justify-between p-3 rounded-xl border-2 border-black bg-white hover:bg-[#faf6ee] shadow-neo-xs hover:shadow-neo transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-black text-black w-6">
                    #{item.position}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-black truncate block">
                      {item.skill_name}
                    </span>
                    <span className="text-[10px] text-slate-700 font-bold">
                      {item.phase} · {item.hours} hrs
                    </span>
                  </div>
                </div>
                <div>{getStatusBadge(item.status)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-medium italic">
            No further items pending in queue.
          </div>
        )}
      </div>
    </Card>
  );
};
