# node-express

An Express 5 server that uses [`@getclickfix/node`](https://www.npmjs.com/package/@getclickfix/node) for everything the integration guide asks of your backend:

| Route | Guide step | What it does |
|---|---|---|
| `GET /api/support-session` | Identity | Computes `user_hash` for the signed-in user with `identityHash(secret, userId, companyId)`. The company variant signs both ids, so the widget links the user to `company.id` and nobody can claim another company. |
| `POST /api/contacts/sync` | External id, company | Looks the company up by its external id (`GET /companies?external_id=`) and upserts the user as a contact with `PUT /contacts/by-external-id`, linked through the company uuid. 201 on create, 200 on update. |
| `POST /api/contacts/custom-fields` | Custom fields | Sends `custom_fields` on the same upsert. Keys are the ones you defined under Settings → Custom fields. |
| `POST /api/events` | Events | Writes a product event to the company timeline (`POST /company-events`). The same `idempotency_key` twice is reported as `duplicate`. |
| `POST /webhooks/clickfix` | Webhooks | Verifies `ClickFix-Webhook-Signature` over the raw body with `verifyWebhook`, answers 401 on a bad or stale signature, deduplicates on `ClickFix-Webhook-Id`, then 200. |

Source: `src/identity.ts` (hash), `src/server.ts` (API routes), `src/webhooks.ts` (receiver).

## Setup

Node 22 or newer.

```sh
cp .env.example .env   # fill CLICKFIX_API_KEY, CLICKFIX_IDENTITY_SECRET, CLICKFIX_WEBHOOK_SECRET
npm install
npm run build
npm start              # http://localhost:3000
```

Where the values come from is in the [root README](../README.md#keys-and-environment-variables). The API key needs the scopes `contacts:read`, `contacts:write`, `companies:read` and `events:write`.

## Run it

```sh
curl -s localhost:3000/api/support-session
curl -s -X POST localhost:3000/api/contacts/sync
curl -s -X POST localhost:3000/api/contacts/custom-fields -H 'Content-Type: application/json' -d '{"custom_fields":{"plan":"pro","seats":12}}'
curl -s -X POST localhost:3000/api/events -H 'Content-Type: application/json' -d '{"name":"seat_limit_reached","properties":{"seats":12,"limit":12}}'
```

`npm run smoke` calls all four in order. What you will see: a 64-character hex `user_hash` (paste it with `user_id: "1001"` and `company: { id: "F-77" }` into `ClickFix("identify", ...)` on a page that embeds your widget and the contact shows as verified in the panel), the created contact with its `external_id`, the contact again with `custom_fields`, and the event with `duplicate: false`. The company lookup only finds `F-77` once a widget `identify` with that `company.id` (or the panel) has created it; without it the contact is synced unlinked.

Webhooks: subscribe your public `https` URL (`POST /v1/public-api/webhooks` or the panel, see the `curl` example) and put `data.secret` from that response into `CLICKFIX_WEBHOOK_SECRET`. To exercise the receiver locally without a subscription:

```sh
npm run webhook:test   # signs a sample delivery; expect "valid: HTTP 200" then "tampered: HTTP 401"
```

## Offline, with the stub API

```sh
PORT=8787 node ../tools/stub-api.mjs
CLICKFIX_BASE_URL=http://127.0.0.1:8787 CLICKFIX_API_KEY=cf_sk_example_key \
CLICKFIX_IDENTITY_SECRET=example-identity-secret CLICKFIX_WEBHOOK_SECRET=any-value npm start
npm run smoke && npm run webhook:test
```

This is what CI runs. The stub ships one company with external id `F-77`, so the sync route links the contact to it.

## Notes on the SDK (0.2.1)

- The TypeScript body type of `PUT /contacts/by-external-id` is `ContactInput & Record<string, never>`, which no object satisfies, so `src/server.ts` casts the typed body (`contactBody`). The request on the wire is the one the guide shows. Fixed in 0.2.2 (`ContactInput & { external_id: string }`).
- `CompanyEventInput.source` is required in the published types although the API defaults it to `api`; the example sends `source: 'api'`. Optional from 0.2.2.
- There is no helper for the company lookup; the example calls `GET /v1/public-api/companies?external_id=` through `client.request`, as the guide does.
