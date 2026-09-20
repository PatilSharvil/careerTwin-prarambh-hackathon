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
    <header className="bg-white border-b-2 border-black sticky top-0 z-40 shadow-neo-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src="/logo.png"
                alt="CareerTwin Logo"
                className="h-9 w-auto object-contain hover:scale-102 transition-transform"
              />
            </Link>
          </div>

          {/* 5-step Progress Indicator reflecting real progress */}
          <nav className="hidden md:flex items-center space-x-1.5 lg:space-x-2.5" aria-label="Step progress">
            {STEPS.map((step) => {
              const isActive = currentPath === step.path;
              const isCompleted = isStepCompleted(step.step);

              return (
                <Link
                  key={step.path}
                  to={step.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-black transition-all ${
                    isActive
                      ? 'bg-[#ffe566] text-black shadow-neo scale-105'
                      : isCompleted
                      ? 'bg-[#79e7a8] text-black shadow-neo-xs hover:bg-[#68d897]'
                      : 'bg-white text-slate-600 hover:text-black hover:bg-[#faf6ee] shadow-neo-xs opacity-80 hover:opacity-100'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-black ${
                      isActive
                        ? 'bg-black text-[#ffe566]'
                        : isCompleted
                        ? 'bg-white text-black'
                        : 'bg-slate-100 text-black'
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
              <span className="hidden sm:inline-flex items-center text-xs font-black text-black bg-[#b892ff] px-3 py-1 rounded-xl border-2 border-black shadow-neo-xs">
                🎯 {state.role.title}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile Step Bar */}
      <div className="md:hidden flex border-t-2 border-black px-2 py-2 gap-1.5 bg-[#faf6ee] overflow-x-auto">
        {STEPS.map((step) => {
          const isActive = currentPath === step.path;
          const isCompleted = isStepCompleted(step.step);
          return (
            <Link
              key={step.path}
              to={step.path}
              className={`flex-shrink-0 px-2.5 py-1 text-xs font-bold rounded-lg border-2 border-black transition-all ${
                isActive
                  ? 'bg-[#ffe566] text-black shadow-neo-xs'
                  : isCompleted
                  ? 'bg-[#79e7a8] text-black'
                  : 'bg-white text-slate-500'
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
    <footer className="bg-white border-t-2 border-black py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-black font-semibold">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-black text-black">CareerTwin</span>
          <span>&copy; 2026</span>
          <span className="text-black font-black">|</span>
          <span className="text-slate-600 font-medium">SPEC §10 Frozen Contract</span>
          <span className="text-black font-black">|</span>
          {/* Reset Demo Button */}
          <button
            onClick={handleResetDemo}
            className="inline-flex items-center gap-1 text-[11px] font-black text-black bg-[#ff9770] hover:bg-[#ff8559] px-2.5 py-1 rounded-lg border-2 border-black shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5 transition-all"
            title="Clear client store state for a fresh demo run"
          >
            <RotateCcw className="w-3 h-3 text-black" />
            <span>Reset Demo</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {/* Metadata Chip */}
          <div className="flex items-center gap-1.5 bg-[#faf6ee] px-3 py-1 rounded-xl border-2 border-black shadow-neo-xs text-[11px] font-bold">
            <Cpu className="w-3.5 h-3.5 text-black" />
            <span className="text-black">LLM: {meta.llm_provider}</span>
            {meta.fallback_used && (
              <Badge variant="medium" size="sm">
                template
              </Badge>
            )}
            {meta.llm_used && !meta.fallback_used && (
              <span className="inline-flex items-center text-amber-600 font-black">
                <Sparkles className="w-3.5 h-3.5 ml-0.5" />
              </span>
            )}
          </div>

          {/* API Status Indicator */}
          <div className="flex items-center space-x-1.5 pl-2 border-l-2 border-black">
            <span>API:</span>
            {apiStatus === 'ok' && (
              <span className="inline-flex items-center text-black font-black bg-[#79e7a8] px-2 py-0.5 rounded-md border border-black text-[11px]">
                <span className="w-2 h-2 mr-1 bg-black rounded-full animate-pulse"></span> OK
              </span>
            )}
            {apiStatus === 'down' && (
              <span className="inline-flex items-center text-black font-black bg-[#ff6b6b] px-2 py-0.5 rounded-md border border-black text-[11px]">
                <span className="w-2 h-2 mr-1 bg-black rounded-full"></span> Down
              </span>
            )}
            {apiStatus === 'mock' && (
              <span className="inline-flex items-center text-black font-black bg-[#ffd166] px-2 py-0.5 rounded-md border border-black text-[11px]">
                <span className="w-2 h-2 mr-1 bg-black rounded-full"></span> Mock Mode
              </span>
            )}
            {apiStatus === 'checking' && (
              <span className="inline-flex items-center text-slate-500 font-bold">checking...</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf6ee] text-slate-900 selection:bg-[#ffe566] selection:text-black">
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
