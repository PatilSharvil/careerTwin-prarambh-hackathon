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
    <Card className="border-slate-200">
      <CardHeader className="py-3 px-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            <CardTitle className="text-sm">Validated Strengths ({strengths.length})</CardTitle>
          </div>
          <Badge variant="done" size="sm">
            Target Met
          </Badge>
        </div>
        <CardDescription className="text-[11px]">
          Skills where your calibrated level meets or exceeds role targets with zero gap required.
        </CardDescription>
      </CardHeader>

      <div className="p-4 flex flex-wrap gap-2.5">
        {strengths.map((str) => (
          <div
            key={str.skill_id}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-slate-800"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold text-slate-900">{str.skill_name}</span>
            <span className="text-[11px] text-emerald-700 font-mono">
              {str.level.toFixed(1)} / {str.target.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
