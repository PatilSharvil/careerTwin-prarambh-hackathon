import React, { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { RouteGuard } from './components/RouteGuard';
import { ToastProvider } from './components/ui/Toast';
import { useStore } from './store/useStore';

import { LandingPage } from './pages/LandingPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnalysisPage } from './pages/AnalysisPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { ProgressPage } from './pages/ProgressPage';
import { EvalPage } from './pages/EvalPage';

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
  const completedMilestones = useStore((s) => s.completedMilestones);

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
        return Boolean(state?.role || (profile && profile.target_role_id));
      case 2:
        return Boolean(state?.analysis);
      case 3:
        return Boolean(state?.roadmap);
      case 4:
        return Boolean(
          completedMilestones.length > 0 ||
          state?.roadmap?.items?.some((i) => i.status === 'done')
        );
      case 5:
        return Boolean(evalReport);
      default:
        return false;
    }
  };

  return (
    <header className="bg-white border-b-2 border-black sticky top-0 z-40 shadow-neo-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[4rem] py-2 gap-4">
          {/* Left: Logo */}
          <div className="flex-1 flex items-center justify-start min-w-0">
            <Link to="/" className="inline-flex items-center group">
              <img
                src="/logo.png"
                alt="CareerTwin Logo"
                className="h-8 sm:h-9 w-auto max-w-[150px] sm:max-w-[180px] object-contain"
              />
            </Link>
          </div>

          {/* Center: 5-step Progress Indicator (rock-solid center aligned) */}
          <nav className="hidden md:flex items-center gap-2 flex-shrink-0" aria-label="Step progress">
            {STEPS.map((step) => {
              const isActive = currentPath === step.path;
              const isCompleted = isStepCompleted(step.step);

              return (
                <Link
                  key={step.path}
                  to={step.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border-2 border-black transition-colors duration-150 select-none ${
                    isActive
                      ? 'bg-[#ffe566] text-black shadow-neo-sm'
                      : isCompleted
                      ? 'bg-[#79e7a8] text-black shadow-neo-xs hover:bg-[#68d897]'
                      : 'bg-white text-slate-800 hover:text-black hover:bg-[#faf6ee] shadow-neo-xs'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-black flex-shrink-0 transition-colors duration-150 ${
                      isActive
                        ? isCompleted
                          ? 'bg-[#79e7a8] text-black'
                          : 'bg-black text-[#ffe566]'
                        : isCompleted
                        ? 'bg-white text-black'
                        : 'bg-slate-100 text-black'
                    }`}
                  >
                    {isCompleted ? '✓' : step.step}
                  </span>
                  <span className="whitespace-nowrap">{step.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Target Role indicator pill */}
          <div className="flex-1 flex items-center justify-end min-w-0">
            {state?.role ? (
              <span className="hidden sm:inline-flex items-center text-xs font-black text-black bg-[#b892ff] px-2.5 py-1 rounded-xl border-2 border-black shadow-neo-xs max-w-[200px] truncate">
                🎯 <span className="truncate ml-1">{state.role.title}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile Step Bar */}
      <div className="md:hidden flex border-t-2 border-black px-2 py-2 gap-2 bg-[#faf6ee] overflow-x-auto">
        {STEPS.map((step) => {
          const isActive = currentPath === step.path;
          const isCompleted = isStepCompleted(step.step);
          return (
            <Link
              key={step.path}
              to={step.path}
              className={`flex-shrink-0 px-2.5 py-1 text-xs font-bold rounded-lg border-2 border-black transition-colors duration-150 ${
                isActive
                  ? 'bg-[#ffe566] text-black shadow-neo-xs'
                  : isCompleted
                  ? 'bg-[#79e7a8] text-black shadow-neo-xs'
                  : 'bg-white text-slate-800 shadow-neo-xs'
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
