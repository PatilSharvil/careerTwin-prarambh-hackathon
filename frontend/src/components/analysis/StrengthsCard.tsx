import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Strength } from '../../types/api';
import { CheckCircle2, Award } from 'lucide-react';

export interface StrengthsCardProps {
  strengths: Strength[];
}

export const StrengthsCard: React.FC<StrengthsCardProps> = ({ strengths }) => {
  if (strengths.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-black bg-white rounded-2xl shadow-neo overflow-hidden">
      <CardHeader className="py-3.5 px-5 bg-[#faf6ee] border-b-2 border-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-black stroke-[2.5]" />
            <CardTitle className="text-sm font-black text-black">Validated Strengths ({strengths.length})</CardTitle>
          </div>
          <Badge variant="done" size="sm">
            Target Met
          </Badge>
        </div>
        <CardDescription className="text-xs font-medium text-slate-700">
          Skills where your calibrated level meets or exceeds role targets with zero gap required.
        </CardDescription>
      </CardHeader>

      <div className="p-4 flex flex-wrap gap-2.5">
        {strengths.map((str) => (
          <div
            key={str.skill_id}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#79e7a8] border-2 border-black text-xs text-black font-extrabold shadow-neo-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-black stroke-[3] flex-shrink-0" />
            <span className="font-black text-black">{str.skill_name}</span>
            <span className="text-[11px] text-black font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-black shadow-neo-xs">
              {str.level.toFixed(1)} / {str.target.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
