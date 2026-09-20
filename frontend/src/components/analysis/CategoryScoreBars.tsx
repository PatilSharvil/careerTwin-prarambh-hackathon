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
    <Card className="border-2 border-black bg-white rounded-2xl shadow-neo h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-black stroke-[2.5]" />
          <CardTitle className="text-base font-black text-black">Category Alignment</CardTitle>
        </div>
        <CardDescription className="text-xs font-medium text-slate-700">
          Skill alignment breakdown across core engineering categories.
        </CardDescription>
      </CardHeader>

      <div className="p-5 flex-1 flex flex-col justify-around space-y-4">
        {categoryScores.map((cat) => (
          <div key={cat.category} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-black text-black">
              <span>{cat.category}</span>
              <span className="font-mono font-black bg-[#faf6ee] px-2 py-0.5 rounded border border-black shadow-neo-xs">{cat.score.toFixed(1)}%</span>
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
