// One client per process. The API key stays on the server; the browser only
// ever receives the user_hash computed in identity.ts.
import { createClient } from '@getclickfix/node';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (copy .env.example to .env)`);
  return value;
}

export const clickfix = createClient({
  baseURL: process.env.CLICKFIX_BASE_URL ?? 'https://api.getclickfix.com',
  apiKey: required('CLICKFIX_API_KEY'),
});

export const identitySecret = (): string => required('CLICKFIX_IDENTITY_SECRET');
export const webhookSecret = (): string => required('CLICKFIX_WEBHOOK_SECRET');
