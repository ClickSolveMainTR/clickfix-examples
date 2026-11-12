// Values of this example, from EXPO_PUBLIC_* variables (.env in this folder or
// the shell). The app key and the widget id are public identifiers; the
// identity secret never leaves server.mjs.
export const config = {
  /** The ClickFix app origin, e.g. https://getclickfix.com (the provider adds /api). */
  baseUrl: (process.env.EXPO_PUBLIC_CLICKFIX_BASE_URL ?? 'https://getclickfix.com').replace(/\/$/, ''),
  /** Public widget id (Web widget → Install). */
  widgetId: process.env.EXPO_PUBLIC_CLICKFIX_WIDGET_ID ?? '',
  /** Mobile app key (Web widget → Advanced → Mobile apps), bound to com.example.clickfix. */
  appKey: process.env.EXPO_PUBLIC_CLICKFIX_APP_KEY ?? '',
  /** Your backend that signs user_hash (server.mjs here). */
  serverUrl: (process.env.EXPO_PUBLIC_SUPPORT_SERVER_URL ?? 'http://localhost:8787').replace(/\/$/, ''),
  /** Only in Expo Go: the package name of a development app key (Expo Go's own bundle id is not yours). */
  packageName: process.env.EXPO_PUBLIC_CLICKFIX_PACKAGE_NAME,
};
