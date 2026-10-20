'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Link2,
  Link2Off,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { formatCurrency } from '@/lib/formatters';
import { BankInstitutionId } from '@/types/finance';
import { StatementImportModal } from '@/components/StatementImportModal';

export default function BanksPage() {
  const { banks, toggleBankConnection, syncConnectedBanks, notify } =
    useFinance();

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const connectedBanks = useMemo(
    () => banks.filter((b) => b.connected),
    [banks]
  );

  const totalBankBalance = useMemo(
    () => connectedBanks.reduce((sum, b) => sum + b.balance, 0),
    [connectedBanks]
  );

  const handleSyncSingleBank = async (institutionId: BankInstitutionId) => {
    setSyncingId(institutionId);
    try {
      await fetch('/api/pluggy/token', { method: 'POST' }).catch(() => null);
      setTimeout(() => {
        syncConnectedBanks(institutionId);
        setSyncingId(null);
      }, 350);
    } catch {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    if (connectedBanks.length === 0) {
      notify(
        'Conecte um banco primeiro',
        'Ative pelo menos uma instituição abaixo para sincronizar.',
        'warning'
      );
      return;
    }
    setSyncingId('all');
    try {
      await fetch('/api/pluggy/token', { method: 'POST' }).catch(() => null);
      setTimeout(() => {
        syncConnectedBanks();
        setSyncingId(null);
      }, 400);
    } catch {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            aria-label="Voltar para Home"
            className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-emerald-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Conexão Bancária
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Open Finance Brasil (Pluggy) & Importação de Extrato
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsImportModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-soft transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Importar CSV / OFX</span>
        </button>
      </header>

      {/* Consolidated Open Finance Hero Summary */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 sm:p-6 shadow-soft flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Building2 className="w-3.5 h-3.5" />
            Saldo Consolidado nas Contas Conectadas
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold mt-1">
            {formatCurrency(totalBankBalance)}
          </p>
          <p className="text-xs text-slate-300 mt-1">
            {connectedBanks.length} de {banks.length} instituições conectadas via
            Open Finance
          </p>
        </div>

        <button
          type="button"
          onClick={handleSyncAll}
          disabled={syncingId !== null}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-glow transition-all w-full sm:w-auto"
        >
          <RefreshCw
            className={`w-4 h-4 ${syncingId === 'all' ? 'animate-spin' : ''}`}
          />
          {syncingId === 'all'
            ? 'Sincronizando Extratos...'
            : 'Sincronizar Todos os Bancos'}
        </button>
      </section>

      {/* Institutions Grid: Nubank, Itaú, Inter, Bradesco */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {banks.map((bank) => {
          const isThisSyncing = syncingId === bank.institutionId;

          return (
            <div
              key={bank.id}
              className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col justify-between ${
                bank.connected
                  ? 'bg-white dark:bg-slate-900 border-emerald-500/60 dark:border-emerald-500/50 shadow-soft'
                  : 'bg-white/80 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${bank.accentBg} text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm`}
                    >
                      {bank.shortCode}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                        {bank.institutionName}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {bank.accountType}
                      </p>
                    </div>
                  </div>

                  {bank.connected ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-semibold shrink-0">
                      Desconectado
                    </span>
                  )}
                </div>

                {/* Account Balance Display */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Saldo em Conta
                  </p>
                  <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {bank.connected ? formatCurrency(bank.balance) : 'R$ —'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleBankConnection(bank.institutionId)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors ${
                    bank.connected
                      ? 'bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  }`}
                >
                  {bank.connected ? (
                    <>
                      <Link2Off className="w-3.5 h-3.5" />
                      Desconectar
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      Conectar via Open Finance
                    </>
                  )}
                </button>

                {bank.connected && (
                  <button
                    type="button"
                    onClick={() => handleSyncSingleBank(bank.institutionId)}
                    disabled={isThisSyncing}
                    className="py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        isThisSyncing ? 'animate-spin' : ''
                      }`}
                    />
                    {isThisSyncing ? 'Sincronizando' : 'Sincronizar'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Info Banner about Smart Classification on Bank Sync */}
      <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <p className="font-bold text-slate-900 dark:text-white">
            Como funciona a sincronização inteligente do Kashi?
          </p>
          <p>
            Ao sincronizar um banco conectado ou importar seu extrato CSV/OFX, o
            motor inteligente do Kashi classifica automaticamente gastos como{' '}
            <strong>iFood</strong>, <strong>Uber</strong>, <strong>PIX</strong> e{' '}
            <strong>Netflix</strong>, deixando-os prontos para sua confirmação em
            1 toque na aba{' '}
            <Link
              href="/transactions"
              className="font-bold text-emerald-600 dark:text-emerald-400 underline"
            >
              Receitas & Gastos
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Integração estruturada com Pluggy SDK (Open Finance Brasil)</span>
      </div>

      <StatementImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
