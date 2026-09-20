import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import type { CategoryScore } from '../../types/api';
import { Layers } from 'lucide-react';

export interface CategoryScoreBarsProps {
  categoryScores: CategoryScore[];
}

export const CategoryScoreBars: React.FC<CategoryScoreBarsProps> = ({
  categoryScores,
}) => {
  const getBarColor = (score: number): 'emerald' | 'primary' | 'amber' | 'blue' => {
    if (score >= 75) return 'emerald';
    if (score >= 55) return 'primary';
    if (score >= 40) return 'blue';
    return 'amber';
  };

  return (
    <Card className="border-slate-200 h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary-600" />
          <CardTitle>Category Alignment</CardTitle>
        </div>
        <CardDescription>
          Skill alignment breakdown across core engineering categories.
        </CardDescription>
      </CardHeader>

      <div className="p-5 flex-1 flex flex-col justify-around space-y-4">
        {categoryScores.map((cat) => (
          <div key={cat.category} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
              <span>{cat.category}</span>
              <span className="font-mono text-slate-900">{cat.score.toFixed(1)}%</span>
            </div>
            <ProgressBar
              value={cat.score}
              max={100}
              color={getBarColor(cat.score)}
              size="md"
            />
          </div>
        ))}
      </div>
    </Card>
  );
};
