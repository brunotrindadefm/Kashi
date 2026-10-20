import { NextRequest, NextResponse } from 'next/server';
import {
  parseBankNotification,
  ParsedBankNotification,
} from '@/lib/notificationParser';

interface QueuedWebhookNotification extends ParsedBankNotification {
  webhookId: string;
  receivedAt: string;
}

// In-memory queue for real-time mobile push notifications forwarded to this instance
const notificationQueue: QueuedWebhookNotification[] = [];

/**
 * POST /api/webhook/notification
 * Receives push notifications forwarded from Android (MacroDroid / Tasker / Notification Forwarder)
 * or iOS Shortcuts (Apple Pay / Bank notification automation).
 *
 * Example Payload:
 * {
 *   "text": "Compra de R$ 64,90 APROVADA em IFOOD *RESTAURANTE para o cartão...",
 *   "title": "Nubank",
 *   "secret": "optional-secret"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const configuredSecret = process.env.KASHI_WEBHOOK_SECRET;
    const body = (await req.json()) as {
      text?: string;
      message?: string;
      notification?: string;
      title?: string;
      app?: string;
      secret?: string;
    };

    if (configuredSecret) {
      const authHeader = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      const providedSecret = body.secret || authHeader;
      if (providedSecret !== configuredSecret) {
        return NextResponse.json(
          { ok: false, error: 'Unauthorized webhook secret' },
          { status: 401 }
        );
      }
    }

    const rawText = body.text || body.message || body.notification || '';
    const appOrTitle = body.title || body.app || '';

    const parsed = parseBankNotification(rawText, appOrTitle);
    if (!parsed) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Could not extract a valid R$ amount from the notification text.',
        },
        { status: 422 }
      );
    }

    const item: QueuedWebhookNotification = {
      ...parsed,
      webhookId: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      receivedAt: new Date().toISOString(),
    };

    notificationQueue.unshift(item);
    if (notificationQueue.length > 100) {
      notificationQueue.length = 100;
    }

    return NextResponse.json({
      ok: true,
      transaction: item,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }
}

/**
 * GET /api/webhook/notification
 * Drains and returns queued notifications so the Kashi frontend can ingest them automatically.
 */
export async function GET() {
  const items = [...notificationQueue];
  notificationQueue.length = 0;
  return NextResponse.json({
    ok: true,
    notifications: items,
  });
}
