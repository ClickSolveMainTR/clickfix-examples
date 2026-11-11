// All values come from .env (EXPO_PUBLIC_* is inlined into the app bundle).
import Constants from 'expo-constants';

export const config = {
  widgetId: process.env.EXPO_PUBLIC_CLICKFIX_WIDGET_ID ?? '',
  appOrigin: (process.env.EXPO_PUBLIC_CLICKFIX_APP_ORIGIN ?? 'https://getclickfix.com').replace(/\/$/, ''),
  appKey: process.env.EXPO_PUBLIC_CLICKFIX_APP_KEY ?? '',
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  /** The app's bundle id / application id, which the mobile app key was created for. */
  packageName:
    Constants.expoConfig?.android?.package ?? Constants.expoConfig?.ios?.bundleIdentifier ?? 'com.example.clickfix',
};
