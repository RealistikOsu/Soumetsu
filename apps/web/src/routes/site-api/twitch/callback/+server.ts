import { requireCaller } from '$server/auth';
import { config } from '$server/config';
import { db } from '$server/db';
import { consumeState, jsonOrFail } from '$server/oauth';
import { Failure, handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  if (!config.twitch.id || !config.twitch.secret) throw new Failure(404, 'site.not_configured');

  const body = (await request.json().catch(() => null)) as { code?: string; state?: string } | null;
  await consumeState('twitch', caller.id, body?.state);
  if (!body?.code) throw new Failure(400, 'site.invalid_request');

  const token = (await jsonOrFail(
    await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: config.twitch.id,
        client_secret: config.twitch.secret,
        grant_type: 'authorization_code',
        code: body.code,
        redirect_uri: `${config.appBaseUrl}/settings/twitch`
      })
    }),
    'site.oauth_rejected'
  )) as { access_token?: string };
  if (!token.access_token) throw new Failure(502, 'site.oauth_rejected');

  const users = (await jsonOrFail(
    await fetch('https://api.twitch.tv/helix/users', {
      headers: { Authorization: `Bearer ${token.access_token}`, 'Client-Id': config.twitch.id }
    }),
    'site.oauth_profile_failed'
  )) as { data: { id: string; login: string }[] };
  const account = users.data[0];
  if (!account) throw new Failure(502, 'site.oauth_profile_failed');

  const twitchId = BigInt(account.id);
  const owner = await db.twitch_links.findUnique({ where: { twitch_id: twitchId } });
  if (owner && owner.osu_user_id !== caller.id) throw new Failure(409, 'site.already_linked');

  // Linking a different channel clears the old row first, or the unique key on the player rejects it.
  await db.$transaction([
    db.twitch_links.deleteMany({ where: { osu_user_id: caller.id } }),
    db.twitch_links.create({
      data: {
        twitch_id: twitchId,
        twitch_username: account.login.toLowerCase(),
        osu_user_id: caller.id,
        created_at: Math.floor(Date.now() / 1000)
      }
    }),
    db.twitch_settings.createMany({ data: [{ twitch_id: twitchId }], skipDuplicates: true })
  ]);
  return ok({ username: account.login.toLowerCase() });
});
