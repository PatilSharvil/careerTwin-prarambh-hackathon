import React from 'react';
import type { PriorityLabel, SkillStatus } from '../../types/api';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'locked'
  | 'available'
  | 'in_progress'
  | 'done'
  | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  priority?: PriorityLabel;
  status?: SkillStatus;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  priority,
  status,
  size = 'md',
  className = '',
  ...props
}) => {
  // Resolve variant if priority or status is explicitly passed
  let resolvedVariant = variant;
  if (priority) {
    resolvedVariant = priority.toLowerCase() as BadgeVariant;
  } else if (status) {
    resolvedVariant = status as BadgeVariant;
  }

  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-primary-50 text-primary-700 border-primary-200',
    // Priority tokens
    critical: 'bg-red-50 text-red-700 border-red-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
    // Status tokens
    locked: 'bg-slate-100 text-slate-500 border-slate-200',
    available: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-violet-50 text-violet-700 border-violet-200',
    done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    outline: 'bg-transparent text-slate-700 border-slate-300',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${sizeStyles[size]} ${variantStyles[resolvedVariant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
