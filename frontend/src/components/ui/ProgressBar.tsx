import React from 'react';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: 'primary' | 'emerald' | 'amber' | 'blue' | 'violet';
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showValue = false,
  color = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const heightStyles = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const colorStyles = {
    primary: 'bg-primary-600',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-600',
    violet: 'bg-violet-600',
  };

  return (
    <div className={`w-full ${className}`} {...props}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs font-medium text-slate-700 mb-1.5">
          {label && <span>{label}</span>}
          {showValue && <span>{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${heightStyles[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorStyles[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
