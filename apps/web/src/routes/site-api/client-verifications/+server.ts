import { privilegesOf, requireCaller } from '$server/auth';
import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

const ACCESS_RAP = 1 << 3;
const MD5 = /^[0-9a-f]{32}$/;

// osu! asks staff, and players with two-factor on, to verify a computer before bancho lets it log in. The
// client opens /client-verifications/create?ch=<its client hash>, and approving it here marks that hardware as
// verified for the logged-in account, which only works from a login that passed two-factor.
export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const body = (await request.json().catch(() => null)) as { ch?: unknown } | null;
  // osu!'s GameBase.ClientHash: osu md5 : adapters : adapters md5 : unique id : disk id.
  const parts = typeof body?.ch === 'string' ? body.ch.split(':') : [];
  const [mac, uniqueId, diskId] = [parts[2] ?? '', parts[3] ?? '', parts[4] ?? ''];
  if (!MD5.test(mac) || !MD5.test(uniqueId) || !MD5.test(diskId)) {
    throw new Failure(400, 'site.invalid_request');
  }

  const staff = ((await privilegesOf(caller.id)) & ACCESS_RAP) !== 0;
  const twoFactor = await db.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(*) AS n FROM user_totp WHERE user_id = ${caller.id} AND confirmed = 1`;
  const enabled = Number(twoFactor[0]?.n ?? 0) > 0;
  if (!staff && !enabled) return ok({ needed: false });
  if (!enabled) throw new Failure(403, 'site.two_factor_setup_needed');
  if (!caller.mfa) throw new Failure(403, 'site.two_factor_login_needed');

  await db.$executeRaw`
    INSERT INTO hw_user (userid, mac, unique_id, disk_id, occurencies, activated)
    VALUES (${caller.id}, ${mac}, ${uniqueId}, ${diskId}, 0, 1)
    ON DUPLICATE KEY UPDATE activated = 1`;
  return ok({ needed: true });
});
