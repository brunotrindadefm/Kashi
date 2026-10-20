'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BellRing,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  FileSpreadsheet,
  Link2,
  Link2Off,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import { formatCurrency } from '@/lib/formatters';
import { BankInstitutionId } from '@/types/finance';
import { StatementImportModal } from '@/components/StatementImportModal';

export default function BanksPage() {
  const {
    banks,
    transactions,
    toggleBankConnection,
    updateBankBalance,
    syncConnectedBanks,
    ingestNotificationText,
    clearAllTransactions,
    notify,
  } = useFinance();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Notification Webhook Tester & Config State
  const [notificationInput, setNotificationInput] = useState('');
  const [selectedBankApp, setSelectedBankApp] = useState('Nubank');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Manual Balance Edit State
  const [editingBankId, setEditingBankId] = useState<BankInstitutionId | null>(
    null
  );
  const [balanceInput, setBalanceInput] = useState('');

  const connectedBanks = useMemo(
    () => banks.filter((b) => b.connected),
    [banks]
  );

  const totalBankBalance = useMemo(
    () => connectedBanks.reduce((sum, b) => sum + b.balance, 0),
    [connectedBanks]
  );

  const webhookEndpointUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhook/notification`
      : 'https://seu-kashi.vercel.app/api/webhook/notification';

  const handleCopyWebhookUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(webhookEndpointUrl);
      setCopiedWebhook(true);
      notify('URL do Webhook copiada!', 'Cole no MacroDroid ou Atalhos do iOS.');
      setTimeout(() => setCopiedWebhook(false), 2500);
    }
  };

  const handleParseNotificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationInput.trim()) return;
    const ok = ingestNotificationText(notificationInput, selectedBankApp);
    if (ok) {
      setNotificationInput('');
    }
  };

  const handleSyncWebhook = async () => {
    setIsSyncing(true);
    try {
      await syncConnectedBanks();
    } finally {
      setIsSyncing(false);
    }
  };

  const openBalanceEditor = (
    institutionId: BankInstitutionId,
    currentBalance: number
  ) => {
    setEditingBankId(institutionId);
    setBalanceInput(String(currentBalance || 0));
  };

  const handleSaveBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBankId) return;
    const parsedBal = parseFloat(balanceInput.replace(',', '.'));
    if (!isNaN(parsedBal)) {
      updateBankBalance(editingBankId, parsedBal);
    }
    setEditingBankId(null);
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
              Conexão Bancária (100% Grátis)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Webhook de Notificações em Tempo Real + Importador CSV / OFX com Deduplicação
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {transactions.length > 0 && (
            <button
              type="button"
              onClick={clearAllTransactions}
              title="Apagar todos os lançamentos atuais"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 hover:bg-red-100 text-xs font-semibold text-red-600 dark:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Zerar Dados</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar Extrato CSV / OFX</span>
          </button>
        </div>
      </header>

      {/* Consolidated Balance Hero Summary */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 sm:p-6 shadow-soft flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Building2 className="w-3.5 h-3.5" />
            Saldo Consolidado nas Contas Ativas
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold mt-1">
            {formatCurrency(totalBankBalance)}
          </p>
          <p className="text-xs text-slate-300 mt-1">
            {connectedBanks.length} de {banks.length} instituições ativas • Sem
            mensalidades ou trials de terceiros
          </p>
        </div>

        <button
          type="button"
          onClick={handleSyncWebhook}
          disabled={isSyncing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-glow transition-all w-full sm:w-auto"
        >
          <RefreshCw
            className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
          />
          {isSyncing ? 'Verificando...' : 'Buscar Notificações do Webhook'}
        </button>
      </section>

      {/* FREE REAL-TIME NOTIFICATION WEBHOOK SECTION */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/40 dark:border-emerald-500/40 p-4 sm:p-5 shadow-soft space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  1. Webhook de Notificações do Celular (Tempo Real)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase">
                  100% Grátis para Sempre
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Substitui APIs pagas de Open Finance capturando compras e PIX no
                segundo em que a notificação chega no seu celular
              </p>
            </div>
          </div>
        </div>

        {/* Webhook URL Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sua URL do Webhook
            </span>
            <button
              type="button"
              onClick={handleCopyWebhookUrl}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {copiedWebhook ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar URL
                </>
              )}
            </button>
          </div>
          <code className="block text-xs font-mono text-slate-800 dark:text-emerald-300 break-all">
            POST {webhookEndpointUrl}
          </code>
          <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 pt-1">
            <p>
              • <strong>No Android (app grátis MacroDroid):</strong> Crie uma macro
              com Gatilho <em>&ldquo;Notificação Recebida&rdquo;</em> (selecione Nubank,
              Itaú, Inter, Bradesco) → Ação <em>&ldquo;Requisição HTTP POST&rdquo;</em> para a
              URL acima com corpo JSON:{' '}
              <code className="px-1 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700">
                {`{"title": "[not_title]", "text": "[not_text]"}`}
              </code>
            </p>
            <p>
              • <strong>No iPhone (App Atalhos nativo):</strong> Na aba{' '}
              <em>Automação</em> → Gatilho <em>&ldquo;Transação (Ao tocar Carteira / Apple Pay)&rdquo;</em>{' '}
              ou mensagem do banco → Ação{' '}
              <em>&ldquo;Obter Conteúdo de URL (POST JSON)&rdquo;</em>.
            </p>
          </div>
        </div>

        {/* Interactive Notification Parser & Instant Importer */}
        <form onSubmit={handleParseNotificationSubmit} className="space-y-2.5">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Colar ou testar qualquer notificação do seu banco agora:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedBankApp}
              onChange={(e) => setSelectedBankApp(e.target.value)}
              className="sm:w-36 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Nubank">Nubank</option>
              <option value="Itaú">Itaú</option>
              <option value="Inter">Banco Inter</option>
              <option value="Bradesco">Bradesco</option>
            </select>

            <input
              type="text"
              placeholder="Ex: Compra de R$ 64,90 aprovada em IFOOD *RESTAURANTE no cartão..."
              value={notificationInput}
              onChange={(e) => setNotificationInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              Lançar Notificação
            </button>
          </div>
        </form>
      </section>

      {/* Institutions Grid: Nubank, Itaú, Inter, Bradesco */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {banks.map((bank) => {
          const isEditingThis = editingBankId === bank.institutionId;

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
                      Inativo
                    </span>
                  )}
                </div>

                {/* Account Balance Display */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Saldo em Conta
                    </p>
                    <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {bank.connected ? formatCurrency(bank.balance) : 'R$ —'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openBalanceEditor(bank.institutionId, bank.balance)
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 transition-colors"
                  >
                    <Pencil className="w-3 h-3 text-emerald-500" />
                    Editar Saldo
                  </button>
                </div>

                {isEditingThis && (
                  <form
                    onSubmit={handleSaveBalance}
                    className="mt-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2"
                  >
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Saldo Atual da Conta (R$)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={balanceInput}
                        onChange={(e) => setBalanceInput(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBankId(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-semibold"
                      >
                        ×
                      </button>
                    </div>
                  </form>
                )}
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
                      Desativar Conta
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      Ativar Conta
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-950 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Importar Extrato
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>
          100% Gratuito • Sem dependência de APIs pagas ou trials de 15 dias
        </span>
      </div>

      <StatementImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
