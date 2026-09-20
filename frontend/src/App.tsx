import React, { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { getHealth } from './api/endpoints';
import { Badge } from './components/ui/Badge';
import { RouteGuard } from './components/RouteGuard';
import { ToastProvider, useToast } from './components/ui/Toast';
import { useStore } from './store/useStore';
import type { Meta } from './types/api';

import { LandingPage } from './pages/LandingPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnalysisPage } from './pages/AnalysisPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { ProgressPage } from './pages/ProgressPage';
import { EvalPage } from './pages/EvalPage';
import { Cpu, Sparkles, RotateCcw } from 'lucide-react';

const STEPS = [
  { step: 1, path: '/profile', label: 'Profile' },
  { step: 2, path: '/analysis', label: 'Analysis' },
  { step: 3, path: '/roadmap', label: 'Roadmap' },
  { step: 4, path: '/progress', label: 'Progress' },
  { step: 5, path: '/eval', label: 'Eval' },
];

const Navigation: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const profile = useStore((s) => s.profile);
  const state = useStore((s) => s.state);
  const evalReport = useStore((s) => s.evalReport);

  // Sync document title with current route
  useEffect(() => {
    switch (currentPath) {
      case '/':
        document.title = 'CareerTwin — AI Career Navigator';
        break;
      case '/profile':
        document.title = 'CareerTwin — Profile & Evidence';
        break;
      case '/analysis':
        document.title = 'CareerTwin — Skill-Gap Analysis';
        break;
      case '/roadmap':
        document.title = 'CareerTwin — Execution Roadmap';
        break;
      case '/progress':
        document.title = 'CareerTwin — Progress & Replan';
        break;
      case '/eval':
        document.title = 'CareerTwin — Evaluation Dashboard';
        break;
      default:
        document.title = 'CareerTwin — AI Career Navigator';
    }
  }, [currentPath]);

  // Determine real step completion from store state
  const isStepCompleted = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return Boolean(profile || state);
      case 2:
        return Boolean(state?.analysis);
      case 3:
        return Boolean(state?.roadmap);
      case 4:
        return Boolean(state?.roadmap?.items?.some((i) => i.status === 'done'));
      case 5:
        return Boolean(evalReport);
      default:
        return false;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:bg-primary-700 transition-colors">
                CT
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-primary-600 transition-colors">
                CareerTwin
              </span>
            </Link>
          </div>

          {/* 5-step Progress Indicator reflecting real progress */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2" aria-label="Step progress">
            {STEPS.map((step) => {
              const isActive = currentPath === step.path;
              const isCompleted = isStepCompleted(step.step);

              return (
                <Link
                  key={step.path}
                  to={step.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-500 font-semibold shadow-xs'
                      : isCompleted
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? '✓' : step.step}
                  </span>
                  <span>{step.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Target Role indicator pill */}
          <div className="flex items-center space-x-3">
            {state?.role ? (
              <span className="hidden sm:inline-flex items-center text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md border border-primary-200">
                {state.role.title}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile Step Bar */}
      <div className="md:hidden flex border-t border-slate-100 px-2 py-1.5 overflow-x-auto">
        {STEPS.map((step) => {
          const isActive = currentPath === step.path;
          const isCompleted = isStepCompleted(step.step);
          return (
            <Link
              key={step.path}
              to={step.path}
              className={`flex-shrink-0 px-2.5 py-1 text-xs font-medium rounded ${
                isActive
                  ? 'text-primary-700 font-bold'
                  : isCompleted
                  ? 'text-slate-800 font-medium'
                  : 'text-slate-400'
              }`}
            >
              {isCompleted ? '✓' : `${step.step}.`} {step.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
};

const Footer: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [apiStatus, setApiStatus] = useState<'ok' | 'down' | 'mock' | 'checking'>('checking');
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';
  const stateMeta = useStore((s) => s.state?.meta);
  const resetStore = useStore((s) => s.reset);

  const meta: Meta = stateMeta || {
    llm_provider: isMock ? 'gemini' : 'none',
    llm_used: isMock,
    fallback_used: false,
  };

  const handleResetDemo = () => {
    resetStore();
    showToast({
      type: 'info',
      title: 'Demo Reset',
      message: 'Client state has been cleared.',
    });
    navigate('/profile');
  };

  useEffect(() => {
    if (isMock) {
      setApiStatus('mock');
      return;
    }

    let isMounted = true;
    getHealth()
      .then((data) => {
        if (isMounted) {
          setApiStatus(data.status === 'ok' ? 'ok' : 'down');
        }
      })
      .catch(() => {
        if (isMounted) {
          setApiStatus('down');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isMock]);

  return (
    <footer className="bg-white border-t border-slate-200 py-3 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700">CareerTwin</span>
          <span>&copy; 2026</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">SPEC §10 Frozen Contract</span>
          <span className="text-slate-300">|</span>
          {/* Reset Demo Button */}
          <button
            onClick={handleResetDemo}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200 transition-colors"
            title="Clear client store state for a fresh demo run"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset demo</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {/* Metadata Chip */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 text-[11px]">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-medium">LLM: {meta.llm_provider}</span>
            {meta.fallback_used && (
              <Badge variant="medium" size="sm">
                template
              </Badge>
            )}
            {meta.llm_used && !meta.fallback_used && (
              <span className="inline-flex items-center text-primary-600">
                <Sparkles className="w-3 h-3 ml-0.5" />
              </span>
            )}
          </div>

          {/* API Status Indicator */}
          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-200">
            <span>API:</span>
            {apiStatus === 'ok' && (
              <span className="inline-flex items-center text-emerald-700 font-medium">
                <span className="w-2 h-2 mr-1 bg-emerald-500 rounded-full animate-pulse"></span> OK
              </span>
            )}
            {apiStatus === 'down' && (
              <span className="inline-flex items-center text-red-700 font-medium">
                <span className="w-2 h-2 mr-1 bg-red-500 rounded-full"></span> Down
              </span>
            )}
            {apiStatus === 'mock' && (
              <span className="inline-flex items-center text-amber-700 font-medium">
                <span className="w-2 h-2 mr-1 bg-amber-500 rounded-full"></span> Mock Mode
              </span>
            )}
            {apiStatus === 'checking' && (
              <span className="inline-flex items-center text-slate-400">checking...</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-primary-100 selection:text-primary-800">
      <Navigation />
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/eval" element={<EvalPage />} />

          {/* Protected Routes - Redirect to /profile if state === null */}
          <Route
            path="/analysis"
            element={
              <RouteGuard>
                <AnalysisPage />
              </RouteGuard>
            }
          />
          <Route
            path="/roadmap"
            element={
              <RouteGuard>
                <RoadmapPage />
              </RouteGuard>
            }
          />
          <Route
            path="/progress"
            element={
              <RouteGuard>
                <ProgressPage />
              </RouteGuard>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
};
