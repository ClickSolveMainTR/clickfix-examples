// The hosted widget page inside a webview, driven over the bridge contract v1:
//   app -> widget: window.ClickFixBridge.receive(json) via injectJavaScript
//                  (commandScript from visitor-core builds the snippet)
//   widget -> app: window.ReactNativeWebView.postMessage(json) -> onMessage -> parseMessage
// The native session started in clickfix-client.ts is handed over with
// clickfix:session, so the webview shows the same visitor and conversations.
import { commandScript, isSafeLink, parseMessage, type BridgeCommand, type BridgeMessage } from '@getclickfix/visitor-core';
import * as Linking from 'expo-linking';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { ClickFixClient } from './clickfix-client';
import { config } from './config';
import type { SupportSession } from './support-session';

interface Props {
  client: ClickFixClient;
  session: SupportSession | null;
  /** Deep link: open this conversation as soon as the widget is ready. */
  conversation?: string;
  onUnread?: (count: number) => void;
  onClose?: () => void;
  onStatus?: (text: string) => void;
}

export function SupportWebView({ client, session, conversation, onUnread, onClose, onStatus }: Props) {
  const webview = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const nextId = useRef(0);

  const uri = useMemo(() => {
    const url = new URL(`${config.appOrigin}/widget-embed.html`);
    url.searchParams.set('widget', config.widgetId);
    url.searchParams.set('locale', 'tr');
    url.searchParams.set('theme', 'auto');
    url.searchParams.set('consent', '1'); // only once your app collected consent
    if (conversation) url.searchParams.set('conversation', conversation);
    return url.toString();
  }, [conversation]);

  const send = useCallback((command: BridgeCommand) => {
    const id = command.id ?? `rn${++nextId.current}`;
    webview.current?.injectJavaScript(commandScript({ ...command, id }));
    return id;
  }, []);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message: BridgeMessage | null = parseMessage(event.nativeEvent.data);
      if (!message) return; // not a widget message
      switch (message.type) {
        case 'clickfix:ready':
          // 1. continue the native visitor session in the webview
          send({ type: 'clickfix:session', token: client.getToken() });
          // 2. prove who the user is (the hash came from your server)
          if (session) send({ type: 'clickfix:identify', user: session });
          // 3. app context the agent will see with the next message
          send({ type: 'clickfix:track', name: 'app_screen', properties: { screen: 'support' } });
          if (conversation) send({ type: 'clickfix:open', conversation });
          onStatus?.(`ready (widget ${message.sdk_version})`);
          break;
        case 'clickfix:session':
          // The widget's token after ready/identify/reset; keep native calls on the same visitor.
          client.adoptToken(message.token);
          break;
        case 'clickfix:result':
          if (!message.ok) onStatus?.(`command ${message.id} failed: ${message.error?.code ?? 'unknown'}`);
          break;
        case 'clickfix:event':
          if (message.event === 'unread') onUnread?.((message.payload as { count: number }).count);
          if (message.event === 'close') onClose?.();
          if (message.event === 'identify') {
            const p = message.payload as { verified: boolean; company_verified: boolean };
            onStatus?.(`identify: ${p.verified ? 'verified' : 'not verified'}, company ${p.company_verified ? 'bound' : 'not bound'}`);
          }
          break;
        case 'clickfix:link':
          // Only https links may leave the webview; never hand them to a deep-link handler.
          if (isSafeLink(message.url)) void Linking.openURL(message.url);
          break;
      }
    },
    [client, session, conversation, send, onUnread, onClose, onStatus],
  );

  return (
    <View style={styles.container}>
      <WebView
        ref={webview}
        source={{ uri }}
        originWhitelist={[config.appOrigin]}
        // Stay on the ClickFix origin; everything else is refused (links arrive as clickfix:link).
        onShouldStartLoadWithRequest={(req) => req.url.startsWith(config.appOrigin + '/')}
        onMessage={onMessage}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess={false}
        mixedContentMode="never"
        setSupportMultipleWindows={false}
        style={styles.webview}
      />
      {loading ? <ActivityIndicator style={styles.spinner} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  spinner: { position: 'absolute', top: 24, alignSelf: 'center' },
});
