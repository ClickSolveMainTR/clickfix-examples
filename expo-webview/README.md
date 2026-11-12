# expo-webview

The hosted widget in a webview. For native screens instead, see [`../expo`](../expo) (Expo) and [`../react-native`](../react-native) (bare React Native).

An Expo (SDK 54) app that talks to ClickFix twice, as the guide's mobile section describes:

1. **Natively**, with [`@getclickfix/visitor-core`](https://www.npmjs.com/package/@getclickfix/visitor-core) in *app mode*: the mobile app key and the package name are the credential (`X-ClickFix-App-Key`, `X-ClickFix-App-Package`). `src/clickfix-client.ts` bootstraps the visitor (token kept in SecureStore, `onToken` persists every change), `App.tsx` identifies the user with the `user_hash` from your backend, records `track('app_opened')` and lists conversations with unread counts for the badge.
2. **In a webview**, with the hosted widget page `https://getclickfix.com/widget-embed.html?widget=…` and the bridge contract v1 (`src/SupportWebView.tsx`): on `clickfix:ready` the app hands over the native session (`clickfix:session` with `client.getToken()`), sends `clickfix:identify`, `clickfix:track` and, for a deep link, `clickfix:open` with the conversation. Commands are built with `commandScript` (an `injectJavaScript` snippet calling `window.ClickFixBridge.receive`); messages from the widget arrive through `onMessage` and are decoded with `parseMessage`. `clickfix:session` from the widget is adopted natively (`client.adoptToken`), `unread` and `close` events update the UI, `clickfix:link` opens in the system browser only when `isSafeLink` says so.

Deep link: `clickfix-example://conversation/<uuid>` (scheme from `app.json`) opens the support screen on that conversation. Build such links from the `message.sent` webhook (`conversation_uuid`, `contact_external_id`) in your push notifications.

## Setup

```sh
cp .env.example .env    # widget id, app key, your backend URL
npm install
npx expo start          # then press a (Android) or i (iOS)
```

- `EXPO_PUBLIC_CLICKFIX_APP_KEY`: Web widget → Advanced → Mobile apps, created for the package name in `app.json` (`com.example.clickfix`; change both together).
- `EXPO_PUBLIC_API_URL`: a backend that serves `GET /api/support-session`, for example `../node-express` or `../go-server` from this repository. On a physical device use your computer's LAN address.
- Other values: [root README](../README.md#keys-and-environment-variables).

Expo Go cannot use SecureStore config plugins in every case; a development build (`npx expo run:android` / `run:ios`) is the reliable path.

## What you will see

The home screen prints the visitor id and `identified as 1001`, then the number of conversations and unread replies (native calls, no webview yet). "Support" opens the webview: the status line shows `ready (widget 2.x)` and `identify: verified, company bound`, and the conversation list is the same one the native call returned, because the session was handed over. Reply from the panel: the unread badge on the home screen updates through the `unread` bridge event. "Log out" calls `reset()`; the next start is an anonymous visitor.

Test the deep link on Android with:

```sh
adb shell am start -a android.intent.action.VIEW -d "clickfix-example://conversation/<uuid>"
```

## Checks

```sh
npm run typecheck
npx expo export --platform android --output-dir /tmp/export   # Metro bundle, what CI runs
```

## Notes on the SDK (visitor-core 0.1.1)

- App mode needs the ClickFix *app* origin plus `/api` as `baseURL` (`https://getclickfix.com/api`), the same origin that serves `widget-embed.html`; the public API host `api.getclickfix.com` is for server keys only. The visitor-core README and the guide say so from 0.2.0 on.
- In 0.1.1 the payloads of `clickfix:event` are typed `unknown`, so this example narrows `unread` and `identify` itself. visitor-core 0.2.0 types them per event (`m.event === 'unread'` gives `m.payload.count`); the casts go away when the example moves to that release.
- There is no webview component in the packages; the wiring in `src/SupportWebView.tsx` is about 60 lines and can be copied as is. From 0.2.0, `@getclickfix/react-native` and `@getclickfix/expo` re-export the same bridge helpers.
