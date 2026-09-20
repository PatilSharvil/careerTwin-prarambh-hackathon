import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  ArrowRight,
  UserCheck,
  Target,
  MapPin,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const loopSteps = [
    {
      step: '1',
      title: 'Profile',
      description: 'Extract evidence-backed skill proficiencies from your resume and self-assessment.',
      icon: UserCheck,
      color: 'text-primary-600 bg-primary-50 border-primary-200',
    },
    {
      step: '2',
      title: 'Gaps',
      description: 'Compare current calibration against target role weights with zero hallucinations.',
      icon: Target,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    },
    {
      step: '3',
      title: 'Roadmap',
      description: 'Generate prerequisite-ordered topological schedules fitting your exact weekly hours.',
      icon: MapPin,
      color: 'text-violet-600 bg-violet-50 border-violet-200',
    },
    {
      step: '4',
      title: 'Learn',
      description: 'Execute high-impact activities filtered precisely to your skill level band.',
      icon: BookOpen,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      step: '5',
      title: 'Track',
      description: 'Log progress, observe readiness growth, and celebrate unlocked milestones.',
      icon: CheckCircle2,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
    },
    {
      step: '6',
      title: 'Replan',
      description: 'Adapt instantly to completion, skill mastery, and real-time market updates.',
      icon: RefreshCw,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
  ];

  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>SPEC §10 Deterministic Career Engine</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
          Navigate Your Tech Career with <span className="text-primary-600">Deterministic Precision</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-10 max-w-2xl mx-auto">
          No vague advice. CareerTwin calculates exact skill gaps, builds dependency-aware roadmaps, and dynamically replans your path as you learn.
        </p>

        {/* Primary CTA - Only one CTA */}
        <div className="flex justify-center items-center">
          <Link to="/profile" className="inline-block">
            <Button size="lg" rightIcon={<ArrowRight className="w-5 h-5 ml-1" />}>
              Analyze My Career
            </Button>
          </Link>
        </div>
      </div>

      {/* Product Loop Representation */}
      <div className="mt-8">
        <div className="text-center mb-8">
          <h2 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">
            The Continuous Product Loop
          </h2>
          <p className="text-sm text-slate-600 font-medium">
            Profile &rarr; Gaps &rarr; Roadmap &rarr; Learn &rarr; Track &rarr; Replan
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loopSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.title}
                hoverable
                className="relative p-6 bg-white border border-slate-200 rounded-xl transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl border ${step.color} flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-400">0{step.step}</span>
                      <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>

                {/* Subtle loop connector hint for desktop */}
                {idx < loopSteps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-slate-300 font-bold pointer-events-none">
                    &rsaquo;
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
