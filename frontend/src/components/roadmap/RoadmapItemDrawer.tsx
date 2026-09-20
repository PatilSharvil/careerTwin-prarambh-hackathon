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
          <span className="text-lg font-bold text-slate-900">{item.skill_name}</span>
          <Badge status={item.status} size="sm" className="capitalize">
            {item.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" size="sm">
            {item.phase}
          </Badge>
        </div>
      }
      description={
        <span className="flex items-center gap-3 text-xs text-slate-500 mt-1">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Weeks {item.week_start}–{item.week_end}
          </span>
          <span>&bull;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> {item.hours} hours allocated
          </span>
        </span>
      }
    >
      <div className="space-y-6">
        {/* Capstone Combines Banner (if capstone) */}
        {item.is_capstone && item.combines && item.combines.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5 mb-2">
              <Milestone className="w-4 h-4 text-amber-600" />
              Integrated Capstone Competencies
            </h4>
            <p className="text-xs text-amber-800 mb-2.5">
              This synthesis capstone combines multi-phase competencies into an end-to-end portfolio artifact:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {item.combines.map((c) => (
                <span
                  key={c.skill_id}
                  className="px-2.5 py-1 rounded-md bg-white border border-amber-300 text-amber-900 text-xs font-medium shadow-2xs"
                >
                  {c.skill_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 1. "Why am I learning this?" Section */}
        {item.why && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <HelpCircle className="w-4 h-4 text-primary-600" />
                Why am I learning this?
              </div>

              {item.why.narrative_source === 'llm' ? (
                <Badge variant="primary" size="sm" className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Personalized
                </Badge>
              ) : (
                <Badge variant="medium" size="sm">
                  Template Fact
                </Badge>
              )}
            </div>

            {/* Narrative */}
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              &ldquo;{item.why.narrative}&rdquo;
            </p>

            {/* Structured Facts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Current Level</span>
                <span className="text-sm font-bold text-slate-900">{item.why.level.toFixed(1)} / 10</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Target Level</span>
                <span className="text-sm font-bold text-emerald-600">{item.why.target.toFixed(1)} / 10</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Skill Gap</span>
                <span className="text-sm font-bold text-red-600">+{item.why.gap.toFixed(1)}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200">
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Priority Score</span>
                <span className="text-sm font-bold text-slate-900">{item.why.priority} / 100</span>
              </div>
            </div>

            {/* Evidence snippet if any */}
            {item.why.evidence_snippet && (
              <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-200">
                Resume Evidence: &ldquo;{item.why.evidence_snippet}&rdquo;
              </p>
            )}

            {/* Unblocks */}
            {item.why.unblocks.length > 0 && (
              <div className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap pt-1">
                <span className="font-semibold text-slate-700">Unlocks downstream:</span>
                {item.why.unblocks.map((u) => (
                  <span
                    key={u.skill_id}
                    className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
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
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            Prerequisites ({item.prerequisites.length})
          </h4>

          {item.prerequisites.length === 0 ? (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
              <Unlock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>No prerequisite skills required. Available immediately.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {item.prerequisites.map((prereq) => (
                <div
                  key={prereq.skill_id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {prereq.met ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                    <span className="font-semibold text-slate-900">{prereq.skill_name}</span>
                    <span className="text-slate-400 font-normal">
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
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            Curated Learning Activities ({item.activities.length})
          </h4>

          {item.activities.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No specific activities attached.</p>
          ) : (
            <div className="space-y-3">
              {item.activities.map((act) => (
                <div
                  key={act.activity_id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    act.completed
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-100 flex-shrink-0">
                        {getActivityIcon(act.type)}
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {act.title}
                        </h5>
                        <p className="text-[11px] text-slate-500">
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
                      >
                        Launch <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> {act.hours} hrs
                    </span>
                    <span>&bull;</span>
                    <span className="font-medium text-emerald-700">
                      +{act.level_gain.toFixed(1)} level gain
                    </span>
                    <span>&bull;</span>
                    <span className="text-slate-400">
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
              Completion Criteria
            </h4>

            <div className="space-y-2">
              {item.completion_criteria.map((criterion, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start gap-2.5 text-xs text-slate-700"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                  <span>{criterion}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
