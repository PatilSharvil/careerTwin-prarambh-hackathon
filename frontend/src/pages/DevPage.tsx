import React, { useState } from 'react';
import {
  analyzeProfile,
  completeProgress,
  createCustomRole,
  createProfile,
  getEvalReport,
  getHealth,
  getProfile,
  getRoadmap,
  getRoles,
  getToday,
  markKnown,
  sendCoachMessage,
  updateMarket,
} from '../api/endpoints';
import { mockService } from '../mocks/mockService';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { CheckCircle2, Play, RefreshCw, XCircle } from 'lucide-react';

interface EndpointTestResult {
  endpoint: string;
  name: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  latencyMs?: number;
  data?: unknown;
  error?: string;
}

const ENDPOINT_TESTS: Array<{
  id: string;
  name: string;
  endpoint: string;
  fn: () => Promise<unknown>;
}> = [
  {
    id: 'health',
    name: '1. Health Check',
    endpoint: 'GET /health',
    fn: () => getHealth(),
  },
  {
    id: 'roles',
    name: '2. Get Roles',
    endpoint: 'GET /roles',
    fn: () => getRoles(),
  },
  {
    id: 'custom_role',
    name: '3. Create Custom Role',
    endpoint: 'POST /roles/custom',
    fn: () =>
      createCustomRole({
        title: 'AI Safety Researcher',
        description: 'Evaluates alignment and audits model interpretability.',
      }),
  },
  {
    id: 'create_profile',
    name: '4. Create Profile',
    endpoint: 'POST /profile',
    fn: () =>
      createProfile({
        education: { degree: 'B.S. in Computer Science', year: 2023 },
        experience_years: 3,
        interests: ['LLMs', 'python'],
        self_skills: [
          { name: 'Python', self: 8.5 },
          { name: 'RAG', self: 4.0 },
        ],
        resume_text: null,
      }),
  },
  {
    id: 'get_profile',
    name: '5. Get Profile',
    endpoint: 'GET /profile',
    fn: () => getProfile(),
  },
  {
    id: 'analyze',
    name: '6. Analyze Profile',
    endpoint: 'POST /analyze',
    fn: () =>
      analyzeProfile({
        role_id: 'genai_engineer',
        weekly_hours: 10,
        deadline_weeks: 12,
      }),
  },
  {
    id: 'roadmap',
    name: '7. Get Roadmap',
    endpoint: 'GET /roadmap',
    fn: () => getRoadmap(),
  },
  {
    id: 'progress_complete',
    name: '8. Complete Skill (RAG)',
    endpoint: 'POST /progress/complete',
    fn: () => completeProgress({ skill_id: 'rag' }),
  },
  {
    id: 'progress_known',
    name: '9. Mark Skill Known',
    endpoint: 'POST /progress/known',
    fn: () => markKnown({ skill_id: 'docker', level: 6.0 }),
  },
  {
    id: 'today',
    name: '10. Get Today Pick',
    endpoint: 'GET /today',
    fn: () => getToday(),
  },
  {
    id: 'market_update',
    name: '11. Apply Market Update',
    endpoint: 'POST /market/update',
    fn: () => updateMarket({ role_id: 'genai_engineer' }),
  },
  {
    id: 'coach',
    name: '12. Send Coach Message',
    endpoint: 'POST /coach',
    fn: () =>
      sendCoachMessage({
        message: 'What should I work on today?',
        session_id: 'sess_dev_test',
      }),
  },
  {
    id: 'eval_report',
    name: '13. Get Eval Report',
    endpoint: 'GET /eval/report',
    fn: () => getEvalReport(),
  },
];

export const DevPage: React.FC = () => {
  const [results, setResults] = useState<Record<string, EndpointTestResult>>({});
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);

  const runTest = async (testId: string) => {
    const test = ENDPOINT_TESTS.find((t) => t.id === testId);
    if (!test) return;

    setResults((prev) => ({
      ...prev,
      [testId]: {
        endpoint: test.endpoint,
        name: test.name,
        status: 'loading',
      },
    }));

    const startTime = performance.now();
    try {
      const data = await test.fn();
      const latencyMs = Math.round(performance.now() - startTime);
      setResults((prev) => ({
        ...prev,
        [testId]: {
          endpoint: test.endpoint,
          name: test.name,
          status: 'success',
          latencyMs,
          data,
        },
      }));
      setSelectedEndpoint(testId);
    } catch (err: unknown) {
      const latencyMs = Math.round(performance.now() - startTime);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setResults((prev) => ({
        ...prev,
        [testId]: {
          endpoint: test.endpoint,
          name: test.name,
          status: 'error',
          latencyMs,
          error: errorMessage,
        },
      }));
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    for (const test of ENDPOINT_TESTS) {
      await runTest(test.id);
    }
    setIsRunningAll(false);
  };

  const resetMock = () => {
    mockService.reset();
    setResults({});
    setSelectedEndpoint(null);
  };

  const activeResult = selectedEndpoint ? results[selectedEndpoint] : null;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Dev Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">API Contract & Mock Test Harness</h1>
            <Badge variant="primary" size="sm">
              Temporary /_dev Route
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Verifies all 13 endpoints from SPEC §10.3 with typed mock fixtures and latency simulation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={resetMock}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Reset State
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={runAllTests}
            isLoading={isRunningAll}
            leftIcon={<Play className="w-4 h-4" />}
          >
            Run All 13 Endpoints
          </Button>
        </div>
      </div>

      {/* Main Grid: Endpoint List on Left, JSON Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Endpoints Column */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            SPEC §10.3 Endpoints (13 Total)
          </div>

          <div className="space-y-2">
            {ENDPOINT_TESTS.map((test) => {
              const res = results[test.id];
              const isSelected = selectedEndpoint === test.id;

              return (
                <div
                  key={test.id}
                  onClick={() => res?.data && setSelectedEndpoint(test.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50/40 ring-1 ring-primary-500'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900">{test.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.2 bg-slate-100 rounded">
                        {test.endpoint}
                      </span>
                    </div>
                    {res?.latencyMs !== undefined && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Latency: {res.latencyMs}ms
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {res?.status === 'loading' && <Spinner size="sm" />}
                    {res?.status === 'success' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    {res?.status === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        runTest(test.id);
                      }}
                    >
                      Run
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* JSON Inspector Column */}
        <div className="lg:col-span-7">
          <Card className="h-full flex flex-col min-h-[600px]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm">Response Inspector</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeResult
                    ? `${activeResult.name} (${activeResult.endpoint})`
                    : 'Select an endpoint to inspect its response'}
                </p>
              </div>
              {activeResult?.latencyMs !== undefined && (
                <Badge variant="default" size="sm">
                  {activeResult.latencyMs} ms
                </Badge>
              )}
            </CardHeader>

            <CardContent className="flex-1 p-0 bg-slate-950 rounded-b-xl overflow-hidden flex flex-col">
              {activeResult ? (
                <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-200">
                  {activeResult.error ? (
                    <div className="text-red-400 p-2 bg-red-950/50 rounded border border-red-800">
                      Error: {activeResult.error}
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(activeResult.data, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center text-sm font-mono">
                  <span>No endpoint selected</span>
                  <span className="text-xs mt-1 text-slate-600">
                    Click &ldquo;Run All 13 Endpoints&rdquo; or run an individual endpoint to inspect payload.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
