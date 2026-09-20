import React from 'react';
import { Card } from '../ui/Card';
import { Gauge } from '../ui/Gauge';
import { Badge } from '../ui/Badge';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Users,
  Bot,
  Sparkles,
} from 'lucide-react';

export interface EvalSummaryCardProps {
  summary: {
    total: number;
    passed: number;
    pass_rate: number;
  };
  generatedAt: string;
  personasCount: number;
  adkCasesCount: number;
}

export const EvalSummaryCard: React.FC<EvalSummaryCardProps> = ({
  summary,
  generatedAt,
  personasCount,
  adkCasesCount,
}) => {
  const formattedDate = (() => {
    try {
      return new Date(generatedAt).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return generatedAt;
    }
  })();

  const failedCount = summary.total - summary.passed;

  return (
    <Card className="p-6 border-slate-200 bg-white shadow-xs">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Overall Title & Benchmark Stats */}
        <div className="space-y-3 text-center md:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-3 py-1 rounded-full border border-primary-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary-600" />
              Evaluation & Judging Suite
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {formattedDate}
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {summary.passed} / {summary.total} Benchmarks Passed
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Independent evaluation harness validating skill-gap accuracy, personalization distance, topological ordering, and ADK agent trajectory compliance.
            </p>
          </div>

          {/* Metric Status Chips */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {summary.passed} Passing
            </span>

            {failedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-800 bg-red-50 px-3 py-1 rounded-lg border border-red-200">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                {failedCount} Failing
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              {personasCount} Golden Personas
            </span>

            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              <Bot className="w-3.5 h-3.5 text-slate-500" />
              {adkCasesCount} ADK Test Cases
            </span>
          </div>
        </div>

        {/* Right: Pass-Rate Ring / Gauge */}
        <div className="flex flex-col items-center justify-center bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex-shrink-0">
          <Gauge
            value={summary.pass_rate}
            size={120}
            strokeWidth={12}
            label="Pass Rate"
            subtext={`${summary.pass_rate.toFixed(1)}% Overall`}
          />
          <div className="mt-2">
            <Badge
              variant={summary.pass_rate >= 80 ? 'primary' : 'critical'}
              size="sm"
            >
              {summary.pass_rate >= 80 ? 'Target Achieved (≥80%)' : 'Below Threshold'}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};
