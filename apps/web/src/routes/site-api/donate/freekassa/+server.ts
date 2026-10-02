import { requireCaller } from '$server/auth';
import { config } from '$server/config';
import { md5 } from '$server/identity';
import { dollarsFor, targetUser } from '$server/payments';
import { Failure, handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  await requireCaller(request);
  const { merchantId, secret1 } = config.freekassa;
  if (!merchantId || !secret1) throw new Failure(503, 'site.payments_unavailable');

  const body = (await request.json().catch(() => null)) as {
    user_id?: number;
    months?: number;
  } | null;
  const months = Number(body?.months);
  if (!Number.isInteger(months) || months < 1) throw new Failure(400, 'site.invalid_request');
  const target = await targetUser(Number(body?.user_id));
  if (!target) throw new Failure(404, 'users.user_not_found');

  const amount = dollarsFor(months);
  const order = String(Date.now() * 1_000_000);
  const url = new URL('https://pay.freekassa.ru/');
  url.searchParams.set('m', merchantId);
  url.searchParams.set('oa', amount);
  url.searchParams.set('o', order);
  url.searchParams.set('s', md5(`${merchantId}:${amount}:${secret1}:USD:${order}`));
  url.searchParams.set('currency', 'USD');
  url.searchParams.set('us_userid', String(target.id));
  url.searchParams.set('us_months', String(months));
  return ok(url.href);
});
