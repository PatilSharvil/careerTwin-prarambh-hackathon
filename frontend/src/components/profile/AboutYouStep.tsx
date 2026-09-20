import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Plus, X, GraduationCap, Briefcase, Sparkles, Clock, Calendar } from 'lucide-react';

export interface AboutYouData {
  degree: string;
  year: number | null;
  experience_years: number;
  interests: string[];
  weekly_hours: number;
  deadline_weeks: number;
}

export interface AboutYouStepProps {
  data: AboutYouData;
  onChange: (data: AboutYouData) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

export const AboutYouStep: React.FC<AboutYouStepProps> = ({
  data,
  onChange,
  errors,
  disabled = false,
}) => {
  const [interestInput, setInterestInput] = useState('');

  const handleDegreeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, degree: e.target.value });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    onChange({ ...data, year: val ? parseInt(val, 10) : null });
  };

  const handleExperienceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onChange({ ...data, experience_years: isNaN(val) ? 0 : val });
  };

  const handleWeeklyHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, weekly_hours: parseInt(e.target.value, 10) });
  };

  const handleDeadlineWeeksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, deadline_weeks: parseInt(e.target.value, 10) });
  };

  const handleAddInterest = () => {
    const trimmed = interestInput.trim();
    if (trimmed && !data.interests.includes(trimmed)) {
      onChange({ ...data, interests: [...data.interests, trimmed] });
      setInterestInput('');
    }
  };

  const handleKeyDownInterest = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddInterest();
    }
  };

  const handleRemoveInterest = (interest: string) => {
    onChange({
      ...data,
      interests: data.interests.filter((i) => i !== interest),
    });
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">
            1
          </span>
          <CardTitle>About You</CardTitle>
        </div>
        <CardDescription>
          Provide your educational background, experience, interests, and time availability.
        </CardDescription>
      </CardHeader>

      <div className="p-6 space-y-6">
        {/* Education Row */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-2">
            <GraduationCap className="w-4 h-4 text-primary-600" />
            Education
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="education-degree" className="block text-xs font-medium text-slate-600 mb-1">
                Degree / Program <span className="text-red-500">*</span>
              </label>
              <input
                id="education-degree"
                type="text"
                placeholder="e.g. B.S. in Computer Science"
                value={data.degree}
                onChange={handleDegreeChange}
                disabled={disabled}
                className={`w-full px-3.5 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                  errors.degree ? 'border-red-300 bg-red-50/50' : 'border-slate-300 bg-white'
                }`}
              />
              {errors.degree && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.degree}</p>
              )}
            </div>
            <div>
              <label htmlFor="education-year" className="block text-xs font-medium text-slate-600 mb-1">
                Graduation Year
              </label>
              <input
                id="education-year"
                type="number"
                placeholder="e.g. 2024"
                value={data.year ?? ''}
                onChange={handleYearChange}
                disabled={disabled}
                min="1970"
                max="2035"
                className={`w-full px-3.5 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                  errors.year ? 'border-red-300 bg-red-50/50' : 'border-slate-300 bg-white'
                }`}
              />
              {errors.year && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.year}</p>
              )}
            </div>
          </div>
        </div>

        {/* Experience Years */}
        <div>
          <label htmlFor="experience-years" className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-1">
            <Briefcase className="w-4 h-4 text-primary-600" />
            Years of Experience <span className="text-red-500">*</span>
          </label>
          <div className="max-w-xs">
            <input
              id="experience-years"
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={data.experience_years}
              onChange={handleExperienceChange}
              disabled={disabled}
              className={`w-full px-3.5 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
                errors.experience_years ? 'border-red-300 bg-red-50/50' : 'border-slate-300 bg-white'
              }`}
            />
            {errors.experience_years && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.experience_years}</p>
            )}
          </div>
        </div>

        {/* Interests Chip Input */}
        <div>
          <label htmlFor="interest-input" className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-1">
            <Sparkles className="w-4 h-4 text-primary-600" />
            Interests & Focus Areas
          </label>
          <p className="text-xs text-slate-500 mb-2">
            Add domains or topics you are eager to learn (e.g. LLMs, autonomous agents, backend).
          </p>
          <div className="flex gap-2 mb-3">
            <input
              id="interest-input"
              type="text"
              placeholder="Add an interest..."
              value={interestInput}
              onChange={(e) => setInterestInput(e.target.value)}
              onKeyDown={handleKeyDownInterest}
              disabled={disabled}
              className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={handleAddInterest}
              disabled={disabled || !interestInput.trim()}
              className="inline-flex items-center px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" /> Add
            </button>
          </div>
          {data.interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.interests.map((interest) => (
                <span
                  key={interest}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200 text-xs font-medium shadow-2xs"
                >
                  {interest}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(interest)}
                      className="text-primary-500 hover:text-primary-800 transition-colors"
                      aria-label={`Remove ${interest}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No interests added yet.</p>
          )}
        </div>

        {/* Sliders: Weekly Hours & Deadline Weeks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
          {/* weekly_hours: 2 - 40 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="weekly-hours-slider" className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Clock className="w-4 h-4 text-primary-600" />
                Weekly Commitment
              </label>
              <Badge variant="primary" size="sm">
                {data.weekly_hours} hrs / week
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mb-3">Hours per week you can dedicate to upskilling.</p>
            <input
              id="weekly-hours-slider"
              type="range"
              min="2"
              max="40"
              step="1"
              value={data.weekly_hours}
              onChange={handleWeeklyHoursChange}
              disabled={disabled}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-medium">
              <span>2 hrs</span>
              <span>20 hrs</span>
              <span>40 hrs</span>
            </div>
            {errors.weekly_hours && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.weekly_hours}</p>
            )}
          </div>

          {/* deadline_weeks: 4 - 52 */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="deadline-weeks-slider" className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Calendar className="w-4 h-4 text-primary-600" />
                Target Timeline
              </label>
              <Badge variant="primary" size="sm">
                {data.deadline_weeks} weeks ({Math.round((data.deadline_weeks / 4.33) * 10) / 10} mo)
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mb-3">Target duration to reach your career goal.</p>
            <input
              id="deadline-weeks-slider"
              type="range"
              min="4"
              max="52"
              step="1"
              value={data.deadline_weeks}
              onChange={handleDeadlineWeeksChange}
              disabled={disabled}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-medium">
              <span>4 weeks</span>
              <span>26 weeks</span>
              <span>52 weeks</span>
            </div>
            {errors.deadline_weeks && (
              <p className="text-xs text-red-600 mt-1 font-medium">{errors.deadline_weeks}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
