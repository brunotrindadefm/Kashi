'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';

export function TopToaster() {
  const { toasts, dismissToast } = useFinance();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 z-[100] w-[calc(100%-1.5rem)] max-w-sm flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => {
        const isError = toast.variant === 'error';
        const isWarning = toast.variant === 'warning';
        const isInfo = toast.variant === 'info';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg border backdrop-blur-md transition-all duration-200 ${
              isError
                ? 'bg-red-950/95 border-red-700/80 text-white'
                : isWarning
                ? 'bg-amber-950/95 border-amber-700/80 text-white'
                : isInfo
                ? 'bg-slate-900/95 dark:bg-slate-800/95 border-slate-700 text-white'
                : 'bg-emerald-950/95 border-emerald-600/80 text-white'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isError || isWarning ? (
                <AlertCircle
                  className={`w-5 h-5 ${
                    isError ? 'text-red-400' : 'text-amber-400'
                  }`}
                />
              ) : isInfo ? (
                <Info className="w-5 h-5 text-sky-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight break-words">
                {toast.title}
              </p>
              {toast.description && (
                <p className="text-xs text-slate-300 mt-0.5 leading-snug break-words">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Fechar notificação"
              className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
