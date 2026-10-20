'use client';

import React from 'react';
import {
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Category, Transaction } from '@/types/finance';
import { formatCurrency, formatShortDate } from '@/lib/formatters';
import { CategoryIcon } from '@/components/CategoryIcon';

interface TransactionCardProps {
  transaction: Transaction;
  categories: Category[];
  onCategoryChange: (transactionId: string, categoryId: string) => void;
  onConfirmSuggestion?: (transactionId: string) => void;
  onSettleUpcoming?: (transactionId: string) => void;
  onRequestDelete: (transaction: Transaction) => void;
}

export function TransactionCard({
  transaction,
  categories,
  onCategoryChange,
  onConfirmSuggestion,
  onSettleUpcoming,
  onRequestDelete,
}: TransactionCardProps) {
  const currentCategory =
    categories.find((c) => c.id === transaction.categoryId) ?? categories[0];

  const compatibleCategories = categories.filter(
    (c) => c.type === transaction.type || c.type === 'both'
  );
  const selectableCategories =
    compatibleCategories.length > 0 ? compatibleCategories : categories;

  const isIncome = transaction.type === 'income';
  const isUpcoming = transaction.status === 'upcoming';
  const isPending = transaction.pendingCategoryConfirmation;

  return (
    <div
      className={`group relative rounded-2xl border transition-all overflow-hidden ${
        isPending
          ? 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-300/80 dark:border-amber-700/60 shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-soft'
      }`}
    >
      {/* Top Section: Icon, Description, Meta, Amount & Discreet Top-Right Trash Button */}
      <div className="p-3.5 sm:p-4 flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{
              backgroundColor: `${currentCategory?.color ?? '#10b981'}18`,
              color: currentCategory?.color ?? '#10b981',
            }}
          >
            <CategoryIcon
              name={currentCategory?.icon ?? 'Tag'}
              className="w-5 h-5"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug break-words pr-1">
              {transaction.description}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>{formatShortDate(transaction.date)}</span>
              {transaction.bankName && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                    <Building2 className="w-3 h-3" />
                    {transaction.bankName}
                  </span>
                </>
              )}
              {isUpcoming && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 font-semibold text-[10px]">
                  <CalendarClock className="w-3 h-3" />
                  Seguinte
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Amount & Top-Right Discreet Delete Button */}
        <div className="flex items-start gap-1.5 shrink-0">
          <div className="text-right">
            <p
              className={`text-sm sm:text-base font-bold whitespace-nowrap ${
                isIncome
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {isIncome ? '+ ' : '- '}
              {formatCurrency(transaction.amount)}
            </p>
            {isUpcoming && onSettleUpcoming && (
              <button
                type="button"
                onClick={() => onSettleUpcoming(transaction.id)}
                className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Efetivar
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onRequestDelete(transaction)}
            title="Excluir transação"
            aria-label={`Excluir ${transaction.description}`}
            className="p-1.5 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Optional Smart Suggestion Bar for Pending Bank Transactions */}
      {isPending && (
        <div className="px-3.5 py-2 bg-amber-100/70 dark:bg-amber-950/40 border-t border-amber-200/70 dark:border-amber-800/50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-900 dark:text-amber-200 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate">
              Sugestão do banco:{' '}
              <strong className="font-bold">
                {currentCategory?.name ?? 'Categoria'}
              </strong>
            </span>
          </div>
          {onConfirmSuggestion && (
            <button
              type="button"
              onClick={() => onConfirmSuggestion(transaction.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              Confirmar
            </button>
          )}
        </div>
      )}

      {/* Clean Bottom Category Selector Strip (Zero text label clutter before select) */}
      <div
        className="relative flex items-center border-t border-slate-100 dark:border-slate-800/80 px-3.5 py-2 transition-colors"
        style={{
          backgroundColor: `${currentCategory?.color ?? '#10b981'}0d`,
        }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 mr-2"
          style={{ backgroundColor: currentCategory?.color ?? '#10b981' }}
        />
        <CategoryIcon
          name={currentCategory?.icon ?? 'Tag'}
          className="w-3.5 h-3.5 shrink-0 mr-2"
          style={{ color: currentCategory?.color ?? '#10b981' }}
        />
        <select
          aria-label={`Categoria de ${transaction.description}`}
          value={currentCategory?.id ?? ''}
          onChange={(e) => onCategoryChange(transaction.id, e.target.value)}
          className="w-full appearance-none bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 pr-6 py-0.5 focus:outline-none cursor-pointer"
        >
          {selectableCategories.map((cat) => (
            <option
              key={cat.id}
              value={cat.id}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              {cat.name}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-3.5" />
      </div>
    </div>
  );
}
