import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { config } from '$server/config';
import { handle, ok } from '$server/respond';

async function up(url: string, good: (status: number) => boolean) {
  const response = await fetch(url, { signal: AbortSignal.timeout(2000) }).catch(() => null);
  return !!response && good(response.status);
}

// Whether the API, the score service and Bancho answer, as the panel's dashboard pinged them.
export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminAccessRap);
  const [api, scores, bancho] = await Promise.all([
    up(`${config.apiUrl}/api/v2/health/`, (s) => s === 200),
    // The score service answers its root with a 404 when it is up.
    up(config.scoreServiceUrl, (s) => s === 404),
    up(`${config.banchoUrl}/api/v1/serverStatus`, (s) => s === 200)
  ]);
  return ok({ api, scores, bancho });
});
