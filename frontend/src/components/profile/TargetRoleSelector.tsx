import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';
import { createCustomRole } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { RoleSummary } from '../../types/api';
import {
  Briefcase,
  CheckCircle2,
  PlusCircle,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';

export interface TargetRoleSelectorProps {
  roles: RoleSummary[];
  selectedRoleId: string | null;
  onSelectRole: (roleId: string) => void;
  onCustomRoleCreated: (newRole: RoleSummary) => void;
  isLoadingRoles: boolean;
  disabled?: boolean;
}

export const TargetRoleSelector: React.FC<TargetRoleSelectorProps> = ({
  roles,
  selectedRoleId,
  onSelectRole,
  onCustomRoleCreated,
  isLoadingRoles,
  disabled = false,
}) => {
  const { showToast } = useToast();
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [isNotImplemented, setIsNotImplemented] = useState(false);
  const [customErrors, setCustomErrors] = useState<{ title?: string; description?: string }>({});

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const errs: { title?: string; description?: string } = {};
    if (!customTitle.trim()) {
      errs.title = 'Title is required';
    }
    if (!customDescription.trim()) {
      errs.description = 'Description is required';
    }
    if (Object.keys(errs).length > 0) {
      setCustomErrors(errs);
      return;
    }
    setCustomErrors({});

    setIsSubmittingCustom(true);
    try {
      const res = await createCustomRole({
        title: customTitle.trim(),
        description: customDescription.trim(),
      });

      // Role created successfully
      const createdRole: RoleSummary = {
        role_id: res.role.role_id,
        title: res.role.title,
        version: res.role.version,
        description: res.role.description,
        skill_count: res.role.skill_count,
        top_skills: res.role.top_skills,
        is_custom: true,
        market_update_available: false,
      };

      onCustomRoleCreated(createdRole);
      onSelectRole(createdRole.role_id);
      setIsCustomOpen(false);
      setCustomTitle('');
      setCustomDescription('');
      showToast({
        type: 'success',
        title: 'Role Created',
        message: `Custom role "${createdRole.title}" created and selected.`,
      });
    } catch (err: unknown) {
      // Check for NOT_IMPLEMENTED (501 / NOT_IMPLEMENTED)
      const isNotImpl =
        (err instanceof ApiError && (err.code === 'NOT_IMPLEMENTED' || err.status === 501)) ||
        (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'NOT_IMPLEMENTED');

      if (isNotImpl) {
        // Hide the custom role panel gracefully without breaking the rest of the profile page
        setIsNotImplemented(true);
        setIsCustomOpen(false);
        showToast({
          type: 'info',
          title: 'Custom Roles Unavailable',
          message: 'Custom role definition is not supported in this environment.',
        });
      } else {
        const message = err instanceof ApiError ? err.message : 'Failed to create custom role.';
        showToast({
          type: 'error',
          title: 'Role Creation Failed',
          message,
        });
      }
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  return (
    <Card className="border-2 border-black bg-white rounded-2xl shadow-neo">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-[#ffe566] text-black border-2 border-black flex items-center justify-center text-xs font-black shadow-neo-xs">
              4
            </span>
            <CardTitle className="text-lg font-black text-black">Target Role</CardTitle>
          </div>
          {/* Define Custom Role Trigger (hidden if NOT_IMPLEMENTED) */}
          {!isNotImplemented && (
            <button
              type="button"
              onClick={() => setIsCustomOpen(!isCustomOpen)}
              disabled={disabled || isLoadingRoles}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border-2 border-black text-xs font-black text-black hover:bg-[#ffe566] transition-all shadow-neo-xs active:translate-x-0.5 active:translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4 text-black stroke-[2.5]" />
              Define Custom Role
            </button>
          )}
        </div>
        <CardDescription className="text-xs font-medium text-slate-700">
          Select exactly one target role to benchmark your skills and generate your personalized roadmap.
        </CardDescription>
      </CardHeader>

      <div className="p-6 space-y-6">
        {/* Define Custom Role Form Panel */}
        {!isNotImplemented && isCustomOpen && (
          <form
            onSubmit={handleCreateCustomRole}
            className="p-5 rounded-2xl border-2 border-black bg-[#ff70a6]/10 shadow-neo space-y-4 transition-all"
          >
            <div className="flex justify-between items-center pb-2 border-b-2 border-black">
              <h4 className="text-sm font-black text-black flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-black stroke-[2.5]" />
                Define Custom Target Role
              </h4>
              <button
                type="button"
                onClick={() => setIsCustomOpen(false)}
                className="text-black hover:scale-125 p-1 rounded transition-transform"
                aria-label="Close custom role panel"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            <div>
              <label htmlFor="custom-role-title" className="block text-xs font-black text-black mb-1">
                Role Title <span className="text-red-500">*</span>
              </label>
              <input
                id="custom-role-title"
                type="text"
                placeholder="e.g. AI Systems Architect"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                disabled={isSubmittingCustom}
                className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border-2 border-black bg-white font-semibold focus:outline-none focus:shadow-neo ${
                  customErrors.title ? 'bg-[#ff6b6b]/10' : 'bg-white'
                }`}
              />
              {customErrors.title && (
                <p className="text-xs text-red-600 mt-1 font-bold">{customErrors.title}</p>
              )}
            </div>

            <div>
              <label htmlFor="custom-role-desc" className="block text-xs font-black text-black mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="custom-role-desc"
                rows={3}
                placeholder="Describe key responsibilities and expectations for this target role..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                disabled={isSubmittingCustom}
                className={`w-full p-3.5 text-xs sm:text-sm rounded-xl border-2 border-black bg-white font-semibold focus:outline-none focus:shadow-neo ${
                  customErrors.description ? 'bg-[#ff6b6b]/10' : 'bg-white'
                }`}
              />
              {customErrors.description && (
                <p className="text-xs text-red-600 mt-1 font-bold">{customErrors.description}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCustomOpen(false)}
                disabled={isSubmittingCustom}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmittingCustom}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Create &amp; Select Role
              </Button>
            </div>
          </form>
        )}

        {/* Roles List */}
        {isLoadingRoles ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton height="130px" className="rounded-2xl" />
            <Skeleton height="130px" className="rounded-2xl" />
            <Skeleton height="130px" className="rounded-2xl" />
            <Skeleton height="130px" className="rounded-2xl" />
          </div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-center bg-[#faf6ee] border-2 border-black rounded-2xl shadow-neo-xs">
            <Briefcase className="w-8 h-8 text-black mx-auto mb-2" />
            <p className="text-sm font-bold text-black">No roles available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((role) => {
              const isSelected = selectedRoleId === role.role_id;

              return (
                <div
                  key={role.role_id}
                  onClick={() => !disabled && onSelectRole(role.role_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!disabled) onSelectRole(role.role_id);
                    }
                  }}
                  className={`relative p-5 rounded-2xl border-2 border-black text-left cursor-pointer transition-all duration-200 focus:outline-none ${
                    isSelected
                      ? 'bg-[#ffe566] shadow-neo scale-[1.01]'
                      : 'bg-white shadow-neo-xs hover:shadow-neo hover:-translate-y-0.5'
                  }`}
                >
                  {/* Selected Indicator */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-black tracking-tight">
                        {role.title}
                      </h4>
                      <span className="text-[10px] text-black font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-black shadow-neo-xs">
                        v{role.version}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {role.is_custom && (
                        <Badge variant="primary" size="sm">
                          custom
                        </Badge>
                      )}
                      {role.market_update_available && (
                        <Badge variant="high" size="sm" className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          market update
                        </Badge>
                      )}
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 border-black transition-colors ${
                          isSelected
                            ? 'bg-black text-[#ffe566] shadow-neo-xs'
                            : 'border-black bg-white'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-800 font-medium mb-3 line-clamp-2 leading-relaxed">
                    {role.description}
                  </p>

                  {/* Top Skills */}
                  <div>
                    <div className="text-[11px] font-black text-black mb-1.5 flex items-center gap-1">
                      <span>Top Required Skills ({role.skill_count} total):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {role.top_skills.slice(0, 5).map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-white text-black border border-black shadow-neo-xs"
                        >
                          {skill.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
