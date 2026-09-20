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
      className={`p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>

        {change !== undefined && (
          <span
            className={`inline-flex items-center text-xs font-semibold ${
              change > 0
                ? 'text-emerald-600'
                : change < 0
                ? 'text-red-600'
                : 'text-slate-500'
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
            {changeLabel && <span className="ml-1 text-[11px] font-normal text-slate-500">{changeLabel}</span>}
          </span>
        )}
      </div>

      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  );
};
