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
      <div className="flex items-center justify-between pb-3 border-b-2 border-black">
        <div>
          <h2 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-black" />
            Golden Personas Benchmark Accuracy
          </h2>
          <p className="text-xs font-bold text-neutral-600 mt-0.5">
            Hand-labeled personas tested against deterministic gap math. Predicted gaps matching expected gaps are highlighted.
          </p>
        </div>
      </div>

      <Card className="border-2 border-black bg-white rounded-2xl overflow-hidden shadow-neo">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-800 border-collapse">
            <thead>
              <tr className="bg-[#ffe566] border-b-2 border-black text-black font-black uppercase tracking-wider text-xs">
                <th className="py-4 px-4">Persona & Role</th>
                <th className="py-4 px-4">Expected Top Gaps (Labeled)</th>
                <th className="py-4 px-4">Predicted Top Gaps (Engine)</th>
                <th className="py-4 px-3 text-center">Precision@3</th>
                <th className="py-4 px-3 text-center">Recall@3</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/10">
              {personas.map((p) => {
                return (
                  <tr
                    key={p.persona_id}
                    className="hover:bg-[#faf6ee] transition-colors"
                  >
                    {/* Persona Name & Target Role */}
                    <td className="py-4 px-4 font-bold text-black">
                      <div className="font-black text-black text-sm">{p.name}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5 font-mono font-bold">
                        Role: {p.role_id}
                      </div>
                    </td>

                    {/* Expected Top Gaps */}
                    <td className="py-4 px-4">
                      {p.expected_top_gaps.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {p.expected_top_gaps.map((gap) => (
                            <span
                              key={gap}
                              className="inline-flex items-center text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-neutral-100 text-black border border-black shadow-neo-xs"
                            >
                              {gap}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400 italic font-bold">
                          None (All targets met)
                        </span>
                      )}
                    </td>

                    {/* Predicted Top Gaps with match highlighting */}
                    <td className="py-4 px-4">
                      {p.predicted_top_gaps.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {p.predicted_top_gaps.map((gap) => {
                            const isMatch = p.expected_top_gaps.includes(gap);

                            return (
                              <span
                                key={gap}
                                className={`inline-flex items-center gap-1 text-xs font-mono font-black px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs ${
                                  isMatch
                                    ? 'bg-[#79e7a8] text-black'
                                    : 'bg-[#ff9770] text-black'
                                }`}
                              >
                                {isMatch ? (
                                  <Check className="w-3.5 h-3.5 text-black" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-black" />
                                )}
                                {gap}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400 italic font-bold">
                          None (Zero gap detected)
                        </span>
                      )}
                    </td>

                    {/* Precision@3 */}
                    <td className="py-4 px-3 text-center">
                      <span
                        className={`inline-flex items-center text-xs font-black px-3 py-1 rounded-xl border-2 border-black shadow-neo-xs ${
                          p.precision_at_3 >= 0.8
                            ? 'bg-[#79e7a8] text-black'
                            : 'bg-[#ffe566] text-black'
                        }`}
                      >
                        {(p.precision_at_3 * 100).toFixed(0)}%
                      </span>
                    </td>

                    {/* Recall@3 */}
                    <td className="py-4 px-3 text-center">
                      <span
                        className={`inline-flex items-center text-xs font-black px-3 py-1 rounded-xl border-2 border-black shadow-neo-xs ${
                          p.recall_at_3 >= 0.8
                            ? 'bg-[#79e7a8] text-black'
                            : 'bg-[#ffe566] text-black'
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
