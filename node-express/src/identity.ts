// Step 1 of the integration guide: user_hash is computed on the server and
// handed to the signed-in user. With a company id the hash signs both ids
// (hex(HMAC-SHA256(secret, user_id + "\n" + company_id))) so a user cannot
// claim another company; without one it is hex(HMAC-SHA256(secret, user_id)).
import { identityHash } from '@getclickfix/node';
import { identitySecret } from './clickfix.js';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  /** The company's id in your system (sent to the widget as company.id). */
  companyId?: string;
  companyName?: string;
}

/** What GET /api/support-session returns; the browser passes it to ClickFix("identify", ...). */
export interface SupportSession {
  user_id: string;
  user_hash: string;
  name: string;
  email: string;
  company?: { id: string; name?: string };
}

export function supportSession(user: AppUser): SupportSession {
  const session: SupportSession = {
    user_id: user.id,
    user_hash: identityHash(identitySecret(), user.id, user.companyId),
    name: user.name,
    email: user.email,
  };
  if (user.companyId) session.company = { id: user.companyId, name: user.companyName };
  return session;
}
