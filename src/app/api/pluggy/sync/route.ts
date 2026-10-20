import { NextRequest, NextResponse } from 'next/server';
import { resolvePluggyApiKey } from '@/app/api/pluggy/token/route';

interface PluggyAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface PluggyTransaction {
  id: string;
  description: string;
  descriptionRaw?: string;
  amount: number;
  date: string;
  type: 'DEBIT' | 'CREDIT';
  status?: string;
}

/**
 * POST /api/pluggy/sync
 * Fetches real accounts and transactions from Pluggy Open Finance API
 * using the personal Meu Pluggy (meu.pluggy.ai) Item ID + .env.local credentials.
 */
export async function POST(req: NextRequest) {
  const apiKey = await resolvePluggyApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        mode: 'unconfigured',
        error: 'Credenciais da Pluggy não encontradas no .env.local.',
      },
      { status: 200 }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { itemId?: string };
    const itemId = body.itemId?.trim() || process.env.PLUGGY_ITEM_ID?.trim();

    if (!itemId) {
      return NextResponse.json(
        {
          ok: false,
          mode: 'needs_item_id',
          error:
            'Informe o Item ID da sua conexão gratuita do Meu Pluggy (meu.pluggy.ai) no botão Configurar do banco.',
        },
        { status: 200 }
      );
    }

    const accountsRes = await fetch(
      `https://api.pluggy.ai/accounts?itemId=${encodeURIComponent(itemId)}`,
      {
        headers: { 'X-API-KEY': apiKey },
        cache: 'no-store',
      }
    );

    if (!accountsRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          mode: 'error',
          error:
            'Não foi possível buscar as contas deste Item ID na Pluggy. Verifique se o Item ID está correto.',
        },
        { status: 200 }
      );
    }

    const accountsData = (await accountsRes.json()) as {
      results?: PluggyAccount[];
    };
    const accounts = accountsData.results ?? [];

    const allTransactions: {
      description: string;
      amount: number;
      type: 'expense' | 'income';
      status: 'completed' | 'upcoming';
      date: string;
      accountName: string;
    }[] = [];

    let totalBalance = 0;

    for (const acc of accounts) {
      if (acc.type === 'BANK') {
        totalBalance += Number(acc.balance || 0);
      }

      const txRes = await fetch(
        `https://api.pluggy.ai/transactions?accountId=${encodeURIComponent(
          acc.id
        )}&pageSize=100`,
        {
          headers: { 'X-API-KEY': apiKey },
          cache: 'no-store',
        }
      );

      if (!txRes.ok) continue;
      const txData = (await txRes.json()) as { results?: PluggyTransaction[] };
      const txs = txData.results ?? [];

      for (const tx of txs) {
        const rawAmt = Number(tx.amount || 0);
        if (rawAmt === 0) continue;

        const isExpense = tx.type === 'DEBIT' || rawAmt < 0;
        const isoDate = (tx.date || new Date().toISOString()).slice(0, 10);

        allTransactions.push({
          description: (
            tx.descriptionRaw ||
            tx.description ||
            'Transação Open Finance'
          ).trim(),
          amount: Math.abs(rawAmt),
          type: isExpense ? 'expense' : 'income',
          status: tx.status === 'PENDING' ? 'upcoming' : 'completed',
          date: isoDate,
          accountName: acc.name,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      mode: 'live',
      totalBalance,
      accountsCount: accounts.length,
      transactions: allTransactions,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        mode: 'error',
        error: 'Erro de comunicação com a API da Pluggy.',
      },
      { status: 200 }
    );
  }
}
