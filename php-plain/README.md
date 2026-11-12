# php-plain

Plain PHP 8.1+ with [`clickfix/sdk`](https://packagist.org/packages/clickfix/sdk) (0.1.0) and Guzzle as the PSR-18 transport. No framework; for Laravel see `../laravel-app`.

| Entry point | What it shows |
|---|---|
| `php demo.php` | `UserHash::make` for the signed-in user (plus the company variant, see notes), `companies()->findByExternalId`, `contacts()->upsertByExternalId` linked to the company, `customFields()->setForContact`, `events()->track` with your own idempotency key, and paging through `conversations()->all()`. |
| `php -S 127.0.0.1:3000 -t public` | `GET /support-session` (identity for `ClickFix("identify", ...)`) and `POST /webhooks/clickfix`, which runs `Webhooks::verify` over the raw body and answers 401 on a bad or stale signature, 200 otherwise (deduplicated on `ClickFix-Webhook-Id`). |

Files: `src/Identity.php`, `src/bootstrap.php`, `demo.php`, `public/index.php`.

## Setup

```sh
composer install
cp .env.example .env    # fill CLICKFIX_API_KEY, CLICKFIX_IDENTITY_SECRET, CLICKFIX_WEBHOOK_SECRET
php demo.php
php -S 127.0.0.1:3000 -t public
```

Where the values come from: [root README](../README.md#keys-and-environment-variables). Scopes used: `contacts:read`, `contacts:write`, `companies:read`, `events:write`. Typed exceptions (`AuthenticationException`, `ForbiddenException`, `ValidationException`, `RateLimitException`, ...) all implement `ClickFix\Exception\ClickFixException`; `demo.php` prints the class and message and exits 1.

## What you will see

One JSON line per step: the session with a 64-character hex `user_hash` (the same value the Node, Go and curl examples produce for the same secret and ids), the company if `F-77` exists in your workspace, the contact with `external_id: "1001"`, the custom fields as stored, the event with `duplicate: false` (`EVENT_ID=... php demo.php` twice shows `true` the second time), and the number of conversations.

Webhook receiver: subscribe your public `https` URL and store `data.secret` as `CLICKFIX_WEBHOOK_SECRET`. Locally, sign a sample delivery with the Node script from the Express example:

```sh
WEBHOOK_URL=http://127.0.0.1:3000/webhooks/clickfix CLICKFIX_WEBHOOK_SECRET=... node ../node-express/scripts/send-test-webhook.mjs
```

## Offline, with the stub API

```sh
PORT=8787 node ../tools/stub-api.mjs
CLICKFIX_BASE_URL=http://127.0.0.1:8787 CLICKFIX_API_KEY=cf_sk_example_key CLICKFIX_IDENTITY_SECRET=example-identity-secret php demo.php
```

## Notes on the SDK (0.1.0)

- `UserHash::make($secret, $userId)` covers the user id only. The company-bound hash the guide describes (`hex(HMAC-SHA256(secret, user_id . "\n" . company_id))`) has no helper in 0.1.0, so `src/Identity.php` computes it with `hash_hmac`, matching `identityHash(secret, userId, companyId)` in Node and `IdentityCompanyHash` in Go. 0.2.0 adds `UserHash::make($secret, $userId, $companyId)` and `UserHash::forCompany(...)`.
- The resource classes cover every call used here; nothing needed a raw `request()`.
