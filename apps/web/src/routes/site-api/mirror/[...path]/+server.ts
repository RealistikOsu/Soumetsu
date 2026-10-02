import { config } from '$server/config';
import { Failure, handle } from '$server/respond';

// The beatmap mirror sends no CORS headers, so the browser reaches it through here.
const ALLOWED = [
  /^api\/v2\/beatmaps\/\d+$/,
  /^api\/v2\/beatmapsets\/(\d+|search)$/,
  /^api\/b\/\d+$/,
  /^api\/s\/\d+$/,
  /^api\/search$/
];

const TTL = 60_000;
const cache = new Map<string, { at: number; status: number; body: string }>();

export const GET = handle(async ({ params, url }) => {
  const path = params.path ?? '';
  if (!ALLOWED.some((pattern) => pattern.test(path))) throw new Failure(404, 'site.not_found');

  const target = `${config.mirrorUrl}/${path}${url.search}`;
  const hit = cache.get(target);
  if (hit && Date.now() - hit.at < TTL) {
    return new Response(hit.body, {
      status: hit.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const upstream = await fetch(target, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!upstream) throw new Failure(502, 'site.mirror_unreachable');

  const body = await upstream.text();
  if (cache.size > 500) cache.clear();
  cache.set(target, { at: Date.now(), status: upstream.status, body });
  return new Response(body, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' }
  });
});
