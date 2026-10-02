import { requireCaller } from '$server/auth';
import { config } from '$server/config';
import { startState } from '$server/oauth';
import { Failure, handle, ok } from '$server/respond';

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  if (!config.twitch.id || !config.twitch.secret) throw new Failure(404, 'site.not_configured');

  const url = new URL('https://id.twitch.tv/oauth2/authorize');
  url.searchParams.set('client_id', config.twitch.id);
  url.searchParams.set('redirect_uri', `${config.appBaseUrl}/settings/twitch`);
  url.searchParams.set('response_type', 'code');
  // Reading the authorising player's own id and login needs no scopes.
  url.searchParams.set('scope', '');
  url.searchParams.set('state', await startState('twitch', caller.id));
  return ok(url.href);
});
