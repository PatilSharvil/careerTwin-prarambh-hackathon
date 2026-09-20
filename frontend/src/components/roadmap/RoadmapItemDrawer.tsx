import React from 'react';
import { Drawer } from '../ui/Drawer';
import { Badge } from '../ui/Badge';
import type { RoadmapItem } from '../../types/api';
import {
  Calendar,
  Clock,
  ExternalLink,
  BookOpen,
  Code,
  FileText,
  Award,
  CheckCircle2,
  Lock,
  Unlock,
  CheckSquare,
  Sparkles,
  HelpCircle,
  Milestone,
} from 'lucide-react';

export interface RoadmapItemDrawerProps {
  item: RoadmapItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RoadmapItemDrawer: React.FC<RoadmapItemDrawerProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  if (!item) return null;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-4 h-4 text-primary-600" />;
      case 'project':
        return <Code className="w-4 h-4 text-emerald-600" />;
      case 'doc':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'certification':
        return <Award className="w-4 h-4 text-amber-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-primary-600" />;
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xl font-black text-black break-words [overflow-wrap:anywhere]">{item.skill_name}</span>
          <Badge status={item.status} size="sm" className="capitalize">
            {item.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" size="sm">
            {item.phase}
          </Badge>
        </div>
      }
      description={
        <span className="flex items-center gap-3 text-xs text-black font-bold mt-1">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-black stroke-[2.5]" /> Weeks {item.week_start}–{item.week_end}
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-black stroke-[2.5]" /> {item.hours} hours allocated
          </span>
        </span>
      }
    >
      <div className="space-y-6">
        {/* Capstone Combines Banner (if capstone) */}
        {item.is_capstone && item.combines && item.combines.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#ffd166] border-2 border-black shadow-neo">
            <h4 className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5 mb-2">
              <Milestone className="w-4 h-4 text-black stroke-[2.5]" />
              Integrated Capstone Competencies
            </h4>
            <p className="text-xs text-black font-semibold mb-2.5">
              This synthesis capstone combines multi-phase competencies into an end-to-end portfolio artifact:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {item.combines.map((c) => (
                <span
                  key={c.skill_id}
                  className="px-2.5 py-1 rounded-lg bg-white border border-black text-black text-xs font-black shadow-neo-xs"
                >
                  {c.skill_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 1. "Why am I learning this?" Section */}
        {item.why && (
          <div className="p-5 rounded-2xl bg-[#faf6ee] border-2 border-black shadow-neo space-y-3">
            <div className="flex items-center justify-between pb-2 border-b-2 border-black">
              <div className="flex items-center gap-1.5 text-xs font-black text-black uppercase tracking-wider">
                <HelpCircle className="w-4 h-4 text-black stroke-[2.5]" />
                Why am I learning this?
              </div>

              {item.why.narrative_source === 'llm' ? (
                <Badge variant="primary" size="sm" className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 stroke-[2.5]" /> AI Personalized
                </Badge>
              ) : (
                <Badge variant="medium" size="sm">
                  Template Fact
                </Badge>
              )}
            </div>

            {/* Narrative */}
            <p className="text-xs text-black leading-relaxed font-bold bg-white p-3 rounded-xl border border-black break-words [overflow-wrap:anywhere]">
              &ldquo;{item.why.narrative}&rdquo;
            </p>

            {/* Structured Facts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-white border-2 border-black shadow-neo-xs">
                <span className="block text-[10px] text-slate-600 uppercase font-black">Current Level</span>
                <span className="text-sm font-black text-black">{item.why.level.toFixed(1)} / 10</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#79e7a8] border-2 border-black shadow-neo-xs">
                <span className="block text-[10px] text-black uppercase font-black">Target Level</span>
                <span className="text-sm font-black text-black">{item.why.target.toFixed(1)} / 10</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#ff6b6b]/20 border-2 border-black shadow-neo-xs">
                <span className="block text-[10px] text-red-900 uppercase font-black">Skill Gap</span>
                <span className="text-sm font-black text-red-700">+{item.why.gap.toFixed(1)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border-2 border-black shadow-neo-xs">
                <span className="block text-[10px] text-slate-600 uppercase font-black">Priority Score</span>
                <span className="text-sm font-black text-black">{item.why.priority} / 100</span>
              </div>
            </div>

            {/* Evidence snippet if any */}
            {item.why.evidence_snippet && (
              <p className="text-[11px] text-slate-700 italic bg-white p-2.5 rounded-xl border border-black font-medium break-words [overflow-wrap:anywhere]">
                Resume Evidence: &ldquo;{item.why.evidence_snippet}&rdquo;
              </p>
            )}

            {/* Unblocks */}
            {item.why.unblocks.length > 0 && (
              <div className="text-xs text-black flex items-center gap-1.5 flex-wrap pt-1 font-bold">
                <span className="font-black">Unlocks downstream:</span>
                {item.why.unblocks.map((u) => (
                  <span
                    key={u.skill_id}
                    className="text-[11px] font-black text-black bg-[#70d6ff] px-2.5 py-0.5 rounded-lg border border-black shadow-neo-xs break-words"
                  >
                    {u.skill_name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Prerequisites Section */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-black mb-2 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            Prerequisites ({item.prerequisites.length})
          </h4>

          {item.prerequisites.length === 0 ? (
            <div className="p-3.5 rounded-2xl bg-[#79e7a8]/30 border-2 border-black text-xs text-black font-bold flex items-center gap-2 shadow-neo-xs">
              <Unlock className="w-4 h-4 text-black stroke-[2.5] flex-shrink-0" />
              <span>No prerequisite skills required. Available immediately.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {item.prerequisites.map((prereq) => (
                <div
                  key={prereq.skill_id}
                  className="p-3 rounded-xl border-2 border-black bg-white flex items-center justify-between gap-3 text-xs shadow-neo-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {prereq.met ? (
                      <CheckCircle2 className="w-4 h-4 text-black stroke-[3] flex-shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    )}
                    <span className="font-black text-black break-words [overflow-wrap:anywhere]">{prereq.skill_name}</span>
                    <span className="text-slate-600 font-bold whitespace-nowrap">
                      (min level: {prereq.min_level.toFixed(1)})
                    </span>
                  </div>

                  <Badge variant={prereq.met ? 'done' : 'medium'} size="sm">
                    {prereq.met ? 'Met' : 'Unmet'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Activities Section */}
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-black mb-2 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-black stroke-[2.5]" />
            Curated Learning Activities ({item.activities.length})
          </h4>

          {item.activities.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium italic">No specific activities attached.</p>
          ) : (
            <div className="space-y-3">
              {item.activities.map((act) => (
                <div
                  key={act.activity_id}
                  className={`p-4 rounded-2xl border-2 border-black transition-all shadow-neo-xs ${
                    act.completed
                      ? 'bg-[#79e7a8]/20'
                      : 'bg-white hover:shadow-neo hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-2 rounded-xl bg-[#faf6ee] border border-black flex-shrink-0">
                        {getActivityIcon(act.type)}
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs sm:text-sm font-black text-black leading-snug break-words [overflow-wrap:anywhere]">
                          {act.title}
                        </h5>
                        <p className="text-[11px] text-slate-700 font-bold">
                          {act.provider} &bull; <span className="capitalize">{act.type}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {act.completed && (
                        <Badge variant="done" size="sm">
                          Completed
                        </Badge>
                      )}
                      <a
                        href={act.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black text-black bg-[#ffe566] hover:bg-[#ffd026] border-2 border-black shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5 transition-all whitespace-nowrap"
                      >
                        Launch <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-black font-bold mt-2 pt-2 border-t border-black">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-black" /> {act.hours} hrs
                    </span>
                    <span>&bull;</span>
                    <span className="text-emerald-800 font-black">
                      +{act.level_gain.toFixed(1)} level gain
                    </span>
                    <span>&bull;</span>
                    <span className="text-slate-700">
                      Levels {act.level_from.toFixed(1)} &rarr; {act.level_to.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Completion Criteria Checklist (Display Only) */}
        {item.completion_criteria && item.completion_criteria.length > 0 && (
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-black mb-2 flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-black stroke-[2.5]" />
              Completion Criteria
            </h4>

            <div className="space-y-2">
              {item.completion_criteria.map((criterion, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border-2 border-black bg-[#faf6ee] flex items-start gap-2.5 text-xs font-semibold text-black shadow-neo-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-black stroke-[3] flex-shrink-0 mt-0.5" />
                  <span className="break-words [overflow-wrap:anywhere] flex-1 min-w-0">{criterion}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
