// The identity your backend returns for the signed-in user. user_hash is an HMAC
// computed with the widget's identity secret on the server (server.mjs here, or the
// node-express, go-server, php-plain and laravel-app examples); the secret never
// ships in the app.
import { config } from './config';

export interface SupportSession {
  user_id: string;
  user_hash: string;
  name: string;
  email: string;
  company?: { id: string; name: string };
}

export async function fetchSupportSession(userId: string): Promise<SupportSession> {
  // A real app sends its own auth header or cookie; the server picks the user from it.
  const res = await fetch(`${config.serverUrl}/support-session?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`support-session ${res.status}`);
  return (await res.json()) as SupportSession;
}
