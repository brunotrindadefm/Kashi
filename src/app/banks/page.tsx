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
  ExternalLink,
  FileSpreadsheet,
  KeyRound,
  Link2,
  Link2Off,
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

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Notification Webhook Tester & Config State
  const [notificationInput, setNotificationInput] = useState('');
  const [selectedBankApp, setSelectedBankApp] = useState('Nubank');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Meu Pluggy Item ID & Manual Balance Edit State
  const [editingBankId, setEditingBankId] = useState<BankInstitutionId | null>(
    null
  );
  const [pluggyItemInput, setPluggyItemInput] = useState('');
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

  const handleSyncSingleBank = async (institutionId: BankInstitutionId) => {
    setSyncingId(institutionId);
    try {
      await syncConnectedBanks(institutionId);
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingId('all');
    try {
      await syncConnectedBanks();
    } finally {
      setSyncingId(null);
    }
  };

  const openBankConfig = (
    institutionId: BankInstitutionId,
    currentBalance: number,
    currentItemId?: string
  ) => {
    setEditingBankId(institutionId);
    setBalanceInput(String(currentBalance || 0));
    setPluggyItemInput(currentItemId ?? '');
  };

  const handleSaveBankConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBankId) return;
    const parsedBal = parseFloat(balanceInput.replace(',', '.'));
    if (!isNaN(parsedBal)) {
      updateBankBalance(editingBankId, parsedBal);
    }
    if (pluggyItemInput.trim()) {
      toggleBankConnection(editingBankId, pluggyItemInput.trim());
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
              Meu Pluggy (Open Finance Pessoa Física), Webhook em Tempo Real & CSV/OFX
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
            <span>Importar CSV / OFX</span>
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
            {connectedBanks.length} de {banks.length} instituições ativas
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
            ? 'Sincronizando...'
            : 'Sincronizar Meu Pluggy & Webhook'}
        </button>
      </section>

      {/* HOW TO USE MEU PLUGGY FOR FREE FOREVER (IGNORING THE 15-DAY DASHBOARD BANNER) */}
      <section className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-300/70 dark:border-emerald-800/70 p-4 sm:p-5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Como usar o Open Finance Oficial de Graça para Sempre (Meu Pluggy)
          </h2>
          <a
            href="https://meu.pluggy.ai"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0"
          >
            Abrir meu.pluggy.ai
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          O aviso de <strong>&ldquo;15 dias de trial&rdquo;</strong> que aparece no{' '}
          <code>dashboard.pluggy.ai</code> vale apenas para empresas B2B. Para{' '}
          <strong>Pessoa Física (até 5 contas suas)</strong>, o acesso é{' '}
          <strong>100% gratuito e não expira</strong> se você conectar pelo{' '}
          <strong>Meu Pluggy</strong>:
        </p>
        <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-decimal list-inside font-medium">
          <li>
            Entre em{' '}
            <a
              href="https://meu.pluggy.ai"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-emerald-700 dark:text-emerald-400 underline"
            >
              meu.pluggy.ai
            </a>{' '}
            (com o mesmo e-mail do Dashboard) e conecte seu Nubank, Itaú, Inter
            ou Bradesco via Open Finance.
          </li>
          <li>
            No <code>dashboard.pluggy.ai</code>, abra sua Aplicação → clique em{' '}
            <strong>&ldquo;Ir para Demo&rdquo;</strong> → no canto superior direito clique
            nos 3 pontinhos (<code>...</code>) →{' '}
            <strong>&ldquo;Copiar Item ID&rdquo;</strong>.
          </li>
          <li>
            Clique em <strong>Configurar</strong> no card do banco abaixo, cole o{' '}
            <strong>Item ID</strong> e clique em <strong>Sincronizar</strong>!
          </li>
        </ol>
      </section>

      {/* Institutions Grid: Nubank, Itaú, Inter, Bradesco */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {banks.map((bank) => {
          const isThisSyncing = syncingId === bank.institutionId;
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
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Saldo em Conta{' '}
                      {bank.pluggyItemId ? '• Open Finance vinculado' : ''}
                    </p>
                    <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {bank.connected ? formatCurrency(bank.balance) : 'R$ —'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openBankConfig(
                        bank.institutionId,
                        bank.balance,
                        bank.pluggyItemId
                      )
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500 transition-colors shrink-0"
                  >
                    <KeyRound className="w-3 h-3 text-emerald-500" />
                    Configurar
                  </button>
                </div>

                {isEditingThis && (
                  <form
                    onSubmit={handleSaveBankConfig}
                    className="mt-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5"
                  >
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Item ID do Meu Pluggy (meu.pluggy.ai — Grátis)
                      </label>
                      <input
                        type="text"
                        placeholder="Cole aqui o Item ID copiado do Meu Pluggy..."
                        value={pluggyItemInput}
                        onChange={(e) => setPluggyItemInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Saldo Atual (R$ — atualizado automático ao sincronizar)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={balanceInput}
                        onChange={(e) => setBalanceInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBankId(null)}
                        className="py-1.5 px-3 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-semibold"
                      >
                        Fechar
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
                      Desativar
                    </>
                  ) : (
                    <>
                      <Link2 className="w-3.5 h-3.5" />
                      Ativar Conta
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

      {/* FREE REAL-TIME NOTIFICATION WEBHOOK SECTION */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-soft space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Webhook de Notificações do Celular (Tempo Real)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase">
                  Opcional • Instantâneo
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Para lançar compras no segundo em que você passa o cartão, sem
                esperar o banco atualizar o Open Finance
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Endpoint POST do Webhook
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
        </div>

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

      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>
          Suas chaves em .env.local ficam 100% locais e protegidas pelo .gitignore
        </span>
      </div>

      <StatementImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
