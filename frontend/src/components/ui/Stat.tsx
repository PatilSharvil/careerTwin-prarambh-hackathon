import React from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

export interface StatProps {
  label: string;
  value: string | number;
  subtext?: string;
  change?: number; // e.g. +8 or -5
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const Stat: React.FC<StatProps> = ({
  label,
  value,
  subtext,
  change,
  changeLabel,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`p-5 bg-white border-2 border-black rounded-2xl shadow-neo flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          {label}
        </span>
        {icon && <div className="text-black p-1.5 rounded-lg bg-[#ffe566] border-2 border-black shadow-neo-xs">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-black tracking-tight text-black font-mono">{value}</span>

        {change !== undefined && (
          <span
            className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-md border-2 border-black shadow-neo-xs ${
              change > 0
                ? 'bg-[#79e7a8] text-black'
                : change < 0
                ? 'bg-[#ff6b6b] text-black'
                : 'bg-slate-200 text-black'
            }`}
          >
            {change > 0 ? (
              <ArrowUp className="w-3.5 h-3.5 mr-0.5" />
            ) : change < 0 ? (
              <ArrowDown className="w-3.5 h-3.5 mr-0.5" />
            ) : (
              <Minus className="w-3.5 h-3.5 mr-0.5" />
            )}
            {change > 0 ? `+${change}` : change}
            {changeLabel && <span className="ml-1 font-normal text-black">{changeLabel}</span>}
          </span>
        )}
      </div>

      {subtext && <p className="text-xs text-slate-600 font-medium mt-1.5">{subtext}</p>}
    </div>
  );
};
