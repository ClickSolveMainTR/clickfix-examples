// Native visitor session with @getclickfix/visitor-core in app mode: the mobile
// app key + package name are the credential (no page origin). The token is
// persisted so the visitor survives restarts (an expired token resumes the same
// visitor for 90 days); the webview continues the same session over the bridge.
import { createVisitorClient } from '@getclickfix/visitor-core';
import * as SecureStore from 'expo-secure-store';
import { config } from './config';

const TOKEN_KEY = 'clickfix-visitor-token';

export async function createClickFixClient(screen: string) {
  const token = (await SecureStore.getItemAsync(TOKEN_KEY)) ?? undefined;
  const client = createVisitorClient({
    mode: 'app',
    baseURL: `${config.appOrigin}/api`,
    publicId: config.widgetId,
    app: { key: config.appKey, packageName: config.packageName },
    token,
    // '' after reset(): clear the stored token too.
    onToken: (next) => {
      void (next ? SecureStore.setItemAsync(TOKEN_KEY, next) : SecureStore.deleteItemAsync(TOKEN_KEY));
    },
    screen,
    language: 'tr',
  });
  await client.init(); // bootstrap: starts or resumes the visitor
  return client;
}

export type ClickFixClient = Awaited<ReturnType<typeof createClickFixClient>>;
