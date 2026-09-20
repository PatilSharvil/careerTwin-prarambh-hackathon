import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
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
      color: 'bg-[#ffe566] text-black border-2 border-black shadow-neo-xs',
    },
    {
      step: '2',
      title: 'Gaps',
      description: 'Compare current calibration against target role weights with zero hallucinations.',
      icon: Target,
      color: 'bg-[#ff70a6] text-black border-2 border-black shadow-neo-xs',
    },
    {
      step: '3',
      title: 'Roadmap',
      description: 'Generate prerequisite-ordered topological schedules fitting your exact weekly hours.',
      icon: MapPin,
      color: 'bg-[#b892ff] text-black border-2 border-black shadow-neo-xs',
    },
    {
      step: '4',
      title: 'Learn',
      description: 'Execute high-impact activities filtered precisely to your skill level band.',
      icon: BookOpen,
      color: 'bg-[#79e7a8] text-black border-2 border-black shadow-neo-xs',
    },
    {
      step: '5',
      title: 'Track',
      description: 'Log progress, observe readiness growth, and celebrate unlocked milestones.',
      icon: CheckCircle2,
      color: 'bg-[#70d6ff] text-black border-2 border-black shadow-neo-xs',
    },
    {
      step: '6',
      title: 'Replan',
      description: 'Adapt instantly to completion, skill mastery, and real-time market updates.',
      icon: RefreshCw,
      color: 'bg-[#ff9770] text-black border-2 border-black shadow-neo-xs',
    },
  ];

  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#ffe566] border-2 border-black text-black text-xs font-black mb-6 shadow-neo-sm rotate-[-1deg]">
          <Sparkles className="w-4 h-4 text-black" />
          <span>SPEC §10 DETERMINISTIC CAREER ENGINE</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-black tracking-tight leading-[1.15] mb-6">
          Navigate Your Tech Career with{' '}
          <span className="bg-[#ffe566] text-black px-3 py-1 rounded-xl border-2 border-black shadow-neo inline-block mt-2 sm:mt-0 rotate-[1deg]">
            Deterministic Precision
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-700 font-medium leading-relaxed mb-10 max-w-2xl mx-auto">
          No vague advice. CareerTwin calculates exact skill gaps, builds dependency-aware roadmaps, and dynamically replans your path as you learn.
        </p>

        {/* Primary CTA - Only one CTA */}
        <div className="flex justify-center items-center">
          <Link to="/profile" className="inline-block">
            <Button size="lg" className="text-lg py-4 px-8" rightIcon={<ArrowRight className="w-6 h-6 ml-2" />}>
              Analyze My Career
            </Button>
          </Link>
        </div>
      </div>

      {/* Product Loop Representation */}
      <div className="mt-12 bg-white border-2 border-black rounded-3xl p-8 sm:p-10 shadow-neo-lg">
        <div className="text-center mb-10">
          <div className="inline-block bg-black text-white px-3 py-1 rounded-lg text-xs uppercase tracking-widest font-black mb-3">
            The Continuous Product Loop
          </div>
          <p className="text-base text-black font-extrabold flex items-center justify-center flex-wrap gap-2">
            <span className="bg-[#ffe566] px-2.5 py-0.5 rounded-md border border-black shadow-neo-xs">Profile</span>
            <span>&rarr;</span>
            <span className="bg-[#ff70a6] px-2.5 py-0.5 rounded-md border border-black shadow-neo-xs">Gaps</span>
            <span>&rarr;</span>
            <span className="bg-[#b892ff] px-2.5 py-0.5 rounded-md border border-black shadow-neo-xs">Roadmap</span>
            <span>&rarr;</span>
            <span className="bg-[#79e7a8] px-2.5 py-0.5 rounded-md border border-black shadow-neo-xs">Learn</span>
            <span>&rarr;</span>
            <span className="bg-[#70d6ff] px-2.5 py-0.5 rounded-md border border-black shadow-neo-xs">Track</span>
            <span>&rarr;</span>
            <span className="bg-[#ff9770] px-2.5 py-0.5 rounded-md border border-black shadow-neo-xs">Replan</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loopSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative p-6 bg-[#faf6ee] border-2 border-black rounded-2xl shadow-neo hover:shadow-neo-lg hover:-translate-y-1 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3.5 rounded-xl ${step.color} flex-shrink-0`}>
                    <Icon className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-black text-black bg-white px-1.5 py-0.5 rounded border border-black shadow-neo-xs">0{step.step}</span>
                      <h3 className="text-lg font-black text-black">{step.title}</h3>
                    </div>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
