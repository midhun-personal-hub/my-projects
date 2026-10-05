import React from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let icon = <Info className="w-5 h-5 text-blue-500 shrink-0" />;
        let borderClass = 'border-blue-200 dark:border-blue-900 bg-blue-50/90 dark:bg-blue-950/90 text-blue-900 dark:text-blue-100';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
          borderClass = 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/90 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
          borderClass = 'border-amber-200 dark:border-amber-900 bg-amber-50/90 dark:bg-amber-950/90 text-amber-900 dark:text-amber-100';
        } else if (toast.type === 'error') {
          icon = <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
          borderClass = 'border-red-200 dark:border-red-900 bg-red-50/90 dark:bg-red-950/90 text-red-900 dark:text-red-100';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-200 animate-slide-left ${borderClass}`}
          >
            <div className="pt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold leading-none mb-1">{toast.title}</h4>
              <p className="text-xs opacity-90 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
