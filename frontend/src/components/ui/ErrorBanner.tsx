import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

export interface ErrorBannerProps {
  message: string;
  code?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  code,
  onRetry,
  onDismiss,
  className = '',
}) => {
  return (
    <div
      className={`p-4 rounded-2xl border-2 border-black bg-[#ff6b6b] text-black flex items-start justify-between gap-3 shadow-neo ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-white border-2 border-black">
          <AlertCircle className="w-5 h-5 text-black flex-shrink-0" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black uppercase tracking-wide">Error</span>
            {code && (
              <span className="text-[10px] font-mono px-2 py-0.5 bg-white text-black font-extrabold rounded-md border-2 border-black shadow-neo-xs">
                {code}
              </span>
            )}
          </div>
          <p className="text-xs text-black font-semibold mt-1 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-xs font-bold text-black bg-white hover:bg-slate-100 border-2 border-black px-3 py-1.5 rounded-lg shadow-neo-xs transition-transform active:translate-x-0.5 active:translate-y-0.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg bg-white border-2 border-black text-black hover:bg-slate-100 transition-colors shadow-neo-xs"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
