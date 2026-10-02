import { emailPattern, forbiddenUsernames, passwordProblem, usernameProblem } from '$lib/passwords';
import { config } from '$server/config';
import { db } from '$server/db';
import { clientIp, logIp, setIdentity } from '$server/identity';
import { Failure, handle, ok } from '$server/respond';

// Registration goes through here so the rules the API skips (a closed signup, reserved names, the email
// format, common passwords) hold even for a client that ignores the form, and so the browser is remembered.
export const POST = handle(async (event) => {
  const body = (await event.request.json().catch(() => null)) as {
    username?: string;
    email?: string;
    password?: string;
    captcha?: string;
  } | null;
  const username = body?.username?.trim() ?? '';
  const email = body?.email?.trim() ?? '';
  const password = body?.password ?? '';

  const open = await db.system_settings.findFirst({ where: { name: 'registrations_enabled' } });
  if (!open?.value_int) throw new Failure(403, 'site.registrations_closed');

  if (
    usernameProblem(username) ||
    forbiddenUsernames.has(username.toLowerCase()) ||
    !emailPattern.test(email) ||
    (await passwordProblem(password))
  ) {
    throw new Failure(400, 'auth.validation_error');
  }

  const response = await fetch(`${config.apiUrl}/api/v2/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Real-IP': clientIp(event) },
    body: JSON.stringify({ username, email, password, captcha: body?.captcha })
  });
  const result = (await response.json()) as { status: number; data: unknown };
  if (!response.ok || typeof result.data === 'string') {
    throw new Failure(response.status, String(result.data));
  }

  const created = result.data as { user_id: number };
  await setIdentity(created.user_id, event.cookies);
  await logIp(created.user_id, clientIp(event));
  return ok(created);
});
