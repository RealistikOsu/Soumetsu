import bcrypt from 'bcryptjs';
import { passwordProblem } from '$lib/passwords';
import { db } from '$server/db';
import { md5 } from '$server/identity';
import { ifLazerTables } from '$server/lazer';
import { redis } from '$server/redis';
import { Failure, handle, ok } from '$server/respond';

const DAY = 24 * 60 * 60 * 1000;

async function liveKey(key: string | null | undefined) {
  const recovery = key ? await db.password_recovery.findFirst({ where: { k: key } }) : null;
  if (!recovery) return null;
  if (Date.now() - recovery.t.getTime() > DAY) {
    await db.password_recovery.deleteMany({ where: { k: recovery.k } });
    return null;
  }
  return recovery;
}

// Which account a reset key belongs to, so the page can greet them.
export const GET = handle(async ({ url }) => {
  const key = url.searchParams.get('k');
  const recovery = await liveKey(key);
  if (!recovery) throw new Failure(404, 'site.reset_key_not_found');

  const user = await db.users.findFirst({
    where: { username_safe: recovery.u },
    select: { username: true }
  });
  return ok({ username: user?.username ?? recovery.u });
});

export const POST = handle(async ({ request }) => {
  const body = (await request.json().catch(() => null)) as { k?: string; password?: string } | null;
  const recovery = await liveKey(body?.k);
  if (!recovery) throw new Failure(404, 'site.reset_key_not_found');

  const password = body?.password ?? '';
  if (await passwordProblem(password)) throw new Failure(400, 'auth.validation_error');

  const user = await db.users.findFirst({
    where: { username_safe: recovery.u },
    select: { id: true }
  });
  if (!user) throw new Failure(404, 'users.user_not_found');

  // The same scheme the API logs in with: md5 of the password, then bcrypt.
  const hash = await bcrypt.hash(md5(password), 10);
  await db.users.update({
    where: { id: user.id },
    data: { password_md5: hash, salt: '', password_version: 2 }
  });
  await redis.publish('peppy:change_pass', JSON.stringify({ user_id: user.id }));
  // Whoever had the account before the reset is logged out of the site everywhere. The API keeps its sessions
  // in the same Redis.
  const sessions = `soumetsuapi:user_sessions:${user.id}`;
  const hashes = await redis.smembers(sessions);
  await redis.del(sessions, ...hashes.map((hash) => `soumetsuapi:session:${hash}`));
  await ifLazerTables(db.$executeRaw`DELETE FROM lazer_tokens WHERE user_id = ${user.id}`);
  await db.password_recovery.deleteMany({ where: { k: recovery.k } });
  return ok();
});
