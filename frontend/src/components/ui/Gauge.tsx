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
  strokeWidth = 14,
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
    const duration = 1000;
    const startTime = performance.now();
    let frameId: number;

    const animateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrentValue(value * ease);
      if (progress < 1) {
        frameId = requestAnimationFrame(animateCount);
      }
    };

    frameId = requestAnimationFrame(animateCount);
    return () => cancelAnimationFrame(frameId);
  }, [value, animate]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(Math.max(currentValue, 0), 100);
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  // Determine color based on readiness percentage
  const getColor = (val: number) => {
    if (val >= 75) return '#79e7a8'; // Neo Green
    if (val >= 50) return '#ffe566'; // Neo Yellow
    if (val >= 30) return '#ff9770'; // Neo Orange
    return '#ff6b6b'; // Neo Red
  };

  const strokeColor = getColor(value);

  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <div
        className="relative flex items-center justify-center p-3 bg-white border-2 border-black rounded-3xl shadow-neo"
        style={{ width: size + 24, height: size + 24 }}
      >
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
          {/* Outer Black Border for Gauge Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#121212"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference}`}
            strokeDashoffset="0"
            fill="transparent"
            opacity="0.1"
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
        <div className="absolute flex flex-col items-center justify-center text-center bg-[#faf6ee] border-2 border-black px-3 py-1.5 rounded-xl shadow-neo-sm">
          <span className="text-2xl font-black tracking-tight text-black font-mono">
            {Math.round(currentValue)}%
          </span>
          {label && (
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider mt-0.5">
              {label}
            </span>
          )}
        </div>
      </div>
      {subtext && (
        <span className="text-xs text-slate-700 mt-2 font-bold text-center">{subtext}</span>
      )}
    </div>
  );
};
