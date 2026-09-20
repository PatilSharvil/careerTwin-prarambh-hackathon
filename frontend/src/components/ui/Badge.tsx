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
    default: 'bg-white text-black border-black shadow-neo-xs',
    primary: 'bg-[#ffe566] text-black border-black shadow-neo-xs',
    // Priority tokens (vivid NeoBrutalism pop)
    critical: 'bg-[#ff6b6b] text-black border-black shadow-neo-xs',
    high: 'bg-[#ff9770] text-black border-black shadow-neo-xs',
    medium: 'bg-[#ffd166] text-black border-black shadow-neo-xs',
    low: 'bg-[#e2e8f0] text-black border-black shadow-neo-xs',
    // Status tokens
    locked: 'bg-[#e2e8f0] text-slate-700 border-black shadow-neo-xs',
    available: 'bg-[#70d6ff] text-black border-black shadow-neo-xs',
    in_progress: 'bg-[#b892ff] text-black border-black shadow-neo-xs',
    done: 'bg-[#79e7a8] text-black border-black shadow-neo-xs',
    outline: 'bg-white text-black border-black shadow-neo-xs',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-extrabold border-2 rounded-md',
    md: 'text-xs px-2.5 py-1 font-extrabold border-2 rounded-lg',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 leading-none transition-all select-none ${sizeStyles[size]} ${variantStyles[resolvedVariant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
