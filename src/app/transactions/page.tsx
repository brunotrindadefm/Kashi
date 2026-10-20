'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { formatCurrency, getTodayIsoDate } from '@/lib/formatters';
import { TransactionCard } from '@/components/TransactionCard';
import { DeleteTransactionModal } from '@/components/DeleteTransactionModal';
import { StatementImportModal } from '@/components/StatementImportModal';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@/types/finance';

type SegmentTab = 'completed' | 'upcoming' | 'new';
type CompletedQuickFilter = 'all' | 'pending' | 'bank';

function TransactionsContent() {
  const searchParams = useSearchParams();
  const {
    profile,
    categories,
    transactions,
    banks,
    pendingBankCount,
    addTransaction,
    updateTransactionCategory,
    confirmTransactionCategory,
    settleUpcomingTransaction,
    deleteTransaction,
    syncConnectedBanks,
    predictCategory,
  } = useFinance();

  const [activeSegment, setActiveSegment] = useState<SegmentTab>('completed');
  const [quickFilter, setQuickFilter] = useState<CompletedQuickFilter>('all');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // "+ Lançar" Form State
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [userManuallyPickedCategory, setUserManuallyPickedCategory] =
    useState(false);
  const [autoSuggestedInfo, setAutoSuggestedInfo] = useState<string | null>(
    null
  );
  const [momentStatus, setMomentStatus] =
    useState<TransactionStatus>('completed');
  const [date, setDate] = useState<string>(getTodayIsoDate());
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  // Read URL query params (?filter=pending or ?tab=new)
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    const tabParam = searchParams.get('tab');

    if (filterParam === 'pending') {
      setActiveSegment('completed');
      setQuickFilter('pending');
    } else if (tabParam === 'new') {
      setActiveSegment('new');
    } else if (tabParam === 'upcoming') {
      setActiveSegment('upcoming');
    }
  }, [searchParams]);

  const compatibleFormCategories = useMemo(() => {
    const filtered = categories.filter(
      (c) => c.type === txType || c.type === 'both'
    );
    return filtered.length > 0 ? filtered : categories;
  }, [categories, txType]);

  // Keep categoryId valid when txType or categories change
  useEffect(() => {
    if (
      !categoryId ||
      !compatibleFormCategories.some((c) => c.id === categoryId)
    ) {
      setCategoryId(compatibleFormCategories[0]?.id ?? '');
    }
  }, [compatibleFormCategories, categoryId]);

  // Real-time auto-suggestion as user types description
  useEffect(() => {
    if (!profile.autoClassify || userManuallyPickedCategory) return;
    const trimmed = description.trim();
    if (trimmed.length < 2) {
      setAutoSuggestedInfo(null);
      return;
    }

    const match = predictCategory(trimmed, txType);
    if (match.categoryId && match.reason !== 'fallback') {
      setCategoryId(match.categoryId);
      setAutoSuggestedInfo(
        match.reason === 'memory'
          ? `Memória inteligente: ${match.categoryName}`
          : `Auto-sugerido: ${match.categoryName}`
      );
    } else {
      setAutoSuggestedInfo(null);
    }
  }, [
    description,
    txType,
    profile.autoClassify,
    userManuallyPickedCategory,
    predictCategory,
  ]);

  const connectedBanks = useMemo(
    () => banks.filter((b) => b.connected),
    [banks]
  );

  const completedTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (t.status !== 'completed') return false;
        if (quickFilter === 'pending') return t.pendingCategoryConfirmation;
        if (quickFilter === 'bank')
          return t.source === 'bank' || t.source === 'import';
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, quickFilter]);

  const upcomingTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.status === 'upcoming')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  const upcomingSummary = useMemo(() => {
    const totalExpenses = upcomingTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalIncomes = upcomingTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    return { totalExpenses, totalIncomes };
  }, [upcomingTransactions]);

  const handleSyncBanks = () => {
    setIsSyncing(true);
    setTimeout(() => {
      syncConnectedBanks();
      setIsSyncing(false);
    }, 350);
  };

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amountStr.replace(',', '.'));
    if (!description.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      return;
    }

    addTransaction({
      description: description.trim(),
      amount: numericAmount,
      type: txType,
      status: momentStatus,
      categoryId: categoryId || compatibleFormCategories[0]?.id || '',
      date: date || getTodayIsoDate(),
      bankId: selectedBankId || undefined,
    });

    // Reset form and switch to the target list tab
    setDescription('');
    setAmountStr('');
    setUserManuallyPickedCategory(false);
    setAutoSuggestedInfo(null);
    setActiveSegment(momentStatus);
  };

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
            Receitas & Gastos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Extrato Open Finance, previsões e novos lançamentos
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsImportModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-soft transition-colors shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>CSV / OFX</span>
        </button>
      </div>

      {/* Open Finance Strip */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Building2 className="w-3.5 h-3.5" />
                Open Finance Brasil
              </span>
              <Link
                href="/banks"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Gerenciar bancos
              </Link>
            </div>

            {connectedBanks.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                Nenhuma instituição conectada.{' '}
                <Link
                  href="/banks"
                  className="font-bold text-emerald-600 dark:text-emerald-400 underline"
                >
                  Conectar Nubank, Itaú, Inter ou Bradesco
                </Link>
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {connectedBanks.map((bank) => (
                  <span
                    key={bank.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white shadow-sm"
                    style={{ backgroundColor: bank.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    {bank.institutionName}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSyncBanks}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all shrink-0 w-full sm:w-auto"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
            />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Banco'}
          </button>
        </div>
      </section>

      {/* 3 Sub-tabs (Segments): 1. Últimas | 2. Seguintes | 3. + Lançar */}
      <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveSegment('completed')}
          className={`relative py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSegment === 'completed'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <span>Últimas</span>
          {pendingBankCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-extrabold">
              {pendingBankCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSegment('upcoming')}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSegment === 'upcoming'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <span>Seguintes</span>
          {upcomingTransactions.length > 0 && (
            <span className="text-[10px] text-slate-400 font-semibold">
              ({upcomingTransactions.length})
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSegment('new')}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeSegment === 'new'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Lançar</span>
        </button>
      </div>

      {/* SEGMENT 1: Últimas (Realizadas) */}
      {activeSegment === 'completed' && (
        <section className="space-y-4">
          {/* Quick Filters: Todas | Pendentes de Classificação | Vindas do Banco */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setQuickFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                quickFilter === 'all'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Todas
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('pending')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                quickFilter === 'pending'
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Pendentes de Classificação ({pendingBankCount})
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('bank')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                quickFilter === 'bank'
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Vindas do Banco
            </button>
          </div>

          {completedTransactions.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {quickFilter === 'pending'
                  ? 'Tudo em dia! Nenhuma transação pendente de classificação.'
                  : 'Nenhuma transação realizada encontrada neste filtro.'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Conecte um banco e clique em &ldquo;Sincronizar Banco&rdquo; ou adicione um
                novo lançamento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedTransactions.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  categories={categories}
                  onCategoryChange={updateTransactionCategory}
                  onConfirmSuggestion={confirmTransactionCategory}
                  onRequestDelete={setTxToDelete}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* SEGMENT 2: Seguintes (Futuras / Agendadas) */}
      {activeSegment === 'upcoming' && (
        <section className="space-y-4">
          {/* Total Previsto Summary Card */}
          <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-900 dark:to-slate-800/90 text-white p-4 sm:p-5 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-300 font-medium">
                  Total Previsto em Gastos Seguintes
                </p>
                <p className="text-xl font-extrabold text-white">
                  {formatCurrency(upcomingSummary.totalExpenses)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMomentStatus('upcoming');
                setActiveSegment('new');
              }}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agendar Conta
            </button>
          </div>

          {upcomingTransactions.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 text-center space-y-2">
              <CalendarClock className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Nenhum lançamento futuro agendado
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sincronize seu banco para importar faturas/assinaturas futuras ou
                cadastre na aba &ldquo;+ Lançar&rdquo;.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTransactions.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  categories={categories}
                  onCategoryChange={updateTransactionCategory}
                  onSettleUpcoming={settleUpcomingTransaction}
                  onRequestDelete={setTxToDelete}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* SEGMENT 3: + Lançar (Nova Receita ou Despesa) */}
      {activeSegment === 'new' && (
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-soft">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Novo Lançamento Financeiro
          </h2>

          <form onSubmit={handleCreateTransaction} className="space-y-4">
            {/* Alternador Despesa / Receita */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTxType('expense');
                  setUserManuallyPickedCategory(false);
                }}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                  txType === 'expense'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxType('income');
                  setUserManuallyPickedCategory(false);
                }}
                className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                  txType === 'income'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Receita
              </button>
            </div>

            {/* Descrição com Auto-Sugestão Inteligente */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="tx-description"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Descrição (Ex: iFood, Uber, PIX, Salário)
                </label>
                {autoSuggestedInfo && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="w-3 h-3" />
                    {autoSuggestedInfo}
                  </span>
                )}
              </div>
              <input
                id="tx-description"
                type="text"
                required
                placeholder="Ex: iFood Hamburgueria, Uber Viagem, Netflix..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Valor (R$) & Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="tx-amount"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Valor (R$)
                </label>
                <input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="tx-category"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Categoria
                </label>
                <select
                  id="tx-category"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setUserManuallyPickedCategory(true);
                    setAutoSuggestedInfo(null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {compatibleFormCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Momento: Já Realizada vs Seguinte/Futura */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Momento do Lançamento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMomentStatus('completed')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    momentStatus === 'completed'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Já Realizada (Últimas)
                </button>
                <button
                  type="button"
                  onClick={() => setMomentStatus('upcoming')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    momentStatus === 'upcoming'
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Seguinte / Futura
                </button>
              </div>
            </div>

            {/* Data & Conta/Banco */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="tx-date"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Data
                </label>
                <input
                  id="tx-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label
                  htmlFor="tx-bank"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Conta / Banco
                </label>
                <select
                  id="tx-bank"
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Carteira Manual / Sem banco</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.institutionName}
                      {b.connected ? ' (Conectado)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-glow transition-all"
            >
              Salvar Lançamento
            </button>
          </form>
        </section>
      )}

      <DeleteTransactionModal
        transaction={txToDelete}
        onCancel={() => setTxToDelete(null)}
        onConfirm={(id) => {
          deleteTransaction(id);
          setTxToDelete(null);
        }}
      />

      <StatementImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs text-slate-400">
          Carregando transações...
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}
