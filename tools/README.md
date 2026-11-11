# tools

`stub-api.mjs` is a tiny stand-in for the ClickFix public API so every server example here can be run end to end without network access or a real key (CI uses it). It accepts the fixed credentials below and checks the same things the real API checks on these routes: the Bearer key, `Idempotency-Key` on writes, JSON bodies and the API-channel HMAC.

```sh
PORT=8787 node tools/stub-api.mjs
# then, for any example:
CLICKFIX_BASE_URL=http://127.0.0.1:8787 CLICKFIX_API_KEY=cf_sk_example_key CLICKFIX_IDENTITY_SECRET=example-identity-secret
```

Routes: `PUT /contacts/by-external-id`, `GET /contacts`, `GET /companies` (one company, external id `F-77`), `POST /conversations`, `GET /conversations`, `POST /conversations/{uuid}/messages`, `POST /company-events`, `PUT /company-usage`, `POST /webhooks`, `GET /webhooks` (all under `/v1/public-api`), plus the API channel endpoint. It never delivers webhooks; the examples ship a script that signs a sample delivery instead.

It is not the product. Run the examples against `https://api.getclickfix.com` with your own keys before relying on them.
