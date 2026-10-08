import type { RequestHandler } from '@sveltejs/kit';
import { config } from '$server/config';
import { listDocs } from '$server/docs';
import { redis } from '$server/redis';

const STATIC = [
  '/',
  '/leaderboard',
  '/clanboard',
  '/beatmap_listing',
  '/about',
  '/team',
  '/donate',
  '/patcher',
  '/upload-requests',
  '/doc',
  '/daily-challenge',
  '/connect'
];

const TOP_PLAYERS = 500;

let cached: { body: string; at: number } | null = null;
const TTL = 3_600_000;

async function build() {
  const base = config.appBaseUrl.replace(/\/$/, '');
  const docs = await listDocs('en');
  const players = await redis
    .zrevrange('ripple:leaderboard:std', 0, TOP_PLAYERS - 1)
    .catch(() => []);
  const urls = [
    ...STATIC,
    ...docs.map((doc) => `/doc/${doc.slug}`),
    ...players.map((id) => `/users/${id}`)
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((path) => `  <url><loc>${base}${path}</loc></url>`).join('\n')}
</urlset>
`;
}

export const GET: RequestHandler = async () => {
  if (!cached || Date.now() - cached.at > TTL) cached = { body: await build(), at: Date.now() };
  return new Response(cached.body, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' }
  });
};
