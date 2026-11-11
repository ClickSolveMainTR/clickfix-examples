// Two screens without a navigation library: the "app" and the support screen.
// A deep link clickfix-example://conversation/<uuid> (e.g. from a push built on
// the message.sent webhook) opens the support screen on that conversation.
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { createClickFixClient, type ClickFixClient } from './src/clickfix-client';
import { config } from './src/config';
import { SupportWebView } from './src/SupportWebView';
import { fetchSupportSession, type SupportSession } from './src/support-session';

function conversationFromUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  const { path, queryParams } = Linking.parse(url);
  const fromPath = /^conversation\/([^/]+)$/.exec(path ?? '')?.[1];
  const fromQuery = typeof queryParams?.conversation === 'string' ? queryParams.conversation : undefined;
  return fromPath ?? fromQuery;
}

export default function App() {
  const [client, setClient] = useState<ClickFixClient | null>(null);
  const [session, setSession] = useState<SupportSession | null>(null);
  const [status, setStatus] = useState('starting');
  const [unread, setUnread] = useState(0);
  const [conversations, setConversations] = useState<number | null>(null);
  const [support, setSupport] = useState<{ open: boolean; conversation?: string }>({ open: false });

  // Native session first: bootstrap, identify, list conversations (all without a webview).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await createClickFixClient('home');
      const s = await fetchSupportSession();
      await c.identify(s);
      c.track('app_opened');
      const { items } = await c.conversations();
      if (cancelled) return;
      setClient(c);
      setSession(s);
      setConversations(items.length);
      setUnread(items.reduce((n, item) => n + item.unread_count, 0));
      setStatus(`visitor ${c.getSnapshot().visitor?.id ?? '?'} identified as ${s.user_id}`);
    })().catch((err: unknown) => {
      if (!cancelled) setStatus(err instanceof Error ? err.message : String(err));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Deep links: cold start and while running.
  useEffect(() => {
    const open = (url: string | null) => {
      const conversation = conversationFromUrl(url);
      if (conversation) setSupport({ open: true, conversation });
    };
    void Linking.getInitialURL().then(open);
    const sub = Linking.addEventListener('url', (e) => open(e.url));
    return () => sub.remove();
  }, []);

  if (support.open && client) {
    return (
      <SafeAreaView style={styles.screen}>
        <SupportWebView
          client={client}
          session={session}
          conversation={support.conversation}
          onUnread={setUnread}
          onClose={() => setSupport({ open: false })}
          onStatus={setStatus}
        />
        <Button title="Back" onPress={() => setSupport({ open: false })} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="auto" />
      <View style={styles.home}>
        <Text style={styles.title}>My app</Text>
        <Text>Widget {config.widgetId || '(set EXPO_PUBLIC_CLICKFIX_WIDGET_ID)'}</Text>
        <Text>{status}</Text>
        {conversations !== null ? <Text>{conversations} conversations, {unread} unread</Text> : null}
        <Button title={unread ? `Support (${unread})` : 'Support'} disabled={!client} onPress={() => setSupport({ open: true })} />
        <Button
          title="Log out"
          disabled={!client}
          onPress={() => {
            client?.reset(); // forgets the visitor; the next init is a stranger
            setStatus('reset: anonymous');
            setConversations(null);
            setUnread(0);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  home: { flex: 1, gap: 12, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600' },
});
