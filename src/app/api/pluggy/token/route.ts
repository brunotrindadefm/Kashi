import { NextResponse } from 'next/server';

/**
 * Pluggy Open Finance Brasil Connect Token endpoint.
 * When PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET are set, fetches an official
 * Pluggy Connect token from https://api.pluggy.ai; otherwise returns simulator status.
 */
export async function POST() {
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (
    !clientId ||
    !clientSecret ||
    clientId === 'your-pluggy-client-id' ||
    clientSecret === 'your-pluggy-client-secret'
  ) {
    return NextResponse.json({
      mode: 'simulator',
      accessToken: null,
      message: 'Pluggy running in local Open Finance simulator mode.',
    });
  }

  try {
    const authRes = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    });

    if (!authRes.ok) {
      return NextResponse.json(
        { mode: 'simulator', error: 'Failed to authenticate with Pluggy API' },
        { status: 200 }
      );
    }

    const { apiKey } = (await authRes.json()) as { apiKey: string };

    const tokenRes = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({}),
    });

    const tokenData = (await tokenRes.json()) as { accessToken?: string };

    return NextResponse.json({
      mode: 'live',
      accessToken: tokenData.accessToken ?? null,
    });
  } catch {
    return NextResponse.json({
      mode: 'simulator',
      accessToken: null,
    });
  }
}
