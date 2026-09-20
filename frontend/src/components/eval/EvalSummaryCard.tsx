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
    <Card className="p-6 sm:p-8 border-2 border-black bg-[#fdfbf7] shadow-neo">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Overall Title & Benchmark Stats */}
        <div className="space-y-3.5 text-center md:text-left flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-black bg-[#ffe566] px-3.5 py-1 rounded-xl border-2 border-black shadow-neo-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-black" />
              Evaluation & Judging Suite
            </span>
            <span className="text-xs text-neutral-600 font-bold flex items-center gap-1 bg-white border border-black px-2.5 py-0.5 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" />
              {formattedDate}
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-black tracking-tight">
              {summary.passed} / {summary.total} Benchmarks Passed
            </h1>
            <p className="text-xs sm:text-sm font-bold text-neutral-600 mt-1 max-w-xl">
              Independent evaluation harness validating skill-gap accuracy, personalization distance, topological ordering, and ADK agent trajectory compliance.
            </p>
          </div>

          {/* Metric Status Chips */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-black bg-[#79e7a8] px-3 py-1.5 rounded-xl border-2 border-black shadow-neo-xs">
              <CheckCircle2 className="w-4 h-4 text-black" />
              {summary.passed} Passing
            </span>

            {failedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-black bg-[#ff6b6b] px-3 py-1.5 rounded-xl border-2 border-black shadow-neo-xs">
                <XCircle className="w-4 h-4 text-black" />
                {failedCount} Failing
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 text-xs font-black text-black bg-white px-3 py-1.5 rounded-xl border-2 border-black shadow-neo-xs">
              <Users className="w-4 h-4 text-black" />
              {personasCount} Golden Personas
            </span>

            <span className="inline-flex items-center gap-1.5 text-xs font-black text-black bg-white px-3 py-1.5 rounded-xl border-2 border-black shadow-neo-xs">
              <Bot className="w-4 h-4 text-black" />
              {adkCasesCount} ADK Test Cases
            </span>
          </div>
        </div>

        {/* Right: Pass-Rate Ring / Gauge */}
        <div className="flex flex-col items-center justify-center bg-white p-5 rounded-2xl border-2 border-black shadow-neo flex-shrink-0">
          <Gauge
            value={summary.pass_rate}
            size={130}
            strokeWidth={14}
            label="Pass Rate"
            subtext={`${summary.pass_rate.toFixed(1)}% Overall`}
          />
          <div className="mt-3">
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
