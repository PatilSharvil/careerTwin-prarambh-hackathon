import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  toasts: ToastItem[];
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-black flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-black flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-black flex-shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 text-black flex-shrink-0" />;
    }
  };

  const getTypeStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-2 border-black bg-[#79e7a8] text-black shadow-neo-lg';
      case 'error':
        return 'border-2 border-black bg-[#ff6b6b] text-black shadow-neo-lg';
      case 'warning':
        return 'border-2 border-black bg-[#ffd166] text-black shadow-neo-lg';
      case 'info':
        return 'border-2 border-black bg-[#70d6ff] text-black shadow-neo-lg';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, toasts }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl transition-all duration-300 transform translate-y-0 ${getTypeStyles(
              toast.type
            )}`}
          >
            <div className="p-1.5 rounded-lg bg-white/80 border-2 border-black shadow-neo-xs">
              {getIcon(toast.type)}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && <h4 className="text-sm font-extrabold text-black">{toast.title}</h4>}
              <p className="text-xs mt-0.5 text-black font-semibold leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-lg bg-white border-2 border-black hover:bg-slate-100 transition-colors shadow-neo-xs"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5 text-black" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
