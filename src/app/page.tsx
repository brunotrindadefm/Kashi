'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  PieChart as PieChartIcon,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinance } from '@/context/FinanceContext';
import { formatCurrency } from '@/lib/formatters';
import { CategoryIcon } from '@/components/CategoryIcon';
import { TransactionCard } from '@/components/TransactionCard';
import { DeleteTransactionModal } from '@/components/DeleteTransactionModal';
import { Transaction } from '@/types/finance';

export default function HomePage() {
  const {
    profile,
    categories,
    transactions,
    banks,
    pendingBankCount,
    updateTransactionCategory,
    confirmTransactionCategory,
    settleUpcomingTransaction,
    deleteTransaction,
  } = useFinance();

  const [homeTxTab, setHomeTxTab] = useState<'completed' | 'upcoming'>('completed');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  const connectedBanksCount = useMemo(
    () => banks.filter((b) => b.connected).length,
    [banks]
  );

  // Current month metrics (or all recent completed if current month has transactions)
  const {
    completedIncomes,
    completedExpenses,
    upcomingExpenses,
    availableBalance,
    projectedBalanceAfterUpcoming,
  } = useMemo(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;

    const currentMonthCompleted = transactions.filter(
      (t) => t.status === 'completed' && t.date.startsWith(currentYearMonth)
    );
    const poolCompleted =
      currentMonthCompleted.length > 0
        ? currentMonthCompleted
        : transactions.filter((t) => t.status === 'completed');

    const incomes = poolCompleted
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const expenses = poolCompleted
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const upcoming = transactions
      .filter((t) => t.status === 'upcoming' && t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const available = incomes - expenses;
    const projected = available - upcoming;

    return {
      completedIncomes: incomes,
      completedExpenses: expenses,
      upcomingExpenses: upcoming,
      availableBalance: available,
      projectedBalanceAfterUpcoming: projected,
    };
  }, [transactions]);

  // Category Breakdown for Donut Chart & "Onde Mais Gastei" Ranking
  const expenseRanking = useMemo(() => {
    const completedExp = transactions.filter(
      (t) => t.status === 'completed' && t.type === 'expense'
    );
    const totalExp = completedExp.reduce((sum, t) => sum + t.amount, 0);
    if (totalExp <= 0) return [];

    const map = new Map<
      string,
      {
        categoryId: string;
        name: string;
        color: string;
        icon: string;
        amount: number;
        count: number;
      }
    >();

    for (const tx of completedExp) {
      const cat =
        categories.find((c) => c.id === tx.categoryId) ?? categories[0];
      if (!cat) continue;
      const existing = map.get(cat.id);
      if (existing) {
        existing.amount += tx.amount;
        existing.count += 1;
      } else {
        map.set(cat.id, {
          categoryId: cat.id,
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          amount: tx.amount,
          count: 1,
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
        percentage: Math.round((item.amount / totalExp) * 1000) / 10,
      }));
  }, [transactions, categories]);

  // 6-Month Evolution Data for Line Chart
  const sixMonthSeries = useMemo(() => {
    const months: {
      key: string;
      label: string;
      Receitas: number;
      Despesas: number;
    }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      const shortMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
        .format(d)
        .replace('.', '');
      months.push({
        key,
        label: shortMonth.charAt(0).toUpperCase() + shortMonth.slice(1),
        Receitas: 0,
        Despesas: 0,
      });
    }

    for (const tx of transactions) {
      if (tx.status !== 'completed') continue;
      const ym = tx.date.slice(0, 7);
      const target = months.find((m) => m.key === ym);
      if (target) {
        if (tx.type === 'income') {
          target.Receitas += tx.amount;
        } else {
          target.Despesas += tx.amount;
        }
      }
    }

    return months;
  }, [transactions]);

  const homeDisplayedTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.status === homeTxTab)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [transactions, homeTxTab]);

  return (
    <div className="space-y-5">
      {/* Header: User Greeting & Shortcut to Bank Connections */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
            {profile.name.charAt(0).toUpperCase() || 'K'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Bem-vindo ao Kashi,
            </p>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
              Olá, {profile.name}
            </h1>
          </div>
        </div>

        <Link
          href="/banks"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-soft transition-colors shrink-0"
        >
          <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>
            Bancos{connectedBanksCount > 0 ? ` (${connectedBanksCount})` : ''}
          </span>
        </Link>
      </header>

      {/* Hero Card: Saldo Disponível no Mês + 3 Quick Indicators */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 text-white p-5 sm:p-6 shadow-glow relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-100">
              <Wallet className="w-3.5 h-3.5" />
              Saldo Disponível no Mês
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              {formatCurrency(availableBalance)}
            </p>
            <p className="text-xs text-emerald-100/90 mt-1">
              Saldo após Seguintes:{' '}
              <strong className="font-bold text-white">
                {formatCurrency(projectedBalanceAfterUpcoming)}
              </strong>
            </p>
          </div>

          <Link
            href="/transactions?tab=new"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-xs font-semibold text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Lançar
          </Link>
        </div>

        {/* 3 Quick Indicators: Receitas (Últimas), Despesas (Últimas), Gastos Seguintes (Previstos) */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-3 border border-white/10 flex items-center justify-between sm:block">
            <div className="flex items-center gap-1.5 text-emerald-100 text-xs font-medium">
              <ArrowUpRight className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Receitas (Últimas)</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white sm:mt-1">
              {formatCurrency(completedIncomes)}
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-3 border border-white/10 flex items-center justify-between sm:block">
            <div className="flex items-center gap-1.5 text-emerald-100 text-xs font-medium">
              <ArrowDownRight className="w-4 h-4 text-rose-300 shrink-0" />
              <span>Despesas (Últimas)</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white sm:mt-1">
              {formatCurrency(completedExpenses)}
            </p>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-3 border border-white/10 flex items-center justify-between sm:block">
            <div className="flex items-center gap-1.5 text-emerald-100 text-xs font-medium">
              <CalendarClock className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Gastos Seguintes (Previstos)</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white sm:mt-1">
              {formatCurrency(upcomingExpenses)}
            </p>
          </div>
        </div>
      </section>

      {/* Review Banner: Shown when bank transactions are awaiting category confirmation */}
      {pendingBankCount > 0 && (
        <Link
          href="/transactions?filter=pending"
          className="block rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 p-4 shadow-sm hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-950 dark:text-amber-100 leading-snug">
                  {pendingBankCount}{' '}
                  {pendingBankCount === 1
                    ? 'transação do banco aguarda'
                    : 'transações do banco aguardam'}{' '}
                  confirmação
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  Toque para revisar e confirmar as sugestões de categoria em 1 toque
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0" />
          </div>
        </Link>
      )}

      {/* Dashboards Section (2 Charts: Donut Chart + 6-Month Line Chart) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart 1: Donut Chart — Expense Distribution by Category */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-soft flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Gastos por Categoria
              </h2>
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              Distribuição %
            </span>
          </div>

          {expenseRanking.length === 0 ? (
            <div className="flex-1 min-h-[210px] flex flex-col items-center justify-center text-center px-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nenhum gasto realizado ainda para exibir no gráfico.
              </p>
              <Link
                href="/banks"
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Conectar banco ou lançar gasto
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseRanking}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={74}
                      paddingAngle={3}
                    >
                      {expenseRanking.map((entry) => (
                        <Cell key={entry.categoryId} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => formatCurrency(val)}
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mt-1">
                {expenseRanking.slice(0, 5).map((item) => (
                  <div
                    key={item.categoryId}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium">{item.name}</span>
                    <span className="text-slate-400 font-semibold">
                      ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Line Chart — 6-Month Evolution (Receitas vs. Despesas) */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-soft flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Receitas vs. Despesas
              </h2>
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              Últimos 6 meses
            </span>
          </div>

          <div className="w-full h-52 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sixMonthSeries}
                margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#94a3b825"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                  }
                />
                <Tooltip
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Receitas"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#10b981' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="Despesas"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#f43f5e' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-5 mt-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Receitas
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Despesas
            </span>
          </div>
        </div>
      </section>

      {/* Responsive Table "Onde Mais Gastei" (Flexible row cards with 100% progress bar) */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-soft">
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Onde Mais Gastei
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ranking proporcional por categoria
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Total: {formatCurrency(completedExpenses)}
          </span>
        </div>

        {expenseRanking.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Seus gastos realizados aparecerão ranqueados aqui assim que você
              sincronizar seu banco ou registrar despesas.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenseRanking.map((item) => (
              <div
                key={item.categoryId}
                className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 w-5 shrink-0">
                      {item.rank}º
                    </span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${item.color}20`,
                        color: item.color,
                      }}
                    >
                      <CategoryIcon name={item.icon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.count}{' '}
                        {item.count === 1 ? 'lançamento' : 'lançamentos'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.amount)}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {item.percentage}%
                    </p>
                  </div>
                </div>

                {/* 100%-width proportional progress bar */}
                <div className="mt-2.5 w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-700/70 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(4, Math.min(100, item.percentage))}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Home Transactions Card (Toggle between "Últimas" | "Seguintes") */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Movimentações
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Classifique ou gerencie direto pela Home
            </p>
          </div>

          {/* Segmented Toggle: Últimas | Seguintes */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setHomeTxTab('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                homeTxTab === 'completed'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              Últimas
            </button>
            <button
              type="button"
              onClick={() => setHomeTxTab('upcoming')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                homeTxTab === 'upcoming'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              Seguintes
            </button>
          </div>
        </div>

        {homeDisplayedTransactions.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {homeTxTab === 'completed'
                ? 'Nenhuma transação realizada registrada até o momento.'
                : 'Nenhum lançamento futuro agendado em Seguintes.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                href="/banks"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Building2 className="w-3.5 h-3.5" />
                Conectar & Sincronizar Banco
              </Link>
              <Link
                href="/transactions?tab=new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Lançamento
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {homeDisplayedTransactions.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                categories={categories}
                onCategoryChange={updateTransactionCategory}
                onConfirmSuggestion={confirmTransactionCategory}
                onSettleUpcoming={settleUpcomingTransaction}
                onRequestDelete={setTxToDelete}
              />
            ))}

            <div className="pt-2 text-center">
              <Link
                href="/transactions"
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Ver todas as transações
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </section>

      <DeleteTransactionModal
        transaction={txToDelete}
        onCancel={() => setTxToDelete(null)}
        onConfirm={(id) => {
          deleteTransaction(id);
          setTxToDelete(null);
        }}
      />
    </div>
  );
}
