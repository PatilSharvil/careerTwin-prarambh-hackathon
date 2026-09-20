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
      <div className="flex items-center justify-between pb-3 border-b-2 border-black">
        <div>
          <h2 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-black" />
            ADK Agent Trajectory & Coach Evaluation
          </h2>
          <p className="text-xs font-bold text-neutral-600 mt-0.5">
            Validation of autonomous agent tool calling sequences and semantic response quality across coach scenarios.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tool Trajectory Avg Score */}
        <Card className="p-5 border-2 border-black bg-white rounded-2xl shadow-neo">
          <div className="flex items-center justify-between text-neutral-700 text-xs font-black uppercase tracking-wider mb-1">
            <span>Tool Trajectory Score</span>
            <div className="p-1 rounded-lg bg-[#70d6ff] border border-black shadow-neo-xs">
              <Crosshair className="w-4 h-4 text-black" />
            </div>
          </div>
          <div className="text-3xl font-black text-black">
            {formatScore(adk.tool_trajectory_avg_score)}
          </div>
          <p className="text-[11px] font-bold text-neutral-500 mt-1">
            Optimal tool sequence alignment
          </p>
        </Card>

        {/* Response Match Score */}
        <Card className="p-5 border-2 border-black bg-white rounded-2xl shadow-neo">
          <div className="flex items-center justify-between text-neutral-700 text-xs font-black uppercase tracking-wider mb-1">
            <span>Response Match Score</span>
            <div className="p-1 rounded-lg bg-[#b892ff] border border-black shadow-neo-xs">
              <Activity className="w-4 h-4 text-black" />
            </div>
          </div>
          <div className="text-3xl font-black text-black">
            {formatScore(adk.response_match_score)}
          </div>
          <p className="text-[11px] font-bold text-neutral-500 mt-1">
            Semantic ground-truth alignment
          </p>
        </Card>

        {/* ADK Cases Passed */}
        <Card className="p-5 border-2 border-black bg-white rounded-2xl shadow-neo">
          <div className="flex items-center justify-between text-neutral-700 text-xs font-black uppercase tracking-wider mb-1">
            <span>Evaluation Run</span>
            <div className="p-1 rounded-lg bg-[#79e7a8] border border-black shadow-neo-xs">
              <Bot className="w-4 h-4 text-black" />
            </div>
          </div>
          <div className="text-3xl font-black text-black">
            {totalCasesCount > 0 ? `${passedCasesCount} / ${totalCasesCount}` : 'not run'}
          </div>
          <p className="text-[11px] font-bold text-neutral-500 mt-1">
            Ran at: {formattedRanAt}
          </p>
        </Card>
      </div>

      {/* Per-case Table */}
      <Card className="border-2 border-black bg-white rounded-2xl overflow-hidden shadow-neo">
        <div className="px-5 py-3.5 bg-[#ffe566] border-b-2 border-black flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-black">
            Coach Test Case Trajectories
          </span>
          <span className="text-xs text-black font-black bg-white border border-black px-2.5 py-0.5 rounded-lg shadow-neo-xs">
            {passedCasesCount} of {totalCasesCount} cases passing
          </span>
        </div>

        {adk.cases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-800 border-collapse">
              <thead>
                <tr className="border-b-2 border-black/10 text-neutral-600 font-black uppercase text-[11px] bg-[#faf6ee]">
                  <th className="py-3.5 px-5">Scenario ID</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Trajectory Score</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10">
                {adk.cases.map((c) => (
                  <tr key={c.eval_id} className="hover:bg-[#faf6ee] transition-colors">
                    <td className="py-3.5 px-5 font-mono font-black text-black">
                      {c.eval_id}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-xl border-2 border-black shadow-neo-xs ${
                          c.passed
                            ? 'bg-[#79e7a8] text-black'
                            : 'bg-[#ff6b6b] text-black'
                        }`}
                      >
                        {c.passed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                            Passed
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-black" />
                            Failed
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-black text-black text-sm">
                      {c.tool_trajectory !== null ? c.tool_trajectory.toFixed(2) : 'not run'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-neutral-500 italic font-bold">
            No individual ADK test cases recorded in this evaluation run.
          </div>
        )}
      </Card>
    </div>
  );
};
