import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { ProfileSkill } from '../../types/api';
import {
  AlertTriangle,
  X,
  Sliders,
  HelpCircle,
  Quote,
  Layers,
} from 'lucide-react';

export interface ExtractedSkillsReviewProps {
  skills: ProfileSkill[];
  unmappedSkills: string[];
  skillOverrides: Record<string, number>;
  onOverrideSkill: (skillId: string, level: number) => void;
  disabled?: boolean;
}

export const ExtractedSkillsReview: React.FC<ExtractedSkillsReviewProps> = ({
  skills,
  unmappedSkills,
  skillOverrides,
  onOverrideSkill,
  disabled = false,
}) => {
  const [unmappedDismissed, setUnmappedDismissed] = useState(false);

  const overrideCount = Object.keys(skillOverrides).length;

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">
              3
            </span>
            <CardTitle>Review Extracted Skills</CardTitle>
          </div>
          {overrideCount > 0 && (
            <Badge variant="primary" size="sm">
              {overrideCount} level override{overrideCount > 1 ? 's' : ''} applied
            </Badge>
          )}
        </div>
        <CardDescription>
          Inspect evidence-backed calibrations from your profile. Adjust sliders to set manual overrides if needed.
        </CardDescription>
      </CardHeader>

      <div className="p-6 space-y-6">
        {/* Unmapped Skills Warning Banner (Dismissible) */}
        {!unmappedDismissed && unmappedSkills.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 transition-all">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Unmapped Skills Detected
              </h4>
              <p className="text-xs text-amber-800 mt-1">
                The following skills could not be mapped to the canonical skill catalog and are not factored into gap math:
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {unmappedSkills.map((skillName) => (
                  <span
                    key={skillName}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-amber-300 text-amber-800"
                  >
                    {skillName}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUnmappedDismissed(true)}
              className="text-amber-500 hover:text-amber-800 p-1 rounded transition-colors"
              aria-label="Dismiss unmapped skills warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Skills Cards Grid */}
        {skills.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-600">No skills extracted yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Complete Step 2 above and click &quot;Extract Skills&quot; to review proficiencies.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skills.map((skill) => {
              const isOverridden = skillOverrides[skill.skill_id] !== undefined;
              const currentLevel = isOverridden
                ? skillOverrides[skill.skill_id]
                : skill.level;

              // Check if unverified flag is present or evidence differs from self
              const isUnverified =
                skill.flag === 'unverified' ||
                (skill.self !== null && skill.evidence !== null && skill.self !== skill.evidence);

              return (
                <div
                  key={skill.skill_id}
                  className={`p-4 rounded-xl border transition-all ${
                    isOverridden
                      ? 'bg-primary-50/30 border-primary-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Card Header: Skill Name + Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {skill.skill_name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        {/* Source Badge */}
                        <Badge
                          variant={isOverridden ? 'primary' : 'default'}
                          size="sm"
                          className="capitalize"
                        >
                          {isOverridden ? 'override' : skill.source}
                        </Badge>

                        {/* Self / Evidence Summary if available */}
                        {skill.evidence !== null && (
                          <span className="text-[10px] text-slate-500">
                            evidence: {skill.evidence}/10
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Unverified Badge with accessible tooltip */}
                    {isUnverified && (
                      <div className="relative group flex items-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 cursor-help">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          unverified
                        </span>
                        {/* Tooltip */}
                        <div
                          role="tooltip"
                          className="absolute right-0 top-full mt-1.5 hidden group-hover:block group-focus-within:block z-30 w-52 p-2.5 text-[11px] leading-snug text-slate-700 bg-white border border-slate-200 rounded-lg shadow-lg pointer-events-none transition-opacity"
                        >
                          <div className="font-semibold text-slate-900 mb-0.5 flex items-center gap-1">
                            <HelpCircle className="w-3 h-3 text-amber-600" />
                            Unverified Skill
                          </div>
                          Represents a difference between self-rating ({skill.self ?? 'N/A'}/10) and resume evidence ({skill.evidence ?? 'none'}).
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Level Slider */}
                  <div className="space-y-1.5 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <label
                        htmlFor={`skill-slider-${skill.skill_id}`}
                        className="font-medium text-slate-700 flex items-center gap-1"
                      >
                        <Sliders className="w-3 h-3 text-slate-400" />
                        Proficiency Level:
                      </label>
                      <span className="font-bold text-slate-900">
                        {currentLevel.toFixed(1)} / 10
                        {isOverridden && (
                          <span className="text-[10px] text-primary-600 font-normal ml-1">
                            (override)
                          </span>
                        )}
                      </span>
                    </div>
                    <input
                      id={`skill-slider-${skill.skill_id}`}
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={currentLevel}
                      onChange={(e) =>
                        onOverrideSkill(skill.skill_id, parseFloat(e.target.value))
                      }
                      disabled={disabled}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0.0 (None)</span>
                      <span>5.0 (Mid)</span>
                      <span>10.0 (Expert)</span>
                    </div>
                  </div>

                  {/* Evidence Snippet */}
                  {skill.snippet ? (
                    <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded border border-slate-100 italic flex items-start gap-1.5">
                      <Quote className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5 rotate-180" />
                      <span>{skill.snippet}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      No resume quote snippet available. Level derived from self-assessment.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
