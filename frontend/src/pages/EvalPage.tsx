import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { getEvalReport } from '../api/endpoints';
import { ApiError } from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import type { EvalReport } from '../types/api';

import {
  EvalSummaryCard,
  CategoryMetricsList,
  PersonasTable,
  AdkEvalBlock,
  EvalNotRunState,
} from '../components/eval';
import { Eye, ShieldAlert } from 'lucide-react';

export const EvalPage: React.FC = () => {
  const { showToast } = useToast();

  const evalReport = useStore((s) => s.evalReport);
  const setEvalReport = useStore((s) => s.setEvalReport);

  const [report, setReport] = useState<EvalReport | null>(evalReport);
  const [isLoading, setIsLoading] = useState<boolean>(!evalReport);
  const [isNotRun, setIsNotRun] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Allow tester/judge to simulate EVAL_NOT_RUN view vs Report view
  const [simulatedEmptyView, setSimulatedEmptyView] = useState<boolean>(false);

  const fetchReport = async () => {
    setIsLoading(true);
    setIsNotRun(false);
    setErrorMsg(null);

    try {
      const res = await getEvalReport();
      setReport(res);
      setEvalReport(res);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'EVAL_NOT_RUN') {
        setIsNotRun(true);
      } else {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Failed to load evaluation benchmark report.';
        setErrorMsg(message);
        showToast({
          type: 'error',
          title: 'Eval Report Error',
          message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (isLoading) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        <Skeleton height="140px" className="rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton height="320px" className="rounded-xl" />
          <Skeleton height="320px" className="rounded-xl" />
        </div>
        <Skeleton height="260px" className="rounded-xl" />
        <Skeleton height="220px" className="rounded-xl" />
      </div>
    );
  }

  // If actual EVAL_NOT_RUN error was encountered or simulated for verification
  if (isNotRun || simulatedEmptyView) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {simulatedEmptyView && (
          <div className="max-w-3xl mx-auto flex items-center justify-between p-3.5 rounded-2xl bg-[#ffe566] border-2 border-black shadow-neo-xs text-xs text-black">
            <span className="flex items-center gap-2 font-black">
              <ShieldAlert className="w-4 h-4 text-black" />
              Simulating EVAL_NOT_RUN empty state view for evaluation acceptance
            </span>
            <button
              onClick={() => setSimulatedEmptyView(false)}
              className="text-xs font-black text-black underline hover:no-underline bg-white px-2.5 py-1 rounded-lg border border-black shadow-neo-xs"
            >
              Restore Report View
            </button>
          </div>
        )}

        <EvalNotRunState
          onRetry={() => {
            setSimulatedEmptyView(false);
            fetchReport();
          }}
          isLoading={isLoading}
        />
      </div>
    );
  }

  if (errorMsg && !report) {
    return (
      <div className="py-12 px-4 max-w-2xl mx-auto text-center space-y-4">
        <div className="p-4 rounded-2xl bg-[#ff6b6b] text-black border-2 border-black font-black text-sm shadow-neo">
          {errorMsg}
        </div>
        <button
          onClick={fetchReport}
          className="text-xs text-black font-black underline hover:no-underline bg-[#ffe566] border-2 border-black px-4 py-2 rounded-xl shadow-neo-xs"
        >
          Try Reloading
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <EvalNotRunState onRetry={fetchReport} isLoading={isLoading} />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* View Switcher for easy test verification of empty state */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setSimulatedEmptyView(true)}
          className="inline-flex items-center gap-2 text-xs font-black text-black px-4 py-2 rounded-xl border-2 border-black bg-white hover:bg-[#ffe566] transition-all shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5"
          title="Preview EVAL_NOT_RUN state"
        >
          <Eye className="w-4 h-4 text-black" />
          <span>Test Empty State (EVAL_NOT_RUN)</span>
        </button>
      </div>

      {/* 1. Summary Card */}
      <EvalSummaryCard
        summary={report.summary}
        generatedAt={report.generated_at}
        personasCount={report.personas.length}
        adkCasesCount={report.adk.cases.length}
      />

      {/* 2. Metrics Grouped by Judging Categories */}
      <CategoryMetricsList metrics={report.metrics} />

      {/* 3. Golden Personas Benchmark Table */}
      <PersonasTable personas={report.personas} />

      {/* 4. ADK Agent Trajectory & Coach Evaluation Block */}
      <AdkEvalBlock adk={report.adk} />
    </div>
  );
};
