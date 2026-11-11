'use client';
// Loads widget.js once through @getclickfix/react-widget, identifies the
// signed-in user with the server-computed user_hash, and shows the state.
import { useEffect, useMemo, useState } from 'react';
import { useClickFix, useClickFixEvent } from '@getclickfix/react-widget';
import type { SupportSession } from '@/lib/support-session';

interface Props {
  widgetId: string;
  appOrigin: string;
  signedIn: boolean;
}

// useClickFix reads `window` while rendering, so the hook must not run during
// server rendering or static prerendering: mount the widget on the client only.
export function SupportWidget(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <SupportWidgetClient {...props} /> : <p>Widget: loading</p>;
}

function SupportWidgetClient({ widgetId, appOrigin, signedIn }: Props) {
  // A stable options object: useClickFix boots once per appOrigin|widgetId.
  const options = useMemo(() => ({ appOrigin, widgetId, hideLauncher: true }), [appOrigin, widgetId]);
  const { ready, open, unread, sdk } = useClickFix(options);
  const [identity, setIdentity] = useState<'anonymous' | 'pending' | 'verified' | 'failed'>('anonymous');
  const [companyVerified, setCompanyVerified] = useState(false);
  const [lastEvent, setLastEvent] = useState('');

  // identify resolves once the API accepted the hash; the "identify" event
  // tells whether the company was bound too (its id must be inside the hash).
  useClickFixEvent('identify', (e) => {
    setIdentity(e.verified ? 'verified' : 'failed');
    setCompanyVerified(e.company_verified);
  });
  useClickFixEvent('error', (e) => setLastEvent(`error ${e.code}`));
  useClickFixEvent('conversation:started', (e) => setLastEvent(`conversation ${e.conversation_uuid}`));
  useClickFixEvent('message', (e) => setLastEvent(`reply in ${e.conversation_uuid}`));

  useEffect(() => {
    if (!ready || !signedIn) return;
    let cancelled = false;
    setIdentity('pending');
    (async () => {
      const res = await fetch('/api/support-session', { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`support-session ${res.status}`);
      const session = (await res.json()) as SupportSession;
      if (cancelled) return;
      // Only the hash reaches the browser; the secret stayed in the route handler.
      await sdk('identify', session);
      sdk('track', 'viewed_orders', { count: 3 });
    })().catch((err: unknown) => {
      if (!cancelled) {
        setIdentity('failed');
        setLastEvent(err instanceof Error ? err.message : String(err));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ready, signedIn, sdk]);

  return (
    <section>
      <p>
        Widget: {ready ? 'ready' : 'loading'} · identity: {identity}
        {identity === 'verified' ? (companyVerified ? ' (company bound)' : ' (company not bound)') : ''}
        {unread ? ` · ${unread} unread` : ''}
      </p>
      <p style={{ display: 'flex', gap: 8 }}>
        <button disabled={!ready} aria-expanded={open} onClick={() => sdk('toggle')}>
          {open ? 'Close support' : 'Open support'}
        </button>
        <button disabled={!ready} onClick={() => sdk('startConversation', 'Where is my order SP-1042?')}>
          Ask about an order
        </button>
        <button disabled={!ready} onClick={() => { sdk('reset'); setIdentity('anonymous'); }}>
          Log out (reset)
        </button>
      </p>
      {lastEvent ? <p>Last event: {lastEvent}</p> : null}
    </section>
  );
}
