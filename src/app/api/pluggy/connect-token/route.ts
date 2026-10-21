import { NextResponse } from 'next/server';

export async function POST() {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret ||
    clientId === 'your-pluggy-client-id' ||
    clientSecret === 'your-pluggy-client-secret'
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET não configurados no .env.local.',
      },
      { status: 200 }
    );
  }

  try {
    const authRes = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
      cache: 'no-store',
    });

    if (!authRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Falha ao autenticar na Pluggy. Verifique PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env.local.',
        },
        { status: 200 }
      );
    }

    const authData = (await authRes.json()) as { apiKey?: string };
    if (!authData.apiKey) {
      return NextResponse.json(
        { ok: false, error: 'API Key não retornada pela Pluggy.' },
        { status: 200 }
      );
    }

    const tokenRes = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': authData.apiKey,
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    });

    if (!tokenRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Não foi possível gerar o Connect Token na Pluggy.',
        },
        { status: 200 }
      );
    }

    const tokenData = (await tokenRes.json()) as { accessToken?: string };
    if (!tokenData.accessToken) {
      return NextResponse.json(
        { ok: false, error: 'Connect Token vazio retornado pela Pluggy.' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      connectToken: tokenData.accessToken,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'Erro de rede ao conectar com a API da Pluggy.',
      },
      { status: 200 }
    );
  }
}
