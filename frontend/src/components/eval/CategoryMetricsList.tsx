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
  { label: string; icon: React.ReactNode; description: string; headerColor: string }
> = {
  'Skill-Gap Accuracy': {
    label: 'Skill-Gap Accuracy',
    icon: <Target className="w-4 h-4 text-black" />,
    description: 'Precision, recall, and rank correlation against hand-labeled benchmark personas.',
    headerColor: 'bg-[#70d6ff]',
  },
  Personalization: {
    label: 'Personalization',
    icon: <Sparkles className="w-4 h-4 text-black" />,
    description: 'Persona differentiation distance and prevention of strong-skill leakage.',
    headerColor: 'bg-[#b892ff]',
  },
  'Roadmap Quality': {
    label: 'Roadmap Quality',
    icon: <Layers className="w-4 h-4 text-black" />,
    description: 'Prerequisite DAG topological ordering and weekly study hour budget compliance.',
    headerColor: 'bg-[#ffe566]',
  },
  Adaptability: {
    label: 'Adaptability',
    icon: <GitBranch className="w-4 h-4 text-black" />,
    description: 'Real-time replan diff generation and responsiveness to market standard version updates.',
    headerColor: 'bg-[#79e7a8]',
  },
  'Recommendation Relevance': {
    label: 'Recommendation Relevance',
    icon: <Search className="w-4 h-4 text-black" />,
    description: 'Semantic Chroma retrieval accuracy and learner level-band fit filtering.',
    headerColor: 'bg-[#ff9770]',
  },
  Explainability: {
    label: 'Explainability',
    icon: <MessageSquare className="w-4 h-4 text-black" />,
    description: 'Structured rationale completeness and numerical consistency between LLM narratives and facts.',
    headerColor: 'bg-[#ff70a6]',
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
      <div className="flex items-center justify-between pb-3 border-b-2 border-black">
        <div>
          <h2 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-black" />
            Six Judging Category Metrics
          </h2>
          <p className="text-xs font-bold text-neutral-600 mt-0.5">
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
              className="p-5 border-2 border-black bg-white rounded-2xl shadow-neo transition-all"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-black/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl border-2 border-black shadow-neo-xs ${config.headerColor}`}>
                    {config.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-black truncate">
                      {config.label}
                    </h3>
                    <p className="text-[11px] font-bold text-neutral-500 truncate">
                      {config.description}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-black px-3 py-1 rounded-xl border-2 border-black shadow-neo-xs flex-shrink-0 ${
                    allPassed
                      ? 'bg-[#79e7a8] text-black'
                      : 'bg-[#ff6b6b] text-black'
                  }`}
                >
                  {passedCount} / {categoryMetrics.length} Passed
                </span>
              </div>

              {/* Metrics rows */}
              <div className="space-y-3">
                {categoryMetrics.map((metric) => {
                  const valStr = formatMetricValue(metric.value, metric.unit);
                  const targetStr = formatMetricValue(metric.target, metric.unit);
                  const barWidth = getBarPercentage(metric.value, metric.target, metric.unit, metric.passed);

                  return (
                    <div
                      key={metric.id}
                      className={`p-3.5 rounded-xl border-2 border-black transition-all ${
                        metric.passed
                          ? 'bg-[#faf6ee] shadow-neo-xs'
                          : 'bg-[#ff6b6b]/10 shadow-neo-xs'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                        <div className="min-w-0">
                          <span className="text-xs font-black text-black block truncate">
                            {metric.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
                          {/* Value vs Target with Comparator */}
                          <div className="text-xs font-mono">
                            <span className="font-black text-black">
                              {valStr}
                            </span>
                            <span className="text-neutral-500 mx-1 font-sans font-bold">
                              {metric.comparator}
                            </span>
                            <span className="text-neutral-600 font-bold">
                              target {targetStr}
                            </span>
                          </div>

                          {/* Pass/Fail Badge */}
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-lg border-2 border-black shadow-neo-xs ${
                              metric.passed
                                ? 'bg-[#79e7a8] text-black'
                                : 'bg-[#ff6b6b] text-black'
                            }`}
                          >
                            {metric.passed ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-black" />
                                Passed
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-black" />
                                Failed
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Small visual comparison bar */}
                      <div className="w-full h-2 rounded-full bg-white border border-black overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            metric.passed ? 'bg-[#79e7a8]' : 'bg-[#ff6b6b]'
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
