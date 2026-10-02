import { requireCaller } from '$server/auth';
import { config } from '$server/config';
import { startState } from '$server/oauth';
import { Failure, handle, ok } from '$server/respond';

const redirectUri = () => `${config.appBaseUrl}/settings/bancho`;

export const POST = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  if (!config.osu.id || !config.osu.secret) throw new Failure(404, 'site.not_configured');

  const url = new URL('https://osu.ppy.sh/oauth/authorize');
  url.searchParams.set('client_id', config.osu.id);
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify');
  url.searchParams.set('state', await startState('bancho', caller.id));
  return ok(url.href);
});
