import React, { useEffect, useState } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { apiClient } from './api/client';
import type { Health } from './types/api';
import { LandingPage } from './pages/LandingPage';
import { ProfilePage } from './pages/ProfilePage';
import { AnalysisPage } from './pages/AnalysisPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { ProgressPage } from './pages/ProgressPage';
import { EvalPage } from './pages/EvalPage';

const STEPS = [
  { path: '/profile', label: '1. Profile' },
  { path: '/analysis', label: '2. Analysis' },
  { path: '/roadmap', label: '3. Roadmap' },
  { path: '/progress', label: '4. Progress' },
  { path: '/eval', label: '5. Eval' },
];

const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <Link to="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-500">
              CareerTwin
            </Link>
          </div>
          <nav className="flex space-x-1 sm:space-x-4">
            {STEPS.map((step) => {
              const isActive = location.pathname === step.path;
              return (
                <Link
                  key={step.path}
                  to={step.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {step.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};

const Footer: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<'ok' | 'down' | 'mock' | 'checking'>('checking');
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  useEffect(() => {
    if (isMock) {
      setApiStatus('mock');
      return;
    }

    let isMounted = true;
    apiClient<Health>('/health')
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
    <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center text-xs text-gray-500">
        <div>CareerTwin &copy; 2026. Spec §10 frozen contract.</div>
        <div className="flex items-center space-x-2">
          <span>API:</span>
          {apiStatus === 'ok' && (
            <span className="inline-flex items-center text-green-700 font-medium">
              <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span> ok
            </span>
          )}
          {apiStatus === 'down' && (
            <span className="inline-flex items-center text-red-700 font-medium">
              <span className="w-2 h-2 mr-1 bg-red-500 rounded-full"></span> down
            </span>
          )}
          {apiStatus === 'mock' && (
            <span className="inline-flex items-center text-amber-700 font-medium">
              <span className="w-2 h-2 mr-1 bg-amber-500 rounded-full"></span> mock mode
            </span>
          )}
          {apiStatus === 'checking' && (
            <span className="inline-flex items-center text-gray-400">
              checking...
            </span>
          )}
        </div>
      </div>
    </footer>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/eval" element={<EvalPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
};
