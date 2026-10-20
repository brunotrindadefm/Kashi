import { getTodayIsoDate } from './formatters.ts';
import type { BankInstitutionId, TransactionType } from '../types/finance.ts';

export interface ParsedBankNotification {
  description: string;
  amount: number;
  type: TransactionType;
  institutionId?: BankInstitutionId;
  bankName: string;
  date: string;
  rawText: string;
}

function detectBankInstitution(
  text: string,
  appOrTitle?: string
): { institutionId?: BankInstitutionId; bankName: string } {
  const combined = `${appOrTitle ?? ''} ${text}`.toLowerCase();

  if (
    combined.includes('nubank') ||
    combined.includes('com.nu.production') ||
    combined.includes('nu pagamentos')
  ) {
    return { institutionId: 'nubank', bankName: 'Nubank' };
  }
  if (
    combined.includes('itau') ||
    combined.includes('itaú') ||
    combined.includes('com.itau')
  ) {
    return { institutionId: 'itau', bankName: 'Itaú Unibanco' };
  }
  if (
    combined.includes('inter') ||
    combined.includes('br.com.intermedium')
  ) {
    return { institutionId: 'inter', bankName: 'Banco Inter' };
  }
  if (
    combined.includes('bradesco') ||
    combined.includes('com.bradesco')
  ) {
    return { institutionId: 'bradesco', bankName: 'Bradesco' };
  }

  return { bankName: appOrTitle?.trim() || 'Notificação Bancária' };
}

function parseNotificationAmount(text: string): number | null {
  // Match R$ 1.234,56 or R$ 64,90 or R$64.90
  const brlMatch = text.match(/R\$\s*([\d.]+,\d{2}|\d+(?:\.\d{2})?)/i);
  const raw = brlMatch?.[1];
  if (!raw) return null;

  if (raw.includes(',')) {
    const normalized = raw.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(normalized);
    return isNaN(val) || val <= 0 ? null : val;
  }

  const val = parseFloat(raw);
  return isNaN(val) || val <= 0 ? null : val;
}

function extractMerchantFromNotification(
  text: string,
  type: TransactionType
): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();

  // 1. Purchase patterns: "aprovada em IFOOD *RESTAURANTE para..." / "de R$ 45,90 em UBER *TRIP."
  const purchasePatterns = [
    /(?:aprovad[ao]|compra|débito|crédito)[^]*?\bem\s+([A-Za-z0-9À-ÿ*._\-\s]{2,45}?)(?:\s+(?:para o cart[aã]o|no cart[aã]o|cart[aã]o final|em \d{2}\/\d{2}|às \d{2}:\d{2}|\.|$))/i,
    /R\$\s*[\d.,]+\s+em\s+([A-Za-z0-9À-ÿ*._\-\s]{2,45}?)(?:\s+(?:para o cart[aã]o|no cart[aã]o|cart[aã]o final|em \d{2}\/\d{2}|às \d{2}:\d{2}|\.|$))/i,
  ];

  for (const regex of purchasePatterns) {
    const m = cleaned.match(regex);
    if (m?.[1]) {
      return m[1].trim().replace(/[.,;]+$/, '');
    }
  }

  // 2. Outgoing PIX / Transfer patterns: "enviada via Pix para João Silva" / "Pix enviado para Padaria"
  if (type === 'expense') {
    const pixOutMatch = cleaned.match(
      /(?:pix|transfer[eê]ncia|pagamento)[^]*?\bpara\s+([A-Za-z0-9À-ÿ*._\-\s]{2,45}?)(?:\s+(?:no valor|de R\$|em \d{2}\/\d{2})|[.,;]|$)/i
    );
    if (pixOutMatch?.[1]) {
      return `PIX Enviado - ${pixOutMatch[1].trim().replace(/[.,;]+$/, '')}`;
    }
  }

  // 3. Incoming PIX / Transfer patterns: "recebeu uma transferência de R$ 1.500,00 de Empresa X"
  if (type === 'income') {
    const pixInMatch = cleaned.match(
      /(?:recebeu|recebida)[^]*?R\$\s*[\d.,]+\s+de\s+([A-Za-z0-9À-ÿ*._\-\s]{2,45}?)(?:\s+(?:via pix|em \d{2}\/\d{2})|[.,;]|$)/i
    );
    if (pixInMatch?.[1]) {
      return `PIX Recebido - ${pixInMatch[1].trim().replace(/[.,;]+$/, '')}`;
    }
  }

  // Fallback: remove amount and generic banking words
  const fallback = cleaned
    .replace(/R\$\s*[\d.,]+/gi, '')
    .replace(
      /\b(compra|aprovada|no|cartao|cartão|credito|crédito|debito|débito|valor|de|em|para)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();

  return fallback.slice(0, 50) || 'Lançamento via Notificação';
}

/**
 * Parses a raw push notification string from a Brazilian bank app
 * (Nubank, Itaú, Inter, Bradesco, Apple Pay, Google Wallet) into a structured transaction.
 */
export function parseBankNotification(
  rawText: string,
  appOrTitle?: string
): ParsedBankNotification | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const amount = parseNotificationAmount(trimmed);
  if (amount === null) return null;

  const lower = trimmed.toLowerCase();
  const isIncome =
    lower.includes('você recebeu') ||
    lower.includes('voce recebeu') ||
    lower.includes('transferência recebida') ||
    lower.includes('transferencia recebida') ||
    lower.includes('pix recebido') ||
    lower.includes('salário recebido') ||
    lower.includes('salario recebido');

  const type: TransactionType = isIncome ? 'income' : 'expense';
  const { institutionId, bankName } = detectBankInstitution(trimmed, appOrTitle);
  const description = extractMerchantFromNotification(trimmed, type);

  return {
    description,
    amount,
    type,
    institutionId,
    bankName,
    date: getTodayIsoDate(),
    rawText: trimmed,
  };
}
