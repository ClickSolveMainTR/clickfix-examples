// Signs a sample delivery exactly like ClickFix does and posts it to the local
// receiver twice: once with the right secret (expect 200) and once tampered (expect 401).
import { createHmac, randomUUID } from 'node:crypto';

const secret = process.env.CLICKFIX_WEBHOOK_SECRET;
if (!secret) throw new Error('CLICKFIX_WEBHOOK_SECRET is not set');
const url = process.env.WEBHOOK_URL ?? `http://localhost:${process.env.PORT ?? 3000}/webhooks/clickfix`;

const body = JSON.stringify({
  id: randomUUID(),
  event: 'conversation.created',
  version: 1,
  occurred_at: new Date().toISOString(),
  data: { conversation_uuid: randomUUID(), contact_external_id: '1001' },
});
const timestamp = String(Math.floor(Date.now() / 1000));
const sign = (key) => 'v1=' + createHmac('sha256', key).update(`${timestamp}.`).update(body).digest('hex');

for (const [label, signature] of [['valid', sign(secret)], ['tampered', sign('wrong-secret')]]) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ClickFix-Webhooks/1',
      'ClickFix-Webhook-Id': randomUUID(),
      'ClickFix-Webhook-Event': 'conversation.created',
      'ClickFix-Webhook-Timestamp': timestamp,
      'ClickFix-Webhook-Signature': signature,
    },
    body,
  });
  console.log(`${label}: HTTP ${res.status} ${await res.text()}`);
}
