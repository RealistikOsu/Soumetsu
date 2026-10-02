import { db } from '$server/db';
import { clientIp, identityOf } from '$server/identity';
import { handle, ok } from '$server/respond';

// Whoever already has an account on this IP, or this browser, sees the multiaccount warning before registering.
export const GET = handle(async (event) => {
  const byIp = await db.$queryRaw<{ username: string }[]>`
    SELECT u.username FROM ip_user i INNER JOIN users u ON u.id = i.userid
    WHERE i.ip = ${clientIp(event)} LIMIT 1`;
  if (byIp[0]) return ok({ username: byIp[0].username });

  const token = identityOf(event.cookies);
  if (!token) return ok({ username: null });
  const byCookie = await db.$queryRaw<{ username: string }[]>`
    SELECT u.username FROM identity_tokens i INNER JOIN users u ON u.id = i.userid
    WHERE i.token = ${token} LIMIT 1`;
  return ok({ username: byCookie[0]?.username ?? null });
});
