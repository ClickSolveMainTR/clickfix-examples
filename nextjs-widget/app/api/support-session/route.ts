// Route handler (server only): computes user_hash with the identity secret and
// returns the identity the client passes to ClickFix("identify", ...).
// With a company id the hash signs user_id and company_id together
// (hex(HMAC-SHA256(secret, user_id + "\n" + company_id))), so the widget binds
// the contact to company.id and nobody can claim another company.
import { identityHash } from '@getclickfix/node';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/current-user';
import type { SupportSession } from '@/lib/support-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const secret = process.env.CLICKFIX_IDENTITY_SECRET;
  if (!secret) return NextResponse.json({ error: 'CLICKFIX_IDENTITY_SECRET is not set' }, { status: 503 });

  const session: SupportSession = {
    user_id: user.id,
    user_hash: identityHash(secret, user.id, user.companyId),
    name: user.name,
    email: user.email,
    ...(user.companyId ? { company: { id: user.companyId, name: user.companyName } } : {}),
  };
  return NextResponse.json(session, { headers: { 'Cache-Control': 'private, no-store' } });
}
