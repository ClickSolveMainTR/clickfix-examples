# laravel-app

A Laravel 13 application wired to ClickFix with [`clickfix/laravel`](https://packagist.org/packages/clickfix/laravel) (0.1.0, which wraps `clickfix/sdk`).

What the package gives you and where the example uses it:

| Feature | Where |
|---|---|
| `php artisan clickfix:install` | Published `config/clickfix.php`, the `CLICKFIX_*` keys in `.env.example` |
| `@clickfixWidget($user, [...])` Blade directive | `resources/views/support.blade.php`: boots `widget.js` and identifies the user with a server-signed `user_hash` |
| `ClickFix::identity($user)` for SPAs / mobile apps | `GET /support-session` in `routes/web.php` (via `App\Support\ClickFixIdentity`) |
| `ProvidesClickFixIdentity` contract | `app/Models/User.php` returns `user_id`, `name`, `email` and `company: { id, name }` |
| Signed webhook route `POST /clickfix/webhook` + one Laravel event per ClickFix event | `app/Listeners/HandleClickFixWebhook.php`, registered in `AppServiceProvider` for `WebhookReceived`, `ConversationCreated`, `MessageReceived` |
| Tests | `tests/Feature/ClickFixTest.php`: widget boot, company-bound hash, accepted and rejected deliveries |

## Setup

PHP 8.3+, Composer.

```sh
composer install
cp .env.example .env && php artisan key:generate
php artisan clickfix:install      # adds CLICKFIX_* to .env and prints the webhook URL (already done for .env.example)
# fill CLICKFIX_API_KEY, CLICKFIX_WIDGET_ID, CLICKFIX_IDENTITY_SECRET, CLICKFIX_WEBHOOK_SECRET in .env
php artisan clickfix:check        # verifies the key, widget id, secrets and the webhook route
php artisan serve                 # http://localhost:8000
```

Where the values come from: [root README](../README.md#keys-and-environment-variables). Add `http://localhost:8000` to the widget's allowed sites.

## Artisan commands

| Command | Use |
|---|---|
| `clickfix:install [--force] [--no-env]` | Publish the config, add `.env` keys, generate a webhook secret, print the webhook URL |
| `clickfix:check` | Call `GET /v1/public-api/contacts?limit=1` with the key, check widget id, identity secret, webhook secret length (32+) and that the webhook route is public `https` (set `APP_URL`). Exit 1 on failure |
| `clickfix:user-hash {user} [--raw] [--json]` | The user-only `user_hash` for a model key (or any id with `--raw`), to debug `WIDGET_IDENTITY_INVALID` |
| `clickfix:webhook:secret [--write]` | Generate a 64-hex secret; `--write` stores it as `CLICKFIX_WEBHOOK_SECRET` |
| `clickfix:sync:contacts [--id=*] [--since=] [--chunk=] [--dry-run]` | Upsert the `users` table into ClickFix contacts by external id (`clickfix.contacts` config maps columns and custom fields) |

## What you will see

`/` renders the orders page; the status line reads "Widget: ready · identity verified (company bound)" and the custom launcher button opens the messenger for contact `1001` of company `F-77`. `/support-session` returns the same identity as JSON. Subscribe `https://<your host>/clickfix/webhook` (see the `curl` example or the panel) and set `data.secret` as `CLICKFIX_WEBHOOK_SECRET`; every delivery is logged by the listener (`storage/logs/laravel.log`: `clickfix webhook`, `message received`). Retries with the same `ClickFix-Webhook-Id` are acknowledged without firing the events again (cache-based, `clickfix.webhook.dedupe_ttl`).

To exercise the receiver without a subscription:

```sh
WEBHOOK_URL=http://127.0.0.1:8000/clickfix/webhook CLICKFIX_WEBHOOK_SECRET=<same as .env> node ../node-express/scripts/send-test-webhook.mjs
# valid: HTTP 200 {"ok":true} · tampered: HTTP 401 {"error":{"code":"WEBHOOK_SIGNATURE_INVALID",...}}
```

## Checks

```sh
composer validate --strict
vendor/bin/pint --test
php artisan test
```

Offline: `PORT=8787 node ../tools/stub-api.mjs` and `CLICKFIX_BASE_URL=http://127.0.0.1:8787 CLICKFIX_API_KEY=cf_sk_example_key php artisan clickfix:check` (the webhook-secret check wants 32+ characters).

## Notes on the SDK (clickfix/laravel 0.1.0)

- `ClickFix::identity()` and `@clickfixWidget` always sign the user id only, even when `toClickFixIdentity()` returns `company.id`; the company then stays a hint (`company_verified: false`). `App\Support\ClickFixIdentity` recomputes `user_hash` as `hex(HMAC-SHA256(secret, user_id . "\n" . company_id))` for `/support-session`, and the page re-identifies with it after boot. clickfix/laravel 0.2.0 signs `company.id` in `identity()` and `@clickfixWidget` and adds `ClickFix::userHash($user, $companyId)`, which removes the workaround.
- The package requires `guzzlehttp/guzzle ^7.8`; a fresh Laravel 13 skeleton locks Guzzle 8, so `composer require clickfix/laravel -W` (downgrade allowed) is needed there. Laravel 10 to 12 install it directly. 0.2.0 allows `guzzlehttp/guzzle ^7.8 || ^8.0`.
