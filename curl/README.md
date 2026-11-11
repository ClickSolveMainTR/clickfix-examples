# curl

The integration guide's server-side steps as bash scripts, with nothing but `curl` and `openssl` (`jq` prettifies the output when installed). Each script sources `lib.sh`, which loads `.env` from this directory and wraps `curl` with the Bearer key and, on writes, `Content-Type: application/json` plus an `Idempotency-Key`.

| Script | Call | Scope |
|---|---|---|
| `01-user-hash.sh [user_id] [company_id]` | `user_hash` with `openssl dgst -sha256 -hmac`, with and without the company id | identity secret |
| `02-contact.sh` | `PUT /v1/public-api/contacts/by-external-id` (201 created / 200 updated), then `GET /contacts?external_id=` | `contacts:write`, `contacts:read` |
| `03-company.sh` | `GET /companies?external_id=F-77`, `PUT /company-usage` (health signal 0-100), link the contact to the company uuid | `companies:read`, `health:write`, `contacts:write` |
| `04-custom-fields.sh` | `custom_fields` on the same upsert | `contacts:write` |
| `05-events.sh` | `POST /company-events` with your event id as `idempotency_key` (`EVENT_ID=... ` twice shows `duplicate: true`) | `events:write` |
| `06-conversations.sh` | `GET /conversations?limit=&offset=`; with `INBOX_UUID` set also `POST /conversations` for the contact by external id and `POST /conversations/{uuid}/messages` | conversations |
| `07-webhook-subscription.sh` | `POST /webhooks` for `WEBHOOK_URL` (secret hidden in the output; it is shown only once), then `GET /webhooks` | `webhooks:write` |

`run-all.sh` runs them in order and skips step 7 unless `WEBHOOK_URL` is set.

## Setup

```sh
cp .env.example .env     # CLICKFIX_API_KEY, CLICKFIX_IDENTITY_SECRET, optionally WEBHOOK_URL
./run-all.sh
```

Where the values come from: [root README](../README.md#keys-and-environment-variables).

## What you will see

Each call prints the API envelope `{ "success": true, "data": ..., "meta": { "request_id": ... } }`. Lists come back as `data.items` with `total`, `limit`, `offset`. Step 1 prints two hashes: `user_hash` (user id only) and `company_user_hash` (user id and company id signed together); the second is what you send with `company: { id: "F-77" }` in `identify`. Company `F-77` exists only after a widget visitor identified with that `company.id` (or you created it in the panel); step 3 says so otherwise. Errors stop the run (`--fail-with-body`) and print the API's error body.

## Offline, with the stub API

```sh
PORT=8787 node ../tools/stub-api.mjs
CLICKFIX_BASE_URL=http://127.0.0.1:8787 CLICKFIX_API_KEY=cf_sk_example_key \
CLICKFIX_IDENTITY_SECRET=example-identity-secret INBOX_UUID=00000000-0000-4000-8000-00000000c0de \
WEBHOOK_URL=https://example.com/clickfix/webhook ./run-all.sh
```

`shellcheck -x *.sh` is what CI runs on these files.
