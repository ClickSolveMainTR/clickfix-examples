# react-native

A bare React Native (0.88) app with [`@getclickfix/react-native`](https://www.npmjs.com/package/@getclickfix/react-native): native support screens and hooks, no webview and no Expo. The visitor token lives in the Keychain / Keystore (`react-native-keychain`), the user is identified with a `user_hash` from a server (the company id signed too), the conversation list and the chat screen come from `@getclickfix/react-native/ui`, and `clickfixrn://conversation/<uuid>` opens one conversation.

| File | What |
|---|---|
| `App.tsx` | `ClickFixProvider` with `keychainStorage`, sign-in, the screens, deep link |
| `src/config.ts` | ClickFix app origin, widget id, app key, package name, the user_hash server |
| `src/support-session.ts` | Fetches `{ user_id, user_hash, name, email, company }` for the signed-in user |
| `server.mjs` | A small Node server that signs `user_hash` (`GET /support-session?user_id=`) |
| `android/`, `ios/` | The React Native 0.88 template with application id / bundle id `com.example.clickfix` and the `clickfixrn` URL scheme (`AndroidManifest.xml`, `Info.plist`) |

Guide: https://getclickfix.com/docs/integration-guide/react-native. Using Expo? See [`../expo`](../expo).

## Setup

1. In the panel, Web widget → Advanced → Mobile apps: create an app key for `com.example.clickfix` (Android and iOS share the id here).
2. Put the widget id and the app key into `src/config.ts`. `baseUrl` is the ClickFix app origin (`https://getclickfix.com`), not `api.getclickfix.com`.
3. Web widget → Security → Identity verification: the identity secret, for `server.mjs` only.

```sh
npm install
(cd ios && bundle install && bundle exec pod install)   # iOS only
CLICKFIX_IDENTITY_SECRET=... npm run server              # user_hash server on :8787
npm run android                                          # or: npm run ios
```

The Android emulator reaches the server as `10.0.2.2:8787` (already set in `src/config.ts`); a phone needs your machine's LAN address.

## What you will see

"Connecting…", then the home screen with an anonymous visitor. "Sign in as Ada" identifies her with the company `F-77` and the line changes to `Verified: ada@example.com (company signed)`. "Conversations" and "New conversation" open the native screens; replies from the panel arrive live (`● live`) or by polling. "Sign out" resets the visitor and removes the token from the Keychain. Restart the app while signed in: the same visitor and conversations come back.

Deep link on Android: `adb shell am start -a android.intent.action.VIEW -d "clickfixrn://conversation/<uuid>"`; on the iOS simulator: `xcrun simctl openurl booted "clickfixrn://conversation/<uuid>"`.

## Checks

```sh
npm run typecheck
npm run bundle:android      # Metro production bundle, what CI runs (no Android SDK needed)
```
