import React, { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { getHealth } from './api/endpoints';
import { Badge } from './components/ui/Badge';
import { RouteGuard } from './components/RouteGuard';
import { ToastProvider } from './components/ui/Toast';
import { useStore } from './store/useStore';
import type { Meta } from './types/api';

import { LandingPage } from './pages/LandingPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnalysisPage } from './pages/AnalysisPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { ProgressPage } from './pages/ProgressPage';
import { EvalPage } from './pages/EvalPage';
import { DevPage } from './pages/DevPage';
import { Cpu, Sparkles } from 'lucide-react';

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

  // Determine current step index (0-based)
  const currentStepIdx = STEPS.findIndex((s) => s.path === currentPath);

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

          {/* 5-step Progress Indicator */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {STEPS.map((step, idx) => {
              const isActive = currentPath === step.path;
              const isPast = currentStepIdx > idx;

              return (
                <Link
                  key={step.path}
                  to={step.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-500 font-semibold shadow-xs'
                      : isPast
                      ? 'text-slate-700 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : isPast
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isPast ? '✓' : step.step}
                  </span>
                  <span>{step.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action / Dev Link */}
          <div className="flex items-center space-x-3">
            <Link
              to="/_dev"
              className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-colors ${
                currentPath === '/_dev'
                  ? 'border-primary-400 bg-primary-50 text-primary-700'
                  : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              /_dev
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Step Bar */}
      <div className="md:hidden flex border-t border-slate-100 px-2 py-1.5 overflow-x-auto">
        {STEPS.map((step) => {
          const isActive = currentPath === step.path;
          return (
            <Link
              key={step.path}
              to={step.path}
              className={`flex-shrink-0 px-2.5 py-1 text-xs font-medium rounded ${
                isActive ? 'text-primary-700 font-bold' : 'text-slate-500'
              }`}
            >
              {step.step}. {step.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
};

const Footer: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<'ok' | 'down' | 'mock' | 'checking'>('checking');
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';
  const stateMeta = useStore((s) => s.state?.meta);

  const meta: Meta = stateMeta || {
    llm_provider: isMock ? 'gemini' : 'none',
    llm_used: isMock,
    fallback_used: false,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700">CareerTwin</span>
          <span>&copy; 2026</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">SPEC §10 Frozen Contract</span>
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

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
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

              {/* Temporary Dev Verification Route (F1) */}
              <Route path="/_dev" element={<DevPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
};
