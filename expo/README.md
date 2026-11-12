# expo

An Expo (SDK 58) app with [`@getclickfix/expo`](https://www.npmjs.com/package/@getclickfix/expo): native support screens and hooks, no webview. It shows a simulated sign-in, `user_hash` from a server (the company id signed too), `identify` with the contact and company external ids, custom fields and an app event, the conversation list and the chat screen (from `@getclickfix/react-native/ui`, with attachments through `pickAttachment`), and a deep link that opens one conversation.

| File | What |
|---|---|
| `App.tsx` | `ClickFixExpoProvider`, sign-in, the screens, deep link |
| `src/config.ts` | `EXPO_PUBLIC_*` values: ClickFix app origin, widget id, app key, the user_hash server |
| `src/support-session.ts` | Fetches `{ user_id, user_hash, name, email, company }` for the signed-in user |
| `server.mjs` | A small Node server that signs `user_hash` (`GET /support-session?user_id=`); the same formula as `identityHash` in [`../node-express`](../node-express) |
| `app.json` | `scheme: clickfixexpo`, package name `com.example.clickfix`, the `expo-secure-store` plugin |

Guide: https://getclickfix.com/docs/integration-guide/expo

## Setup

1. In the panel, Web widget → Advanced → Mobile apps: create an app key for `com.example.clickfix` (change `app.json` and the key together).
2. Web widget → Security → Identity verification: the identity secret, for `server.mjs` only.

```sh
cp .env.example .env                              # app origin, widget id, app key, server URL
npm install
CLICKFIX_IDENTITY_SECRET=... npm run server       # user_hash server on :8787
npx expo start                                    # press a (Android) or i (iOS)
```

On a phone set `EXPO_PUBLIC_SUPPORT_SERVER_URL` to your machine's LAN address. `EXPO_PUBLIC_*` values are compiled into the bundle: only the public app key and widget id go there, never the identity secret or an API key.

**Expo Go:** the running bundle id is Expo Go's, not `com.example.clickfix`. Create a development app key for a name of your choice (for example `com.example.clickfix.dev`) and set `EXPO_PUBLIC_CLICKFIX_PACKAGE_NAME=com.example.clickfix.dev`. A development build (`npx expo run:android` / `run:ios`) uses the real package name.

## What you will see

"Connecting…", then the home screen with an anonymous visitor. "Sign in as Ada" fetches the signed session and identifies her together with the company `F-77`: the line changes to `Verified: ada@example.com (company signed)`. "Conversations" lists her conversations; "New conversation" shows the widget's start form and then the chat. Reply from the panel: the message arrives live (`● live`), or by polling when realtime is off. "Sign out" resets the visitor; the token in SecureStore is cleared.

Deep link: `npx uri-scheme open "clickfixexpo://conversation/<uuid>" --android` (in Expo Go `exp://<host>:8081/--/conversation/<uuid>`).

## Checks

```sh
npm run typecheck
npx expo export --platform android --output-dir /tmp/export   # Metro bundle, what CI runs
```
