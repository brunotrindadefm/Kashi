'use client';

import React, { useRef, useState } from 'react';
import { FileSpreadsheet, Sparkles, Upload, X } from 'lucide-react';
import { useFinance } from '@/context/FinanceContext';
import {
  parseBankStatementFile,
  ParsedStatementItem,
} from '@/lib/statementParser';
import { formatCurrency, getTodayIsoDate } from '@/lib/formatters';

interface StatementImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_CSV_CONTENT = `Data,Valor,Descrição
${getTodayIsoDate(-1)},-54.90,iFood *Pizzaria Napoles
${getTodayIsoDate(-2)},-24.50,Uber *Trip Trabalho
${getTodayIsoDate(-3)},-39.90,Netflix.com Assinatura
${getTodayIsoDate(-4)},-89.00,PIX Enviado - Farmacia Drogasil
${getTodayIsoDate(6)},-149.90,Internet Fibra Agendado`;

export function StatementImportModal({
  isOpen,
  onClose,
}: StatementImportModalProps) {
  const { banks, importStatementItems } = useFinance();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>(
    banks.find((b) => b.connected)?.id ?? banks[0]?.id ?? ''
  );
  const [fileName, setFileName] = useState<string>('');
  const [previewItems, setPreviewItems] = useState<ParsedStatementItem[]>([]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseBankStatementFile(file.name, text);
    setFileName(file.name);
    setPreviewItems(parsed);
  };

  const handleLoadSampleCsv = () => {
    const parsed = parseBankStatementFile('extrato-exemplo.csv', SAMPLE_CSV_CONTENT);
    setFileName('extrato-exemplo.csv');
    setPreviewItems(parsed);
  };

  const handleConfirmImport = () => {
    if (previewItems.length === 0) return;
    importStatementItems(previewItems, selectedBankId);
    setPreviewItems([]);
    setFileName('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Importar Extrato (CSV / OFX)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Classificação inteligente automática ao importar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Vincular à Conta / Instituição
            </label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.institutionName} ({b.accountType})
                </option>
              ))}
            </select>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-slate-50/60 dark:bg-slate-800/40"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.ofx,text/csv,application/x-ofx"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-7 h-7 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {fileName || 'Toque para selecionar arquivo .CSV ou .OFX'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Suporta extratos Nubank, Itaú, Inter e Bradesco
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Não tem um arquivo em mãos agora?
            </span>
            <button
              type="button"
              onClick={handleLoadSampleCsv}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Carregar CSV de Exemplo
            </button>
          </div>

          {previewItems.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-800/50 space-y-2">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Prévia ({previewItems.length} lançamentos identificados):
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {previewItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 dark:border-slate-700/60 last:border-0 gap-2"
                  >
                    <span className="truncate text-slate-700 dark:text-slate-200 font-medium">
                      {item.description}
                    </span>
                    <span
                      className={`font-bold shrink-0 ${
                        item.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={previewItems.length === 0}
            onClick={handleConfirmImport}
            className="py-2.5 px-3 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            Importar ({previewItems.length})
          </button>
        </div>
      </div>
    </div>
  );
}
