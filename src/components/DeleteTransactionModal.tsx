'use client';

import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { Transaction } from '@/types/finance';

interface DeleteTransactionModalProps {
  transaction: Transaction | null;
  onCancel: () => void;
  onConfirm: (transactionId: string) => void;
}

export function DeleteTransactionModal({
  transaction,
  onCancel,
  onConfirm,
}: DeleteTransactionModalProps) {
  if (!transaction) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3
              id="delete-modal-title"
              className="text-base font-bold text-slate-900 dark:text-white"
            >
              Excluir lançamento?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Esta ação não pode ser desfeita.
            </p>
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 break-words">
            {transaction.description}
          </p>
          <p
            className={`text-base font-bold mt-1 ${
              transaction.type === 'income'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {transaction.type === 'income' ? '+ ' : '- '}
            {formatCurrency(transaction.amount)}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 px-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(transaction.id)}
            className="w-full py-2.5 px-3 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Sim, Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
