import { NextResponse } from 'next/server';

/**
 * Resolves a valid Pluggy X-API-KEY using PLUGGY_CLIENT_ID + PLUGGY_CLIENT_SECRET
 * or a direct PLUGGY_API_KEY from server environment variables (.env.local).
 */
export async function resolvePluggyApiKey(): Promise<string | null> {
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

export async function POST() {
  const apiKey = await resolvePluggyApiKey();

  if (!apiKey) {
    return NextResponse.json({
      mode: 'unconfigured',
      accessToken: null,
      message:
        'Configure PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET in .env.local.',
    });
  }

  try {
    const tokenRes = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({}),
      cache: 'no-store',
    });

    if (!tokenRes.ok) {
      return NextResponse.json({
        mode: 'error',
        accessToken: null,
      });
    }

    const tokenData = (await tokenRes.json()) as { accessToken?: string };

    return NextResponse.json({
      mode: 'live',
      accessToken: tokenData.accessToken ?? null,
    });
  } catch {
    return NextResponse.json({
      mode: 'error',
      accessToken: null,
    });
  }
}
