// ClickFix + Express example. Routes:
//   GET  /api/support-session          user_hash for the signed-in (fake) user
//   POST /api/contacts/sync            upsert the user as a contact, linked to their company
//   POST /api/contacts/custom-fields   set custom fields on the contact
//   POST /api/events                   write a product event to the company timeline
//   POST /webhooks/clickfix            signed webhook receiver (200 / 401)
import { createHash } from 'node:crypto';
import express, { type Request, type Response } from 'express';
import { APIError, type components } from '@getclickfix/node';
import { clickfix } from './clickfix.js';
import { supportSession, type AppUser } from './identity.js';
import { webhookRouter } from './webhooks.js';

const app = express();
// JSON parsing only for the app's own routes: the webhook route must see the raw
// bytes, because the signature is computed over them.
app.use('/api', express.json());

// Stand-in for your authentication: the "signed-in" user of every request.
const currentUser = (): AppUser => ({
  id: '1001',
  name: 'Ayşe Yılmaz',
  email: 'ayse@example.com',
  companyId: 'F-77',
  companyName: 'Acme A.Ş.',
});

// Request body of PUT /contacts/by-external-id. The published type for that
// operation is `ContactInput & Record<string, never>` (an OpenAPI `allOf` with
// additionalProperties: false), which TypeScript cannot satisfy, so the body is
// typed here and cast when passed; the wire format is unchanged.
type ContactInput = components['schemas']['ContactInput'];
const contactBody = (input: ContactInput) => input as never;

// A stable idempotency key for one logical write (the API replays the stored
// response for a repeated key, so retries are safe and distinct inputs need a new key).
const idempotencyKey = (...parts: unknown[]) =>
  createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 40);

app.get('/api/support-session', (_req, res) => {
  res.json(supportSession(currentUser()));
});

// PUT /contacts/by-external-id creates (201) or updates (200) the contact whose
// external_id is your user id. The company is looked up by its own external id
// (the value the widget sends as company.id) and linked through its uuid.
app.post('/api/contacts/sync', async (_req, res) => {
  const user = currentUser();
  let company: string | undefined;
  if (user.companyId) {
    const companies = await clickfix.request('/v1/public-api/companies', 'get', undefined, {
      query: { external_id: user.companyId, limit: 1 },
    });
    const found = (companies.data as { items?: Array<{ uuid: string }> } | undefined)?.items?.[0];
    company = found?.uuid;
  }
  const contact = await clickfix.request(
    '/v1/public-api/contacts/by-external-id',
    'put',
    contactBody({ external_id: user.id, name: user.name, email: user.email, ...(company ? { company } : {}) }),
    { idempotencyKey: idempotencyKey('contact', user.id, user.name, user.email, company) },
  );
  res.json({ linked_company: company ?? null, contact: contact.data });
});

// Custom fields are defined in the panel (Settings -> Custom fields); send them
// under the key you chose there. List fields accept an option id or label.
app.post('/api/contacts/custom-fields', async (req: Request, res: Response) => {
  const user = currentUser();
  const fields = (req.body?.custom_fields as Record<string, unknown> | undefined) ?? {
    plan: 'pro',
    seats: 12,
    renewal_date: '2027-01-31',
  };
  const contact = await clickfix.request(
    '/v1/public-api/contacts/by-external-id',
    'put',
    contactBody({ external_id: user.id, custom_fields: fields }),
    { idempotencyKey: idempotencyKey('fields', user.id, fields) },
  );
  res.json(contact.data);
});

// Product events go to the company timeline (scope events:write). The same
// idempotency_key sent twice is reported as duplicate instead of a second event.
app.post('/api/events', async (req: Request, res: Response) => {
  const user = currentUser();
  const name = String(req.body?.name ?? 'seat_limit_reached');
  const properties = (req.body?.properties as Record<string, unknown> | undefined) ?? { seats: 12, limit: 12 };
  const eventId = String(req.body?.event_id ?? `${name}-${user.companyId}-${Date.now()}`);
  const event = await clickfix.request(
    '/v1/public-api/company-events',
    'post',
    {
      external_id: user.companyId,
      contact_email: user.email,
      name,
      properties,
      source: 'api', // required by the published types (the API defaults it to "api")
      idempotency_key: eventId,
    },
    { idempotencyKey: eventId },
  );
  res.status(201).json(event.data);
});

app.use('/webhooks/clickfix', webhookRouter);

// API errors carry status, code and request id; surface them without the key.
app.use((err: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
  if (err instanceof APIError) {
    res.status(err.status).json({ error: err.code, request_id: err.requestId, details: err.details });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'INTERNAL' });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`listening on http://localhost:${port}`));
