# flutter-webview

A Flutter app that shows the hosted ClickFix widget in a locked-down webview with [`clickfix_webview`](https://pub.dev/packages/clickfix_webview) (0.1.1) and drives it over the bridge contract v1.

- `lib/support_screen.dart`: `ClickFixController(widgetId, locale, theme, conversation, consent)` builds the embed URL (`https://getclickfix.com/widget-embed.html?widget=…`); `ClickFixWebView` loads only that origin. On `onReady` the screen fetches the identity from your backend, calls `controller.identify(ClickFixIdentity(..., company: ClickFixCompany(id: ...)))` and `controller.track(...)`; each completes with the widget's `clickfix:result`, so a bad hash surfaces as `ClickFixBridgeError` (`WIDGET_IDENTITY_INVALID`, ...). The `identify` bridge event says whether the company was bound. `onUnread`, `onClose` and `onLink` (https only, opened with `url_launcher`) complete the wiring; the app bar opens a new conversation (`controller.open(view: ClickFixView.newConversation)`) and resets on logout.
- `lib/support_session.dart`: `GET $API_URL/api/support-session` on your backend (`../node-express`, `../go-server` or `../php-plain` serve it). The `user_hash` is computed there with the identity secret; the app never sees the secret.
- `lib/main.dart`: home screen with an unread badge; `--dart-define=CLICKFIX_CONVERSATION=<uuid>` opens the support screen on that conversation, the same thing a push notification deep link would do.

## Setup

Flutter 3.38+ with a stable Dart 3.10+ (Flutter 3.47.9 was used here; see notes).

```sh
flutter pub get
flutter run \
  --dart-define=CLICKFIX_WIDGET_ID=<widget id> \
  --dart-define=API_URL=http://10.0.2.2:3000     # Android emulator -> your machine; iOS simulator: http://localhost:3000
```

`.env.example` lists every define. Where the widget id comes from: [root README](../README.md#keys-and-environment-variables).

## What you will see

Home shows the widget id, origin and backend. "Support" opens the webview: the app bar's status line goes `loading` → `ready (widget 2.x)` → `identified as 1001` → `verified, company bound`, and the conversations of contact `1001` appear. Reply from the panel and the unread badge on the home screen updates when you go back. "Log out" calls `reset()`; the next visit is an anonymous visitor. With `--dart-define=CLICKFIX_CONVERSATION=<uuid>` the widget opens straight into that conversation.

## Checks

```sh
dart format --output=none --set-exit-if-changed .
flutter analyze
flutter test      # identity mapping and the deep-link embed URL
```

## Notes on the SDK (clickfix_webview 0.1.1)

- The package requires `sdk: ^3.10.0` and `flutter: >=3.38.0`, but Flutter 3.38.0 ships Dart `3.10.0-290.4.beta`, which does not satisfy `^3.10.0`; `pub get` fails on that exact version and works on later stable releases (3.47.9 here). A constraint of `>=3.10.0-0` or a higher Flutter minimum would avoid the confusion.
- Identify and track complete with the widget's result, so no polling is needed; the screen awaits them in `onReady`.
