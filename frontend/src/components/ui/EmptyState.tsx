import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border-2 border-dashed border-black shadow-neo ${className}`}
    >
      {icon && (
        <div className="w-14 h-14 mb-3 rounded-2xl bg-[#ffe566] border-2 border-black flex items-center justify-center text-black shadow-neo-sm">
          {icon}
        </div>
      )}
      <h3 className="text-base font-black text-black">{title}</h3>
      {description && (
        <p className="text-xs text-slate-700 font-medium max-w-md mt-1 mb-5">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};
