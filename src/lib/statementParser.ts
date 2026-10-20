import { getTodayIsoDate } from './formatters.ts';
import type { TransactionStatus, TransactionType } from '../types/finance.ts';

export interface ParsedStatementItem {
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  date: string;
}

function parseFlexibleDate(raw: string): string {
  const cleaned = raw.trim().replace(/['"]/g, '');
  // DD/MM/YYYY
  const brMatch = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }
  // YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  // OFX YYYYMMDD
  const ofxMatch = cleaned.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofxMatch) {
    return `${ofxMatch[1]}-${ofxMatch[2]}-${ofxMatch[3]}`;
  }
  return getTodayIsoDate();
}

function parseFlexibleAmount(raw: string): number {
  const cleaned = raw.trim().replace(/['"R$\s]/g, '');
  if (!cleaned) return NaN;

  // Handle Brazilian format: 1.234,56 -> 1234.56
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(cleaned.replace(/,/g, ''));
  }

  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(',', '.'));
  }

  return parseFloat(cleaned);
}

/**
 * Parses an OFX (Open Financial Exchange) bank statement file.
 */
export function parseOfxStatement(content: string): ParsedStatementItem[] {
  const results: ParsedStatementItem[] = [];
  const today = getTodayIsoDate();
  const blocks = content.split(/<STMTTRN>/i).slice(1);

  for (const block of blocks) {
    const amtMatch = block.match(/<TRNAMT>([^<\r\n]+)/i);
    const dateMatch = block.match(/<DTPOSTED>([^<\r\n]+)/i);
    const memoMatch = block.match(/<MEMO>([^<\r\n]+)/i);
    const nameMatch = block.match(/<NAME>([^<\r\n]+)/i);

    const rawAmount = amtMatch ? parseFlexibleAmount(amtMatch[1]) : NaN;
    if (isNaN(rawAmount) || rawAmount === 0) continue;

    const description = (memoMatch?.[1] || nameMatch?.[1] || 'Transação OFX').trim();
    const date = dateMatch ? parseFlexibleDate(dateMatch[1]) : today;
    const type: TransactionType = rawAmount < 0 ? 'expense' : 'income';
    const status: TransactionStatus = date > today ? 'upcoming' : 'completed';

    results.push({
      description,
      amount: Math.abs(rawAmount),
      type,
      status,
      date,
    });
  }

  return results;
}

/**
 * Parses a CSV bank statement (supports Nubank, Itaú, Inter, Bradesco and generic CSV formats).
 */
export function parseCsvStatement(content: string): ParsedStatementItem[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0]
    .split(delimiter)
    .map((h) =>
      h
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['"]/g, '')
        .trim()
    );

  const dateIdx = headers.findIndex((h) => h.includes('data') || h.includes('date'));
  const amountIdx = headers.findIndex(
    (h) => h.includes('valor') || h.includes('amount') || h.includes('quantia')
  );
  const descIdx = headers.findIndex(
    (h) =>
      h.includes('descri') ||
      h.includes('hist') ||
      h.includes('estabelecimento') ||
      h.includes('titulo') ||
      h.includes('title') ||
      h.includes('memo')
  );

  const today = getTodayIsoDate();
  const items: ParsedStatementItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
    if (cols.length < 2) continue;

    const rawDate = dateIdx >= 0 ? cols[dateIdx] : cols[0];
    const rawAmountStr = amountIdx >= 0 ? cols[amountIdx] : cols[1];
    const rawDesc =
      descIdx >= 0
        ? cols[descIdx]
        : cols[cols.length - 1] || 'Transação Importada';

    const parsedAmount = parseFlexibleAmount(rawAmountStr);
    if (isNaN(parsedAmount) || parsedAmount === 0) continue;

    const date = parseFlexibleDate(rawDate);
    // In Nubank credit card CSVs, positive values can be expenses unless specified,
    // whereas in checking account CSVs negative values are expenses.
    // We check if description indicates income (Salário, PIX Recebido, Rendimento) or negative sign.
    const normalizedDesc = rawDesc
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const isExplicitIncome =
      normalizedDesc.includes('salario') ||
      normalizedDesc.includes('pix recebido') ||
      normalizedDesc.includes('transferencia recebida') ||
      normalizedDesc.includes('rendimento') ||
      normalizedDesc.includes('dividendo');

    const type: TransactionType =
      parsedAmount < 0
        ? 'expense'
        : isExplicitIncome
        ? 'income'
        : 'expense';

    const status: TransactionStatus = date > today ? 'upcoming' : 'completed';

    items.push({
      description: rawDesc,
      amount: Math.abs(parsedAmount),
      type,
      status,
      date,
    });
  }

  return items;
}

export function parseBankStatementFile(fileName: string, content: string): ParsedStatementItem[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.ofx') || content.includes('<OFX>') || content.includes('<STMTTRN>')) {
    return parseOfxStatement(content);
  }
  return parseCsvStatement(content);
}
