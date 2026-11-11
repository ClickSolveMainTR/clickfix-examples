// The identity your backend returns for the signed-in user. user_hash is an
// HMAC computed with the widget's identity secret on the server (see the
// node-express, go-server or php-plain examples); the secret never ships in the app.
import type { IdentifyInput } from '@getclickfix/visitor-core';
import { config } from './config';

export type SupportSession = IdentifyInput;

export async function fetchSupportSession(): Promise<SupportSession> {
  // Add your own auth header/cookie here.
  const res = await fetch(`${config.apiUrl}/api/support-session`);
  if (!res.ok) throw new Error(`support-session ${res.status}`);
  return (await res.json()) as SupportSession;
}
