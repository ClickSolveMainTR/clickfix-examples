# ClickFix examples

Runnable example apps for every ClickFix SDK, one folder per stack. Each one is a small, complete project that uses the published packages and walks through the server and client sides of the [integration guide](https://getclickfix.com/docs/integration-guide): identity (`user_hash`), contacts by external id, companies, custom fields, events, webhooks and the mobile webview bridge.

| Example | Language / framework | Shows | Requirements | Run |
|---|---|---|---|---|
| [`node-express`](node-express/) | TypeScript, Express 5, [`@getclickfix/node`](https://www.npmjs.com/package/@getclickfix/node) | `identityHash` (with company id), `/api/support-session`, contact upsert linked to a company, custom fields, company events, signed webhook receiver (200/401) | Node 22 | `npm install && npm run build && npm start` |
| [`nextjs-widget`](nextjs-widget/) | Next.js 15 App Router, [`@getclickfix/react-widget`](https://www.npmjs.com/package/@getclickfix/react-widget) | Widget via `useClickFix`, `user_hash` from a route handler, `identify` of a fake signed-in user with `company.id`, `track`, `reset` | Node 22 | `npm install && npm run dev` |
| [`react-native-webview`](react-native-webview/) | Expo SDK 54, [`@getclickfix/visitor-core`](https://www.npmjs.com/package/@getclickfix/visitor-core), react-native-webview | Native visitor session with a mobile app key, webview bridge (`clickfix:session`, `identify`, `track`, `open`), deep link to a conversation | Node 22, Expo dev build | `npm install && npx expo start` |
| [`flutter-webview`](flutter-webview/) | Flutter, [`clickfix_webview`](https://pub.dev/packages/clickfix_webview) | `ClickFixWebView` + `ClickFixController`: identify with company, track, open a conversation from a deep link, unread badge | Flutter 3.38+ | `flutter run --dart-define=CLICKFIX_WIDGET_ID=...` |
| [`go-server`](go-server/) | Go, [`github.com/ClickSolveMainTR/clickfix-sdks/go`](https://pkg.go.dev/github.com/ClickSolveMainTR/clickfix-sdks/go) | `IdentityHash` / `IdentityCompanyHash`, contacts, company, custom fields, events, paging conversations, webhook receiver | Go 1.26 | `go run . demo` / `go run . serve` |
| [`php-plain`](php-plain/) | PHP 8.1+, [`clickfix/sdk`](https://packagist.org/packages/clickfix/sdk) + Guzzle | `UserHash::make`, contacts, company, custom fields, `events()->track`, `Webhooks::verify` receiver | PHP 8.1, Composer | `composer install && php demo.php` |
| [`laravel-app`](laravel-app/) | Laravel 13, [`clickfix/laravel`](https://packagist.org/packages/clickfix/laravel) | `clickfix:install`, `config/clickfix.php`, `@clickfixWidget`, `ClickFix::identity`, webhook route with event listeners, artisan commands | PHP 8.3, Composer | `composer install && php artisan serve` |
| [`curl`](curl/) | bash + curl + openssl | `user_hash` with openssl, contact, company + usage, custom fields, events, conversations, webhook subscription | bash, curl, openssl | `./run-all.sh` |

Every example reads its settings from the environment (`.env.example` in each folder, never a committed secret), explains in its README what you will see against the real API, and can be run offline against [`tools/stub-api.mjs`](tools/), a small stand-in for the public API that CI uses.

## Keys and environment variables

| Variable | Where it comes from | Used by |
|---|---|---|
| `CLICKFIX_BASE_URL` | `https://api.getclickfix.com` (no `/v1` suffix) | all server examples |
| `CLICKFIX_API_KEY` | Organization → API and automations → API keys (`cf_sk_…`). Create it with the scopes the example lists: `contacts:read`, `contacts:write`, `companies:read`, `health:write`, `events:write`, `webhooks:write`. Server only. | node-express, go-server, php-plain, laravel-app, curl |
| `CLICKFIX_IDENTITY_SECRET` | Web widget → Security → Identity verification (shown once). Server only; it signs `user_hash`. | every example that identifies a user |
| `CLICKFIX_WIDGET_ID` (`NEXT_PUBLIC_…` / `EXPO_PUBLIC_…` on the client) | Web widget → Install | nextjs-widget, react-native-webview, flutter-webview, laravel-app |
| `CLICKFIX_WEBHOOK_SECRET` | `data.secret` in the response of `POST /v1/public-api/webhooks` (shown once; subscriptions are listed under Organization → API and automations → REST hook subscriptions) | webhook receivers |
| `EXPO_PUBLIC_CLICKFIX_APP_KEY` | Web widget → Advanced → Mobile apps (one key per platform and package name) | react-native-webview |

`user_hash` is `hex(HMAC-SHA256(identity_secret, user_id))`, or, when the user belongs to a company, `hex(HMAC-SHA256(identity_secret, user_id + "\n" + company_id))` sent together with `company: { id }`. The server examples all print the same hash for the same input; the client examples fetch it from one of them.

## Docs and SDKs

- Integration guide: https://getclickfix.com/docs/integration-guide (identity, external ids, custom fields, companies, events, API channel, webhooks, mobile, Laravel)
- API reference: https://getclickfix.com/docs/api-reference/conversations and sibling pages; webhooks: https://getclickfix.com/docs/webhooks
- SDK sources: [clickfix-sdks](https://github.com/ClickSolveMainTR/clickfix-sdks) (Node, visitor-core, React, Flutter, Go), [clickfix-php](https://github.com/ClickSolveMainTR/clickfix-php), [clickfix-laravel](https://github.com/ClickSolveMainTR/clickfix-laravel)
- Packages: npm `@getclickfix/node`, `@getclickfix/react-widget`, `@getclickfix/visitor-core`; pub.dev `clickfix_webview`; Packagist `clickfix/sdk`, `clickfix/laravel`; Go `github.com/ClickSolveMainTR/clickfix-sdks/go`

## Contributing

Issues and pull requests about these examples are welcome here. Bugs or missing helpers in an SDK itself belong in the [clickfix-sdks issue tracker](https://github.com/ClickSolveMainTR/clickfix-sdks/issues); each example README has a short "Notes on the SDK" section listing the workarounds it needed. CI (`.github/workflows/ci.yml`) builds, lints and smoke-tests every example against the stub API.

## Türkçe özet

Her klasör, ilgili ClickFix SDK'sının yayımlanmış paketini kullanan ve sıfırdan çalıştırılabilen bir örnek uygulamadır: `user_hash` üretimi (firma kimliğiyle birlikte), dış kimlikle kişi eşleme, firma, özel alanlar, olaylar, webhook doğrulama ve mobil webview köprüsü. Anahtarlar `.env.example` dosyalarındaki yer tutuculara yazılır; panelde nereden alınacağı yukarıdaki tabloda. Ağ erişimi olmadan denemek için `tools/stub-api.mjs` kullanılabilir. SDK'ların kendisiyle ilgili hataları `clickfix-sdks` deposunda bildirin.

MIT licensed.
