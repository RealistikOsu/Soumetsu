import { randomBytes } from 'node:crypto';
import { config } from '$server/config';
import { captchaPasses } from '$server/captcha';
import { db } from '$server/db';
import { clientIp } from '$server/identity';
import { sendMail } from '$server/mail';
import { Failure, handle, ok } from '$server/respond';

const SAFE = (name: string) => name.trim().toLowerCase().replaceAll(' ', '_');

export const POST = handle(async (event) => {
  const body = (await event.request.json().catch(() => null)) as {
    username?: string;
    captcha?: string;
  } | null;
  const identifier = body?.username?.trim();
  if (!identifier) throw new Failure(400, 'site.invalid_request');

  const user = await db.users.findFirst({
    where: identifier.includes('@') ? { email: identifier } : { username: identifier },
    select: { username: true, email: true }
  });
  if (!user) throw new Failure(404, 'users.user_not_found');
  if (!(await captchaPasses(body?.captcha, clientIp(event)))) {
    throw new Failure(400, 'auth.invalid_captcha');
  }

  const key = randomBytes(25).toString('hex');
  await db.password_recovery.create({ data: { k: key, u: SAFE(user.username) } });
  await sendMail(
    user.email,
    'RealistikOsu - Password recovery!',
    `Hey ${user.username}!<br><br>We've heard you forgot your RealistikOsu account password, it can happen to the best of us. You can change it by <a href='${config.appBaseUrl}/pwreset/continue?k=${key}'>clicking here</a>!<br><br>If you didn't request a password reset, you don't have to do anything. Just ignore this email.`
  );
  return ok();
});
