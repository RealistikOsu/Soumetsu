import { requireCaller } from '$server/auth';
import { config } from '$server/config';
import { db } from '$server/db';
import { consumeState, jsonOrFail } from '$server/oauth';
import { Failure, handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  if (!config.osu.id || !config.osu.secret) throw new Failure(404, 'site.not_configured');

  const body = (await request.json().catch(() => null)) as { code?: string; state?: string } | null;
  await consumeState('bancho', caller.id, body?.state);
  if (!body?.code) throw new Failure(400, 'site.invalid_request');

  const token = (await jsonOrFail(
    await fetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: config.osu.id,
        client_secret: config.osu.secret,
        grant_type: 'authorization_code',
        code: body.code,
        redirect_uri: `${config.appBaseUrl}/settings/bancho`
      })
    }),
    'site.oauth_rejected'
  )) as { access_token?: string };
  if (!token.access_token) throw new Failure(502, 'site.oauth_rejected');

  const me = (await jsonOrFail(
    await fetch('https://osu.ppy.sh/api/v2/me', {
      headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' }
    }),
    'site.oauth_profile_failed'
  )) as { id: number; username: string };

  // An osu! account links to one player, so a taken one is reported instead of overwritten.
  const owner = await db.osu_official_links.findUnique({ where: { ppy_user_id: me.id } });
  if (owner && owner.osu_user_id !== caller.id) throw new Failure(409, 'site.already_linked');

  await db.$transaction([
    db.osu_official_links.deleteMany({ where: { osu_user_id: caller.id } }),
    db.osu_official_links.create({
      data: {
        ppy_user_id: me.id,
        ppy_username: me.username,
        osu_user_id: caller.id,
        created_at: Math.floor(Date.now() / 1000)
      }
    })
  ]);
  return ok({ id: me.id, username: me.username });
});
