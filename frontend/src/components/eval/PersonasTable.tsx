import React from 'react';
import { Card } from '../ui/Card';
import type { EvalPersona } from '../../types/api';
import { Users, Check, AlertCircle } from 'lucide-react';

export interface PersonasTableProps {
  personas: EvalPersona[];
}

export const PersonasTable: React.FC<PersonasTableProps> = ({ personas }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            Golden Personas Benchmark Accuracy
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hand-labeled personas tested against deterministic gap math. Predicted gaps matching expected gaps are highlighted.
          </p>
        </div>
      </div>

      <Card className="border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Persona & Role</th>
                <th className="py-3.5 px-4">Expected Top Gaps (Labeled)</th>
                <th className="py-3.5 px-4">Predicted Top Gaps (Engine)</th>
                <th className="py-3.5 px-3 text-center">Precision@3</th>
                <th className="py-3.5 px-3 text-center">Recall@3</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {personas.map((p) => {
                return (
                  <tr
                    key={p.persona_id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Persona Name & Target Role */}
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        Role: {p.role_id}
                      </div>
                    </td>

                    {/* Expected Top Gaps */}
                    <td className="py-3.5 px-4">
                      {p.expected_top_gaps.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {p.expected_top_gaps.map((gap) => (
                            <span
                              key={gap}
                              className="inline-flex items-center text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {gap}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          None (All targets met)
                        </span>
                      )}
                    </td>

                    {/* Predicted Top Gaps with match highlighting */}
                    <td className="py-3.5 px-4">
                      {p.predicted_top_gaps.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {p.predicted_top_gaps.map((gap) => {
                            const isMatch = p.expected_top_gaps.includes(gap);

                            return (
                              <span
                                key={gap}
                                className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                                  isMatch
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {isMatch ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                )}
                                {gap}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          None (Zero gap detected)
                        </span>
                      )}
                    </td>

                    {/* Precision@3 */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          p.precision_at_3 >= 0.8
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {(p.precision_at_3 * 100).toFixed(0)}%
                      </span>
                    </td>

                    {/* Recall@3 */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          p.recall_at_3 >= 0.8
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {(p.recall_at_3 * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
