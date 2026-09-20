import React from 'react';
import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 text-center">
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl mb-4">
        CareerTwin
      </h1>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
        Personalized Career & Skill Navigator Agent. Profile → Gaps → Roadmap → Learn → Track → Replan.
      </p>
      <div>
        <Link
          to="/profile"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
};
