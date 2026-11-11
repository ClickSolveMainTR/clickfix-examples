# nextjs-widget

A Next.js (App Router) page that embeds the ClickFix messenger with [`@getclickfix/react-widget`](https://www.npmjs.com/package/@getclickfix/react-widget) and identifies the signed-in user with a `user_hash` computed in a route handler with [`@getclickfix/node`](https://www.npmjs.com/package/@getclickfix/node).

- `app/api/support-session/route.ts`: server only. Reads the session (a fake signed-in user from `lib/current-user.ts`), calls `identityHash(secret, userId, companyId)` and returns `{ user_id, user_hash, name, email, company: { id, name } }`. With a company id the hash signs both ids, so the widget links the contact to `company.id` and nobody can claim another company.
- `components/support-widget.tsx`: client component. `useClickFix({ appOrigin, widgetId, hideLauncher })` loads `widget.js` once and boots it; when it is `ready` the component fetches `/api/support-session`, calls `sdk('identify', session)` and `sdk('track', ...)`. `useClickFixEvent('identify', ...)` shows whether the user and the company were verified. Buttons call `toggle`, `startConversation` and `reset` (logout).
- `app/page.tsx`: server component that renders the page and passes the public widget id.

## Setup

```sh
cp .env.example .env.local    # NEXT_PUBLIC_CLICKFIX_WIDGET_ID and CLICKFIX_IDENTITY_SECRET
npm install
npm run dev                   # http://localhost:3000
```

Add `http://localhost:3000` to the widget's allowed sites in the panel (Web widget → Install) or the script refuses to boot on this origin. Where the values come from: [root README](../README.md#keys-and-environment-variables).

## What you will see

"Widget: ready · identity: verified (company bound)" and your own launcher button, since the built-in bubble is hidden (`hideLauncher: true`). Open it: the conversation belongs to contact `1001`, shown as verified in the panel with company `F-77`. "Ask about an order" opens a new conversation with the text prefilled; "Log out" calls `reset`, after which the visitor is anonymous again. `curl localhost:3000/api/support-session` shows the identity JSON; the secret never appears in the browser bundle (it has no `NEXT_PUBLIC_` prefix).

If identity shows "failed", the widget reported `WIDGET_IDENTITY_INVALID` (secret and hash do not match: regenerate after rotating the key) or `WIDGET_IDENTITY_DISABLED` (identity verification is off in the panel).

## Checks

```sh
npm run typecheck && npm run lint && npm run build
```

## Notes on the SDK (react-widget 0.1.2)

- The example uses the script hooks (`useClickFix`, `useClickFixEvent`), which drive the hosted messenger UI. The package's UI-free `createWidgetClient` works in *browser mode* only through a same-origin BFF at `/api/v1/widget/...`, which a site on its own domain does not have, so it is not used here; a custom UI from another origin would need a proxy to the widget API.
- The `ClickFixCommand` overload for `sdk('reset')` is typed as `void` while `sdk.reset()` returns a promise; the example uses the command form and updates its state synchronously.
