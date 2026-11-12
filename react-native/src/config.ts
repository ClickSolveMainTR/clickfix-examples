// Values of this example. Edit them here (a bare React Native app has no
// built-in .env; use react-native-config or your build system in a real app).
// The app key and the widget id are public identifiers; the identity secret
// never leaves server.mjs.
import { Platform } from 'react-native';

export const config = {
  /** The ClickFix app origin, e.g. https://getclickfix.com (the provider adds /api). Not api.getclickfix.com. */
  baseUrl: 'https://getclickfix.com',
  /** Public widget id (Web widget → Install). */
  widgetId: 'replace_me',
  /** Mobile app key (Web widget → Advanced → Mobile apps), created for packageName below. */
  appKey: 'replace_me',
  /** Bundle id (iOS) and application id (Android) of this app, as registered with the key. */
  packageName: 'com.example.clickfix',
  /**
   * Your backend that signs user_hash (server.mjs here, port 8787). The Android
   * emulator reaches the host as 10.0.2.2; on a phone use your machine's LAN address.
   */
  serverUrl: Platform.OS === 'android' ? 'http://10.0.2.2:8787' : 'http://localhost:8787',
};
