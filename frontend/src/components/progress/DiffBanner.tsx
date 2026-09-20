import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Diff, NarrativeSource } from '../../types/api';
import {
  TrendingUp,
  TrendingDown,
  Unlock,
  Trash2,
  PlusCircle,
  ArrowUpDown,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Cpu,
  RefreshCw,
  Info,
} from 'lucide-react';

export interface DiffBannerProps {
  diff: Diff | null;
  narrative?: string | null;
  narrativeSource?: NarrativeSource | null;
  className?: string;
}

export const DiffBanner: React.FC<DiffBannerProps> = ({
  diff,
  narrative,
  narrativeSource = 'llm',
  className = '',
}) => {
  if (!diff) {
    return (
      <Card className={`p-6 border-slate-200 bg-white shadow-xs ${className}`}>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Changes Since Last Plan
            </h3>
          </div>
          <span className="text-xs text-slate-400">Replan Diff Engine</span>
        </div>
        <div className="text-center py-6 px-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
            <Info className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 mb-1">
            No Replan Diff Recorded Yet
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Complete a skill, mark an activity as done, or trigger a market update below to activate CareerTwin's deterministic replan engine and see real-time diffs.
          </p>
        </div>
      </Card>
    );
  }

  const readinessDelta = Number((diff.readiness_after - diff.readiness_before).toFixed(1));
  const isReadinessPositive = readinessDelta >= 0;

  const getTriggerLabel = () => {
    switch (diff.trigger.type) {
      case 'complete_skill':
        return `Completed Skill: ${diff.trigger.skill_name || diff.trigger.skill_id}`;
      case 'complete_activity':
        return `Completed Activity in ${diff.trigger.skill_name || diff.trigger.skill_id}`;
      case 'mark_known':
        return `Marked Known: ${diff.trigger.skill_name || diff.trigger.skill_id}`;
      case 'market_update':
        return 'Market Standards Update Applied';
      default:
        return 'Plan Re-evaluated';
    }
  };

  return (
    <Card
      className={`p-6 border-primary-200 bg-white shadow-sm overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-top-2 ${className}`}
    >
      {/* Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Changes Since Last Plan
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-200">
            {getTriggerLabel()}
          </span>
        </div>
      </div>

      {/* 1. Readiness Before -> After Bar */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
            Role Alignment & Readiness
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-700">
              {diff.readiness_before.toFixed(1)}%
            </span>
            <span className="text-slate-400 font-medium">→</span>
            <span className="text-2xl font-black text-slate-900">
              {diff.readiness_after.toFixed(1)}%
            </span>
          </div>
        </div>

        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${
            isReadinessPositive
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {isReadinessPositive ? (
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-amber-600" />
          )}
          <span>
            {isReadinessPositive ? `+${readinessDelta}%` : `${readinessDelta}%`}
          </span>
        </div>
      </div>

      {/* 2. Narrative with AI / Template Badge */}
      {narrative && (
        <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-primary-50/40 via-white to-primary-50/20 border border-primary-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Replan Narrative
            </span>
            {narrativeSource === 'llm' ? (
              <span className="inline-flex items-center text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                <Sparkles className="w-3 h-3 mr-1 text-purple-600" />
                AI Generated
              </span>
            ) : (
              <span className="inline-flex items-center text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                <Cpu className="w-3 h-3 mr-1 text-slate-500" />
                Deterministic Template
              </span>
            )}
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-normal">
            {narrative}
          </p>
        </div>
      )}

      {/* Grid of Specific Diff Sections */}
      <div className="space-y-3">
        {/* 3. Level Changes */}
        {diff.level_changes && diff.level_changes.length > 0 && (
          <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary-600" />
              <span>Skill Level Advances</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {diff.level_changes.map((lc) => (
                <span
                  key={lc.skill_id}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white text-slate-800 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs"
                >
                  <span>{lc.skill_name}:</span>
                  <span className="text-slate-500">{lc.from.toFixed(1)}</span>
                  <span className="text-slate-400">→</span>
                  <span className="text-emerald-700 font-bold">{lc.to.toFixed(1)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 4. Unlocked (green) */}
        {diff.unlocked && diff.unlocked.length > 0 && (
          <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1.5 flex items-center gap-1.5">
              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Newly Unlocked Milestones</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {diff.unlocked.map((u) => (
                <span
                  key={u.skill_id}
                  className="inline-flex items-center gap-1 text-xs font-bold bg-white text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-300 shadow-2xs"
                >
                  <Unlock className="w-3 h-3 text-emerald-600" />
                  {u.skill_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 5. Removed (strikethrough) */}
        {diff.removed && diff.removed.length > 0 && (
          <div className="p-3 rounded-lg bg-rose-50/40 border border-rose-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800 mb-1.5 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Retired from Roadmap</span>
            </div>
            <div className="space-y-1">
              {diff.removed.map((rem) => (
                <div key={rem.item_id} className="text-xs text-slate-700 flex items-baseline gap-2">
                  <span className="line-through text-slate-500 font-medium">
                    {rem.skill_name}
                  </span>
                  <span className="text-slate-400">―</span>
                  <span className="text-slate-600 italic text-[11px]">{rem.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Added */}
        {diff.added && diff.added.length > 0 && (
          <div className="p-3 rounded-lg bg-blue-50/40 border border-blue-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800 mb-1.5 flex items-center gap-1.5">
              <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Newly Added to Roadmap</span>
            </div>
            <div className="space-y-1">
              {diff.added.map((add) => (
                <div key={add.item_id} className="text-xs text-slate-700 flex items-baseline gap-2">
                  <span className="font-bold text-blue-900">+{add.skill_name}</span>
                  <span className="text-slate-400">―</span>
                  <span className="text-slate-600 text-[11px]">{add.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Reordered (from -> to) */}
        {diff.reordered && diff.reordered.length > 0 && (
          <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
              <span>Timeline Reordering</span>
            </div>
            <div className="space-y-1">
              {diff.reordered.map((reo) => (
                <div key={reo.item_id} className="text-xs text-slate-700 flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{reo.skill_name}:</span>
                  <span className="text-slate-500">Position #{reo.from_position}</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-bold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-200">
                    Position #{reo.to_position}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. Reprioritized */}
        {diff.reprioritized && diff.reprioritized.length > 0 && (
          <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>Priority Adjustments</span>
            </div>
            <div className="space-y-1">
              {diff.reprioritized.map((rep) => (
                <div key={rep.skill_id} className="text-xs text-slate-700 flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{rep.skill_name}:</span>
                  <span className="text-slate-500">Score {rep.from_priority}</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">
                    Score {rep.to_priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 9. Requirement Changes (Market Update) */}
        {diff.requirement_changes && diff.requirement_changes.length > 0 && (
          <div className="p-3 rounded-lg bg-purple-50/40 border border-purple-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800 mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
              <span>Role Benchmark Market Updates</span>
            </div>
            <div className="space-y-1">
              {diff.requirement_changes.map((req, idx) => (
                <div key={idx} className="text-xs text-slate-700 flex items-baseline gap-2">
                  <span className="font-bold text-purple-900">{req.skill_name}:</span>
                  <Badge variant="outline" size="sm" className="capitalize">
                    {req.change.replace(/_/g, ' ')}
                  </Badge>
                  {req.from !== null && (
                    <span className="text-slate-500 text-[11px]">from {req.from}</span>
                  )}
                  {req.to !== null && (
                    <span className="font-semibold text-slate-800 text-[11px]">to {req.to}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 10. Deterministic Facts */}
        {diff.facts && diff.facts.length > 0 && (
          <div className="pt-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Deterministic Facts
            </div>
            <ul className="space-y-1">
              {diff.facts.map((fact, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};
