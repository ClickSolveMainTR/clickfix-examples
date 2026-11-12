// ClickFix in an Expo app: sign in (simulated), identify the visitor with a
// server-signed user_hash (the company id signed too), list conversations,
// chat with attachments, and open one conversation from a deep link
// (clickfixexpo://conversation/<uuid>; in Expo Go exp://<host>/--/conversation/<uuid>).
// The screens come from @getclickfix/react-native/ui; everything else is hooks.
import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  ClickFixExpoProvider,
  pickAttachment,
  useClickFix,
  useExpoDeepLinkConversation,
  useVisitor,
  VisitorError,
} from '@getclickfix/expo';
import { ChatScreen, ConversationListScreen } from '@getclickfix/react-native/ui';
import { config } from './src/config';
import { fetchSupportSession, type SupportSession } from './src/support-session';

type Screen = { name: 'home' } | { name: 'list' } | { name: 'chat'; conversation: string | null };

export default function App() {
  return (
    <ClickFixExpoProvider
      appKey={config.appKey}
      widgetId={config.widgetId}
      baseUrl={config.baseUrl}
      packageName={config.packageName} // undefined: taken from app.json (set it in Expo Go)
      language="en"
      screen="home"
      // Lets identify({ userId }) omit userHash: the provider asks your server.
      getUserHash={async (userId) => (await fetchSupportSession(userId)).user_hash}
      onError={(err) => console.warn('ClickFix', err instanceof VisitorError ? `${err.status} ${err.code}` : err)}
    >
      <Main />
    </ClickFixExpoProvider>
  );
}

function Main() {
  const { status, error, connected } = useClickFix();
  const visitor = useVisitor();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [user, setUser] = useState<SupportSession | null>(null);
  const [busy, setBusy] = useState(false);
  const link = useExpoDeepLinkConversation();

  // A deep link opens its conversation (the token in SecureStore keeps it the same visitor).
  useEffect(() => {
    if (link.conversation && status === 'ready') {
      setScreen({ name: 'chat', conversation: link.conversation });
      link.clear();
    }
  }, [link, status]);

  // The agent sees which screen the visitor was on with the next message.
  useEffect(() => {
    visitor.setScreen(screen.name === 'chat' ? `chat/${screen.conversation ?? 'new'}` : screen.name);
  }, [screen, visitor]);

  // Simulated sign-in: the server returns the signed session; identify sends it with the external ids.
  const signIn = async (userId: string) => {
    setBusy(true);
    try {
      const session = await fetchSupportSession(userId);
      await visitor.identify({
        userId: session.user_id,
        userHash: session.user_hash,
        name: session.name,
        email: session.email,
        company: session.company, // company.id is signed into user_hash
      });
      await visitor.setAttributes({ plan: 'pro', app_version: '1.0.0' });
      visitor.track('signed_in', { user_id: session.user_id });
      setUser(session);
    } finally {
      setBusy(false);
    }
  };
  const signOut = async () => {
    await visitor.reset();
    setUser(null);
    setScreen({ name: 'home' });
  };

  if (status === 'loading' || status === 'idle') return <Centered text="Connecting…" />;
  if (status === 'error')
    return <Centered text={`Could not connect: ${error instanceof VisitorError ? `${error.status} ${error.code}` : String(error)}`} />;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="auto" />
      <View style={styles.bar}>
        <Pressable onPress={() => setScreen(screen.name === 'chat' ? { name: 'list' } : { name: 'home' })} disabled={screen.name === 'home'}>
          <Text style={styles.link}>{screen.name === 'home' ? ' ' : '‹ Back'}</Text>
        </Pressable>
        <Text style={styles.title}>{user ? user.name : 'Visitor'}</Text>
        <Text style={styles.dot}>{connected ? '● live' : '○ polling'}</Text>
      </View>
      {screen.name === 'home' ? (
        <View style={styles.home}>
          <Text style={styles.h1}>ClickFix Expo example</Text>
          <Text style={styles.p}>
            {visitor.verified
              ? `Verified: ${visitor.visitor?.contact?.email ?? ''}${visitor.visitor?.company_verified ? ' (company signed)' : ''}`
              : 'Anonymous visitor. Signing in asks the server for user_hash and sends it with identify.'}
          </Text>
          {user ? (
            <Button title="Sign out" onPress={() => void signOut()} />
          ) : (
            <>
              <Button title={busy ? '…' : 'Sign in as Ada (with a company)'} onPress={() => void signIn('1001')} disabled={busy} />
              <Button title={busy ? '…' : 'Sign in as Alan'} onPress={() => void signIn('1002')} disabled={busy} />
            </>
          )}
          <Button title="Conversations" onPress={() => setScreen({ name: 'list' })} />
          <Button title="New conversation" onPress={() => setScreen({ name: 'chat', conversation: null })} />
        </View>
      ) : screen.name === 'list' ? (
        <ConversationListScreen
          onOpen={(c) => setScreen({ name: 'chat', conversation: c.uuid })}
          onNew={() => setScreen({ name: 'chat', conversation: null })}
        />
      ) : (
        <ChatScreen
          conversation={screen.conversation}
          onCreated={(uuid) => setScreen({ name: 'chat', conversation: uuid })}
          pickFile={() => pickAttachment({ mimeTypes: ['image/*', 'application/pdf'], maxBytes: 10 * 1024 * 1024 })}
          requireConsent
        />
      )}
    </SafeAreaView>
  );
}

function Centered({ text }: { text: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.p}>{text}</Text>
    </View>
  );
}

function Button({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.button, (pressed || disabled) && styles.pressed]}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
  },
  title: { fontWeight: '600', color: '#0f172a' },
  dot: { color: '#64748b', fontSize: 12 },
  link: { color: '#2563eb', fontSize: 16 },
  home: { padding: 24, gap: 12 },
  h1: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  p: { color: '#334155', fontSize: 15, lineHeight: 22 },
  button: { backgroundColor: '#2563eb', borderRadius: 12, padding: 14, alignItems: 'center' },
  pressed: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
