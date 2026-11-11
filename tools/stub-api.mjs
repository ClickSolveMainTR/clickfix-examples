// Minimal stand-in for the ClickFix public API, for running the examples in
// this repository without network access or a real key (CI, first look).
// Adapted from the guide-example stub in ClickSolveMainTR/clickfix-sdks (MIT).
// It checks what the real API checks on these routes: Bearer key,
// Idempotency-Key on writes, JSON bodies, the API channel HMAC. It is not the
// product: run every example against https://api.getclickfix.com with your own
// keys before relying on it.
//
//   node tools/stub-api.mjs            # prints the base URL; PORT=8787 to pin it
//   CLICKFIX_API_KEY=cf_sk_example_key CLICKFIX_BASE_URL=http://127.0.0.1:8787 ...
import { createServer } from 'node:http';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const STUB = {
  apiKey: 'cf_sk_example_key',
  identitySecret: 'example-identity-secret',
  channelInstance: 'api-channel-instance',
  channelSecret: 'example-channel-secret',
  inboxUUID: '00000000-0000-4000-8000-00000000c0de',
};

const now = () => new Date().toISOString();
const contacts = new Map(); // external_id -> contact
const conversations = [];
const webhooks = [];
const companies = new Map([['F-77', { uuid: randomUUID(), name: 'Acme A.Ş.', external_id: 'F-77', domain: 'acme.com.tr' }]]);
const idempotency = new Map();

const envelope = (res, status, data, error) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'X-Request-ID': randomUUID() });
  res.end(JSON.stringify(error ? { success: false, error, meta: { request_id: randomUUID() } } : { success: true, data, meta: { request_id: randomUUID() } }));
};
const fail = (res, status, code, message) => envelope(res, status, undefined, { code, message });
const page = (items) => ({ items, total: items.length, limit: 20, offset: 0 });
const contactOf = (external_id, input = {}) => ({
  uuid: randomUUID(), name: '', email: null, phone: null, external_id, identity_state: 'self_named', verified_at: null,
  job_title: '', company: null, locale: null, timezone: null, notes: '', custom_fields: {}, blocked: false,
  channel_types: [], conversation_count: 0, last_seen_at: null, created_at: now(), updated_at: now(), ...input,
});

async function body(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

export function startStub(port = 0) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://stub');
    const raw = await body(req);
    const m = url.pathname.match(/^\/v1\/webhooks\/channels\/api\/([^/]+)$/);
    if (m) {
      // API channel: signed with the channel secret, not the API key.
      if (m[1] !== STUB.channelInstance) return fail(res, 404, 'NOT_FOUND', 'unknown instance');
      const ts = req.headers['x-clickfix-timestamp'];
      const sig = String(req.headers['x-clickfix-signature'] ?? '');
      const expected = 'sha256=' + createHmac('sha256', STUB.channelSecret).update(`${ts}.`).update(raw).digest('hex');
      if (!/^\d+$/.test(String(ts)) || Math.abs(Date.now() / 1000 - Number(ts)) > 300 || sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
        return fail(res, 401, 'UNAUTHENTICATED', 'bad signature');
      const msg = JSON.parse(raw.toString() || '{}');
      if (!msg.id || !msg.sender_id || !msg.text) return fail(res, 400, 'VALIDATION_ERROR', 'id, sender_id, text required');
      return envelope(res, 200, { received: true });
    }
    if (!url.pathname.startsWith('/v1/public-api/')) return fail(res, 404, 'NOT_FOUND', 'not public');
    if (req.headers.authorization !== `Bearer ${STUB.apiKey}`) return fail(res, 401, 'UNAUTHENTICATED', 'missing or invalid API key');
    const write = req.method !== 'GET';
    const key = req.headers['idempotency-key'];
    if (write && !key) return fail(res, 400, 'VALIDATION_ERROR', 'Invalid input; writes require Idempotency-Key');
    if (write && req.headers['content-type']?.split(';')[0] !== 'application/json') return fail(res, 400, 'VALIDATION_ERROR', 'JSON body required');
    const replayKey = write ? `${req.method} ${url.pathname} ${key}` : null;
    if (replayKey && idempotency.has(replayKey)) {
      const saved = idempotency.get(replayKey);
      if (saved.body !== raw.toString()) return fail(res, 409, 'IDEMPOTENCY_CONFLICT', 'key reused with a different request');
      return envelope(res, saved.status, saved.data);
    }
    const reply = (status, data) => { if (replayKey) idempotency.set(replayKey, { status, data, body: raw.toString() }); envelope(res, status, data); };
    let input = {};
    if (write) { try { input = JSON.parse(raw.toString() || '{}'); } catch { return fail(res, 400, 'VALIDATION_ERROR', 'invalid JSON'); } }
    const path = url.pathname.slice('/v1/public-api/'.length);
    if (req.method === 'PUT' && path === 'contacts/by-external-id') {
      if (typeof input.external_id !== 'string' || !input.external_id) return fail(res, 400, 'VALIDATION_ERROR', 'external_id required');
      const existing = contacts.get(input.external_id);
      const { external_id, ...rest } = input;
      const contact = existing ? { ...existing, ...rest, updated_at: now() } : contactOf(external_id, rest);
      contacts.set(external_id, contact);
      return reply(existing ? 200 : 201, contact);
    }
    if (req.method === 'GET' && path === 'contacts') {
      const ext = url.searchParams.get('external_id');
      return reply(200, page(ext ? [contacts.get(ext)].filter(Boolean) : [...contacts.values()]));
    }
    if (req.method === 'GET' && path === 'conversations') {
      return reply(200, page(conversations));
    }
    if (req.method === 'GET' && path === 'webhooks') {
      return reply(200, page(webhooks.map(({ secret, ...rest }) => rest)));
    }
    if (req.method === 'GET' && path === 'companies') {
      const ext = url.searchParams.get('external_id');
      return reply(200, page(ext ? [companies.get(ext)].filter(Boolean) : [...companies.values()]));
    }
    if (req.method === 'POST' && path === 'conversations') {
      if (!input.inbox_uuid || !(input.contact_uuid || input.contact_external_id)) return fail(res, 400, 'VALIDATION_ERROR', 'inbox_uuid and contact required');
      if (input.contact_external_id && !contacts.has(input.contact_external_id)) return fail(res, 404, 'NOT_FOUND', 'contact not found');
      const conversation = { uuid: randomUUID(), number: conversations.length + 1, status: 'open', subject: input.subject ?? '', contact_external_id: input.contact_external_id ?? null, created_at: now() };
      conversations.push(conversation);
      return reply(201, conversation);
    }
    if (req.method === 'POST' && /^conversations\/[^/]+\/messages$/.test(path)) {
      if (typeof input.content !== 'string' || !input.content) return fail(res, 400, 'VALIDATION_ERROR', 'content required');
      return reply(201, { uuid: randomUUID(), private: Boolean(input.private) });
    }
    if (req.method === 'POST' && path === 'company-events') {
      if (!input.name || !(input.company_uuid || input.external_id || input.domain)) return fail(res, 400, 'VALIDATION_ERROR', 'name and a company reference required');
      if (input.external_id && !companies.has(input.external_id)) return fail(res, 404, 'NOT_FOUND', 'company not found');
      return reply(201, { uuid: randomUUID(), name: input.name, duplicate: false });
    }
    if (req.method === 'PUT' && path === 'company-usage') {
      if (typeof input.score !== 'number') return fail(res, 400, 'VALIDATION_ERROR', 'score required');
      return reply(200, { score: input.score });
    }
    if (req.method === 'POST' && path === 'webhooks') {
      if (!input.name || !/^https:\/\//.test(String(input.url)) || !Array.isArray(input.events) || !input.events.length) return fail(res, 400, 'VALIDATION_ERROR', 'name, https url and events required');
      const subscription = { uuid: randomUUID(), name: input.name, url: input.url, events: input.events, enabled: input.enabled !== false, secret: 'whsec_' + randomUUID().replace(/-/g, '') };
      webhooks.push(subscription);
      return reply(201, subscription);
    }
    return fail(res, 404, 'NOT_FOUND', `no stub for ${req.method} ${url.pathname}`);
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, baseURL: `http://127.0.0.1:${server.address().port}` })));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  // The stub accepts exactly these credentials (see STUB above).
  const { baseURL } = await startStub(Number(process.env.PORT ?? 0));
  console.log(`stub listening on ${baseURL}`);
}
