# go-server

The server side of the integration guide in Go, with the module [`github.com/ClickSolveMainTR/clickfix-sdks/go`](https://pkg.go.dev/github.com/ClickSolveMainTR/clickfix-sdks/go) (v0.2.0).

| Command | What it shows |
|---|---|
| `go run . demo` | `IdentityHash` / `IdentityCompanyHash` for the signed-in user, company lookup by external id, contact upsert by external id linked to that company, custom fields, a company event with your own idempotency key, and listing conversations with `clickfix.Iterate` + `ListPage`. |
| `go run . serve` | `GET /api/support-session` (the identity your front end passes to `ClickFix("identify", ...)`) and `POST /webhooks/clickfix`, which verifies `ClickFix-Webhook-Signature` with `clickfix.VerifyWebhook` over the raw body, answers 401 on a bad or stale signature, deduplicates on `ClickFix-Webhook-Id` and 200 otherwise. |

Files: `identity.go` (hashes), `demo.go` (API calls), `serve.go` (HTTP).

## Setup

Go 1.26.11 or newer (the SDK's `go.mod` requires it; with `GOTOOLCHAIN=auto`, the default, Go downloads it).

```sh
cp .env.example .env     # fill in the values, then export them (e.g. `set -a; . ./.env; set +a`)
go build ./...
go run . demo
go run . serve           # http://127.0.0.1:3000
```

Where the values come from: [root README](../README.md#keys-and-environment-variables). Scopes used: `contacts:read`, `contacts:write`, `companies:read`, `events:write`.

## What you will see

`demo` prints one JSON line per step: the session with a 64-character hex `user_hash` (identical to what the Node, PHP and curl examples compute for the same secret and ids), whether company `F-77` was found, 201/200 for the contact, 200 for the custom fields, the event with `duplicate: false` (run it again with the same `EVENT_ID` and it is `true`), and the number of conversations listed.

`serve` plus a webhook subscription pointing at your public `https` URL (`POST /v1/public-api/webhooks`, see the `curl` example; put `data.secret` into `CLICKFIX_WEBHOOK_SECRET`) logs every delivery. To test the receiver without a subscription, sign a sample delivery with the Node script from the Express example:

```sh
WEBHOOK_URL=http://127.0.0.1:3000/webhooks/clickfix CLICKFIX_WEBHOOK_SECRET=... node ../node-express/scripts/send-test-webhook.mjs
# valid: HTTP 200 ... tampered: HTTP 401 ...
```

## Offline, with the stub API

```sh
PORT=8787 node ../tools/stub-api.mjs
CLICKFIX_BASE_URL=http://127.0.0.1:8787 CLICKFIX_API_KEY=cf_sk_example_key CLICKFIX_IDENTITY_SECRET=example-identity-secret go run . demo
```

## Notes on the SDK (v0.2.0)

- List responses are the generic `IntegrationEnvelope` (`data` untyped); `demo.go` decodes the company page by hand and uses `ListPage[T]` for conversations.
- `CompanyEventInput.Source` is a required pointer in the generated types although the API defaults it; the example sends `"api"`.
- `go.mod` of the module pins `go 1.26.11`, so consumers on older toolchains download that version.
