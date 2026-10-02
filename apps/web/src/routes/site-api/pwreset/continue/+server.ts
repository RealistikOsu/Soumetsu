import bcrypt from 'bcryptjs';
import { passwordProblem } from '$lib/passwords';
import { db } from '$server/db';
import { md5 } from '$server/identity';
import { redis } from '$server/redis';
import { Failure, handle, ok } from '$server/respond';

// Which account a reset key belongs to, so the page can greet them.
export const GET = handle(async ({ url }) => {
  const key = url.searchParams.get('k');
  const recovery = key ? await db.password_recovery.findFirst({ where: { k: key } }) : null;
  if (!recovery) throw new Failure(404, 'site.reset_key_not_found');

  const user = await db.users.findFirst({
    where: { username_safe: recovery.u },
    select: { username: true }
  });
  return ok({ username: user?.username ?? recovery.u });
});

export const POST = handle(async ({ request }) => {
  const body = (await request.json().catch(() => null)) as { k?: string; password?: string } | null;
  const recovery = body?.k ? await db.password_recovery.findFirst({ where: { k: body.k } }) : null;
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
  await db.password_recovery.deleteMany({ where: { k: recovery.k } });
  return ok();
});
