import { SupportWidget } from '@/components/support-widget';
import { currentUser } from '@/lib/current-user';

export default async function Home() {
  const user = await currentUser();
  const widgetId = process.env.NEXT_PUBLIC_CLICKFIX_WIDGET_ID ?? '';
  const appOrigin = process.env.NEXT_PUBLIC_CLICKFIX_APP_ORIGIN ?? 'https://getclickfix.com';
  return (
    <main>
      <h1>Orders</h1>
      <p>
        Signed in as <strong>{user?.name ?? 'nobody'}</strong>
        {user?.companyName ? <> ({user.companyName})</> : null}.
      </p>
      {widgetId ? (
        <SupportWidget widgetId={widgetId} appOrigin={appOrigin} signedIn={Boolean(user)} />
      ) : (
        <p>Set NEXT_PUBLIC_CLICKFIX_WIDGET_ID in .env.local to load the widget.</p>
      )}
    </main>
  );
}
