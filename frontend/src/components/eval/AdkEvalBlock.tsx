import React from 'react';
import { Card } from '../ui/Card';
import type { AdkEval } from '../../types/api';
import { Bot, CheckCircle2, XCircle, Activity, Crosshair } from 'lucide-react';

export interface AdkEvalBlockProps {
  adk: AdkEval;
}

export const AdkEvalBlock: React.FC<AdkEvalBlockProps> = ({ adk }) => {
  const formatScore = (score: number | null): string => {
    if (score === null || score === undefined) return 'not run';
    return (score * 100).toFixed(0) + '%';
  };

  const formattedRanAt = (() => {
    if (!adk.ran_at) return 'not run';
    try {
      return new Date(adk.ran_at).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return adk.ran_at;
    }
  })();

  const passedCasesCount = adk.cases.filter((c) => c.passed).length;
  const totalCasesCount = adk.cases.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary-600" />
            ADK Agent Trajectory & Coach Evaluation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Validation of autonomous agent tool calling sequences and semantic response quality across coach scenarios.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tool Trajectory Avg Score */}
        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Tool Trajectory Score</span>
            <Crosshair className="w-4 h-4 text-primary-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatScore(adk.tool_trajectory_avg_score)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Optimal tool sequence alignment
          </p>
        </Card>

        {/* Response Match Score */}
        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Response Match Score</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatScore(adk.response_match_score)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Semantic ground-truth alignment
          </p>
        </Card>

        {/* ADK Cases Passed */}
        <Card className="p-4 border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>Evaluation Run</span>
            <Bot className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {totalCasesCount > 0 ? `${passedCasesCount} / ${totalCasesCount}` : 'not run'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Ran at: {formattedRanAt}
          </p>
        </Card>
      </div>

      {/* Per-case Table */}
      <Card className="border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Coach Test Case Trajectories
          </span>
          <span className="text-xs text-slate-500 font-medium">
            {passedCasesCount} of {totalCasesCount} cases passing
          </span>
        </div>

        {adk.cases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-4">Scenario ID</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Trajectory Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adk.cases.map((c) => (
                  <tr key={c.eval_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                      {c.eval_id}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          c.passed
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        {c.passed ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Passed
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-red-600" />
                            Failed
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-700">
                      {c.tool_trajectory !== null ? c.tool_trajectory.toFixed(2) : 'not run'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-500 italic">
            No individual ADK test cases recorded in this evaluation run.
          </div>
        )}
      </Card>
    </div>
  );
};
