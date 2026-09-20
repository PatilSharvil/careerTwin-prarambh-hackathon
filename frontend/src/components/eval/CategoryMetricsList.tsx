import React from 'react';
import { Card } from '../ui/Card';
import type { EvalCategory, EvalMetric } from '../../types/api';
import {
  CheckCircle2,
  XCircle,
  Target,
  BarChart2,
  Layers,
  Sparkles,
  GitBranch,
  Search,
  MessageSquare,
} from 'lucide-react';

export interface CategoryMetricsListProps {
  metrics: EvalMetric[];
}

const CATEGORY_CONFIG: Record<
  EvalCategory,
  { label: string; icon: React.ReactNode; description: string }
> = {
  'Skill-Gap Accuracy': {
    label: 'Skill-Gap Accuracy',
    icon: <Target className="w-4 h-4 text-blue-600" />,
    description: 'Precision, recall, and rank correlation against hand-labeled benchmark personas.',
  },
  Personalization: {
    label: 'Personalization',
    icon: <Sparkles className="w-4 h-4 text-purple-600" />,
    description: 'Persona differentiation distance and prevention of strong-skill leakage.',
  },
  'Roadmap Quality': {
    label: 'Roadmap Quality',
    icon: <Layers className="w-4 h-4 text-indigo-600" />,
    description: 'Prerequisite DAG topological ordering and weekly study hour budget compliance.',
  },
  Adaptability: {
    label: 'Adaptability',
    icon: <GitBranch className="w-4 h-4 text-emerald-600" />,
    description: 'Real-time replan diff generation and responsiveness to market standard version updates.',
  },
  'Recommendation Relevance': {
    label: 'Recommendation Relevance',
    icon: <Search className="w-4 h-4 text-amber-600" />,
    description: 'Semantic Chroma retrieval accuracy and learner level-band fit filtering.',
  },
  Explainability: {
    label: 'Explainability',
    icon: <MessageSquare className="w-4 h-4 text-rose-600" />,
    description: 'Structured rationale completeness and numerical consistency between LLM narratives and facts.',
  },
};

const ORDERED_CATEGORIES: EvalCategory[] = [
  'Skill-Gap Accuracy',
  'Personalization',
  'Roadmap Quality',
  'Adaptability',
  'Recommendation Relevance',
  'Explainability',
];

export const CategoryMetricsList: React.FC<CategoryMetricsListProps> = ({ metrics }) => {
  const formatMetricValue = (val: number, unit: EvalMetric['unit']): string => {
    switch (unit) {
      case 'ratio':
        return val.toFixed(2);
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'count':
        return val.toString();
    }
  };

  const getBarPercentage = (val: number, target: number, unit: EvalMetric['unit'], passed: boolean): number => {
    if (unit === 'percent') {
      return Math.min(Math.max(val, 0), 100);
    }
    if (unit === 'ratio') {
      return Math.min(Math.max(val * 100, 0), 100);
    }
    if (unit === 'count') {
      if (target === 0) {
        return passed ? 100 : 25;
      }
      return Math.min(Math.max((val / target) * 100, 0), 100);
    }
    return 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary-600" />
            Six Judging Category Metrics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            14 automated tests measuring accuracy, personalization, roadmap topological validity, adaptability, relevance, and explainability.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {ORDERED_CATEGORIES.map((category) => {
          const categoryMetrics = metrics.filter((m) => m.category === category);
          if (categoryMetrics.length === 0) return null;

          const config = CATEGORY_CONFIG[category];
          const allPassed = categoryMetrics.every((m) => m.passed);
          const passedCount = categoryMetrics.filter((m) => m.passed).length;

          return (
            <Card
              key={category}
              className={`p-5 border shadow-2xs transition-all ${
                allPassed
                  ? 'border-slate-200 bg-white'
                  : 'border-red-200 bg-red-50/10'
              }`}
            >
              {/* Category Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-slate-100">
                    {config.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {config.label}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate">
                      {config.description}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex-shrink-0 ${
                    allPassed
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  {passedCount} / {categoryMetrics.length} Passed
                </span>
              </div>

              {/* Metrics rows */}
              <div className="space-y-3.5">
                {categoryMetrics.map((metric) => {
                  const valStr = formatMetricValue(metric.value, metric.unit);
                  const targetStr = formatMetricValue(metric.target, metric.unit);
                  const barWidth = getBarPercentage(metric.value, metric.target, metric.unit, metric.passed);

                  return (
                    <div
                      key={metric.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        metric.passed
                          ? 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200'
                          : 'border-red-200 bg-red-50/40 hover:bg-red-50/60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                        <div className="min-w-0">
                          <span
                            className={`text-xs font-bold block truncate ${
                              metric.passed ? 'text-slate-800' : 'text-red-900'
                            }`}
                          >
                            {metric.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
                          {/* Value vs Target with Comparator */}
                          <div className="text-xs font-mono">
                            <span
                              className={`font-bold ${
                                metric.passed ? 'text-slate-900' : 'text-red-700 font-extrabold'
                              }`}
                            >
                              {valStr}
                            </span>
                            <span className="text-slate-400 mx-1 font-sans">
                              {metric.comparator}
                            </span>
                            <span className="text-slate-500">
                              target {targetStr}
                            </span>
                          </div>

                          {/* Pass/Fail Badge */}
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              metric.passed
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-red-100 text-red-900 border-red-300'
                            }`}
                          >
                            {metric.passed ? (
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
                        </div>
                      </div>

                      {/* Small visual comparison bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            metric.passed ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
