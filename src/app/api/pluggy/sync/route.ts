import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase';

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
 * Resolves a short-lived Pluggy X-API-KEY on the server using
 * PLUGGY_CLIENT_ID + PLUGGY_CLIENT_SECRET (or PLUGGY_API_KEY).
 * Never exposes credentials to the client and stores zero state on the server.
 */
async function resolvePluggyApiKey(): Promise<string | null> {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
  const directApiKey = process.env.PLUGGY_API_KEY;

  if (
    clientId &&
    clientSecret &&
    clientId !== 'your-pluggy-client-id' &&
    clientSecret !== 'your-pluggy-client-secret'
  ) {
    try {
      const authRes = await fetch('https://api.pluggy.ai/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret }),
        cache: 'no-store',
      });
      if (authRes.ok) {
        const data = (await authRes.json()) as { apiKey?: string };
        if (data.apiKey) return data.apiKey;
      }
    } catch {
      // Fall through to directApiKey if auth call fails
    }
  }

  if (directApiKey && directApiKey !== 'your-pluggy-api-key') {
    return directApiKey;
  }

  return null;
}

/**
 * POST /api/pluggy/sync
 * Protected by Supabase JWT verification when Supabase is configured,
 * and requires the caller's personal Meu Pluggy UUID `itemId`.
 */
export async function POST(req: NextRequest) {
  // 1. Verify Supabase JWT session if Supabase is configured and a Bearer token is provided
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (isSupabaseConfigured && supabaseKey && token) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return NextResponse.json(
        {
          ok: false,
          mode: 'unauthorized',
          error: 'Token de sessão inválido ou expirado.',
        },
        { status: 401 }
      );
    }

    const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL?.trim().toLowerCase();
    if (
      ownerEmail &&
      ownerEmail !== 'your-owner-email@example.com' &&
      data.user.email?.toLowerCase() !== ownerEmail
    ) {
      return NextResponse.json(
        {
          ok: false,
          mode: 'forbidden',
          error: 'Acesso restrito exclusivamente ao proprietário do Kashi.',
        },
        { status: 403 }
      );
    }
  }

  const apiKey = await resolvePluggyApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        mode: 'unconfigured',
        error: 'Credenciais da Pluggy não configuradas no ambiente.',
      },
      { status: 200 }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { itemId?: string };
    const itemId = body.itemId?.trim();

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!itemId || !uuidRegex.test(itemId)) {
      return NextResponse.json(
        {
          ok: false,
          mode: 'needs_item_id',
          error:
            'Clique em Configurar no card do banco e cole o Item ID válido (UUID) da sua conexão do Meu Pluggy.',
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
