import { config } from '$server/config';
import { db } from '$server/db';
import { clientIp, setIdentity } from '$server/identity';
import { Failure, handle, ok } from '$server/respond';

// Logging in to an unverified account sends the player to the verify page. The API has already said the
// password was right (account_pending), and only then does this hand back the ID and remember the browser.
export const POST = handle(async (event) => {
  const body = (await event.request.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;
  if (!body?.username || !body.password) throw new Failure(400, 'site.invalid_request');

  const login = await fetch(`${config.apiUrl}/api/v2/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Real-IP': clientIp(event) },
    body: JSON.stringify({ username: body.username, password: body.password })
  });
  const result = (await login.json().catch(() => ({ data: null }))) as { data: unknown };
  if (result.data !== 'auth.account_pending') throw new Failure(403, 'site.forbidden');

  const safe = body.username.trim().toLowerCase().replaceAll(' ', '_');
  const user = await db.users.findFirst({
    where: body.username.includes('@') ? { email: body.username.trim() } : { username_safe: safe },
    select: { id: true }
  });
  if (!user) throw new Failure(404, 'auth.user_not_found');

  await setIdentity(user.id, event.cookies);
  return ok(user.id);
});
