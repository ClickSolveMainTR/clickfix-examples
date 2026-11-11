// End-to-end check used by CI: calls every route of the running server. With
// ../tools/stub-api.mjs as CLICKFIX_BASE_URL it needs no network or real key.
const base = process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
const call = async (path, init) => {
  const res = await fetch(base + path, init);
  const text = await res.text();
  console.log(`${init?.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 160)}`);
  if (!res.ok) throw new Error(`${path} failed with ${res.status}`);
  return JSON.parse(text);
};
const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const session = await call('/api/support-session');
if (!/^[0-9a-f]{64}$/.test(session.user_hash)) throw new Error('user_hash is not a hex HMAC');
await call('/api/contacts/sync', { method: 'POST' });
await call('/api/contacts/custom-fields', json({ custom_fields: { plan: 'pro', seats: 12 } }));
await call('/api/events', json({ name: 'seat_limit_reached', properties: { seats: 12, limit: 12 } }));
console.log('smoke ok');
