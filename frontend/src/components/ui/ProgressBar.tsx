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
    sm: 'h-2.5',
    md: 'h-4',
    lg: 'h-6',
  };

  const colorStyles = {
    primary: 'bg-[#ffe566]',
    emerald: 'bg-[#79e7a8]',
    amber: 'bg-[#ffd166]',
    blue: 'bg-[#70d6ff]',
    violet: 'bg-[#b892ff]',
  };

  return (
    <div className={`w-full ${className}`} {...props}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs font-bold text-black mb-1.5">
          {label && <span>{label}</span>}
          {showValue && <span className="font-mono">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-white border-2 border-black rounded-full overflow-hidden shadow-neo-xs ${heightStyles[size]}`}>
        <div
          className={`h-full border-r-2 border-black transition-all duration-500 ease-out ${colorStyles[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
