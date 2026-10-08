import type { Handle, HandleServerError } from '@sveltejs/kit';
import { record } from '$server/admin/console';
import { config } from '$server/config';
import { previewFor } from '$server/preview';
import { resolveUser } from '$server/users';

const LOCALES = ['en', 'ru', 'pl', 'hu'];

// Pages about the signed-in player, or forms, have nothing for a search engine.
const PRIVATE = [
  '/admin',
  '/settings',
  '/messages',
  '/friends',
  '/followers',
  '/commissions',
  '/shop',
  '/login',
  '/register',
  '/pwreset',
  '/clan/manage',
  '/clans/create',
  '/rank-request'
];
const isPrivate = (pathname: string) =>
  PRIVATE.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const escape = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

// Hanayo's profile and beatmap links are all over Discord, so they redirect here rather than in the
// browser, where a link preview would never follow them. Names resolve to the player's ID the same way.
async function legacyTarget(url: URL) {
  const profile = url.pathname.match(/^\/(?:(rx|ap)\/)?u\/([^/]+)$|^\/users\/([^/]+)$/);
  if (profile) {
    const name = decodeURIComponent(profile[2] ?? profile[3]);
    if (profile[3] && /^\d+$/.test(name)) return null;
    const id = /^\d+$/.test(name) ? Number(name) : await resolveUser(name);
    if (id === null) return null;
    const target = new URL(`/users/${id}`, url);
    target.search = url.search;
    if (profile[1]) target.searchParams.set('rx', profile[1] === 'rx' ? '1' : '2');
    return target;
  }

  const map = url.pathname.match(/^\/b\/(\d+)$/);
  if (map) {
    const target = new URL(`/beatmaps/${map[1]}`, url);
    target.search = url.search;
    return target;
  }

  // osu! calls clans teams.
  const team = url.pathname.match(/^\/teams\/(\d+)\/?$/);
  if (team) {
    const target = new URL(`/c/${team[1]}`, url);
    target.search = url.search;
    return target;
  }
  return null;
}

export const handle: Handle = async ({ event, resolve }) => {
  if (event.request.method !== 'GET' || event.url.pathname.startsWith('/site-api')) {
    return resolve(event);
  }

  const target = await legacyTarget(event.url);
  if (target) {
    return new Response(null, {
      status: 301,
      headers: { location: `${target.pathname}${target.search}` }
    });
  }

  const preview = await previewFor(event.url);
  const url = `${config.appBaseUrl}${event.url.pathname}`;
  const locale = event.cookies.get('PARAGLIDE_LOCALE');
  const lang = locale && LOCALES.includes(locale) ? locale : 'en';
  const tags = [
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'RealistikOsu'],
    ['property', 'og:url', url],
    ['property', 'og:title', preview.title],
    ['property', 'og:description', preview.description],
    ['property', 'og:image', preview.image],
    ['property', 'og:image:alt', preview.alt],
    ['name', 'description', preview.description],
    ['name', 'twitter:card', preview.wide ? 'summary_large_image' : 'summary'],
    ['name', 'twitter:title', preview.title],
    ['name', 'twitter:description', preview.description],
    ['name', 'twitter:image', preview.image],
    ['name', 'twitter:image:alt', preview.alt],
    ...(isPrivate(event.url.pathname) ? [['name', 'robots', 'noindex']] : [])
  ]
    .map(
      ([attribute, name, content]) => `<meta ${attribute}="${name}" content="${escape(content)}" />`
    )
    .join('\n    ');
  // The page sets its own title once it renders; crawlers that don't run scripts get this one.
  const head = `<title>${escape(preview.title)}</title>\n    <link rel="canonical" href="${escape(url)}" />\n    ${tags}`;

  const response = await resolve(event, {
    transformPageChunk: ({ html }) =>
      html
        .replace('<html lang="en">', `<html lang="${lang}">`)
        .replace('</head>', `    ${head}\n  </head>`)
  });
  // The preload list for heavy pages like profiles outgrows nginx's proxy buffer and turns into a 502.
  response.headers.delete('link');
  return response;
};

// A missing page is somebody's typo or a bot probing paths, not something for staff to fix.
export const handleError: HandleServerError = async ({ error, status }) => {
  if (status === 404) return;
  await record('error', null, error);
};
