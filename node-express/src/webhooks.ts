// Webhook receiver: verify the signature over the raw bytes before parsing,
// answer 401 on a bad or stale signature, deduplicate on ClickFix-Webhook-Id,
// then 200 after you stored the event (ClickFix retries non-2xx up to 8 times).
import express, { Router } from 'express';
import { verifyWebhook } from '@getclickfix/node';
import { webhookSecret } from './clickfix.js';

interface WebhookPayload {
  id: string;
  event: string;
  version: number;
  occurred_at: string;
  data: Record<string, unknown>;
}

// Stand-in for a durable store; keep delivery ids for at least a day in production.
const seen = new Set<string>();

export const webhookRouter = Router();

webhookRouter.post('/', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
  const raw: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const ok = verifyWebhook(
    webhookSecret(),
    String(req.headers['clickfix-webhook-timestamp'] ?? ''),
    String(req.headers['clickfix-webhook-signature'] ?? ''),
    raw,
  );
  if (!ok) {
    res.status(401).json({ error: 'INVALID_SIGNATURE' });
    return;
  }
  const deliveryId = String(req.headers['clickfix-webhook-id'] ?? '');
  if (deliveryId && seen.has(deliveryId)) {
    res.status(200).json({ duplicate: true });
    return;
  }
  const payload = JSON.parse(raw.toString('utf8')) as WebhookPayload;
  if (deliveryId) seen.add(deliveryId);
  // Act on the event here (queue it in production); examples of useful fields:
  //   conversation.created -> payload.data.conversation_uuid
  //   message.sent         -> payload.data.conversation_uuid, payload.data.contact_external_id
  console.log(JSON.stringify({ received: payload.event, occurred_at: payload.occurred_at, delivery: deliveryId }));
  res.status(200).json({ received: payload.event });
});
