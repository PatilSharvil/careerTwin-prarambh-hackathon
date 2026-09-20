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
      className={`p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 flex items-start justify-between gap-3 shadow-sm ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Error</span>
            {code && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-red-100 text-red-700 rounded border border-red-200">
                {code}
              </span>
            )}
          </div>
          <p className="text-xs text-red-800 mt-1 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2.5 py-1 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 rounded text-red-400 hover:text-red-700 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
