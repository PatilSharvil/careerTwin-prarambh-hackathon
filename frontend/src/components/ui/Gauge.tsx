import React, { useEffect, useState } from 'react';

export interface GaugeProps {
  value: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  label?: string;
  subtext?: string;
  className?: string;
  animate?: boolean;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  size = 140,
  strokeWidth = 12,
  label = 'Readiness',
  subtext,
  className = '',
  animate = true,
}) => {
  const [currentValue, setCurrentValue] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setCurrentValue(value);
      return;
    }
    const timeout = setTimeout(() => {
      setCurrentValue(value);
    }, 100);
    return () => clearTimeout(timeout);
  }, [value, animate]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(Math.max(currentValue, 0), 100);
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  // Determine color based on readiness percentage
  const getColor = (val: number) => {
    if (val >= 75) return '#10b981'; // emerald
    if (val >= 50) return '#6366f1'; // primary indigo
    if (val >= 30) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const strokeColor = getColor(value);

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Value circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: animate ? 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.5s ease' : 'none',
            }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {Math.round(currentValue)}%
          </span>
          {label && (
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">
              {label}
            </span>
          )}
        </div>
      </div>
      {subtext && (
        <span className="text-xs text-slate-500 mt-2 font-medium text-center">{subtext}</span>
      )}
    </div>
  );
};
