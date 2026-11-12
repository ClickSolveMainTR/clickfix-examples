// The server side of the example: signs user_hash for the signed-in user and
// answers GET /support-session?user_id=... The same formula ships as
// `identityHash` in @getclickfix/node (see ../node-express). Run:
//   CLICKFIX_IDENTITY_SECRET=... node server.mjs      (port 8787)
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';

const secret = process.env.CLICKFIX_IDENTITY_SECRET;
if (!secret) {
  console.error('CLICKFIX_IDENTITY_SECRET is required (Web widget → Security → Identity verification)');
  process.exit(1);
}

/** hex(HMAC-SHA256(secret, user_id)), or with a company hex(HMAC-SHA256(secret, user_id + "\n" + company_id)). */
export const identityHash = (userId, companyId) =>
  createHmac('sha256', secret).update(companyId ? `${userId}\n${companyId}` : userId).digest('hex');

// A real app reads the user from its own session; here the client names it.
const users = {
  1001: { name: 'Ada Lovelace', email: 'ada@example.com', company: { id: 'F-77', name: 'Example Ltd' } },
  1002: { name: 'Alan Turing', email: 'alan@example.com' },
};

const port = Number(process.env.PORT ?? 8787);
createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  res.setHeader('Content-Type', 'application/json');
  if (url.pathname !== '/support-session') return res.writeHead(404).end('{"error":"not found"}');
  const userId = url.searchParams.get('user_id') ?? '';
  const user = users[userId];
  if (!user) return res.writeHead(404).end('{"error":"unknown user"}');
  res.end(
    JSON.stringify({
      user_id: userId,
      user_hash: identityHash(userId, user.company?.id),
      name: user.name,
      email: user.email,
      company: user.company,
    }),
  );
}).listen(port, () => console.log(`support-session server listening on http://localhost:${port}`));
