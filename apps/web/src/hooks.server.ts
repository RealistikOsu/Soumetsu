import type { Handle, HandleServerError } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { record } from '$server/admin/console';
import { config } from '$server/config';
import { readDoc } from '$server/docs';
import { resolveUser } from '$server/users';

// Pages are rendered in the browser, so link previews (Discord embeds and the like) would find nothing to read.
// For the pages people share, the server puts the preview tags into the first HTML it sends and leaves the rest alone.

interface Preview {
  title: string;
  description: string;
  image: string;
}

const escape = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

const apiBase = () => (env.PUBLIC_API_URL || config.appBaseUrl).replace(/\/$/, '');

async function getJson<T>(url: string, enveloped = true): Promise<T | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) }).catch(() => null);
  if (!response?.ok) return null;
  const body = await response.json();
  return enveloped ? (body as { data: T }).data : (body as T);
}

const countries = new Intl.DisplayNames(['en'], { type: 'region' });

// Old accounts can have '' or '0' as their country, which Intl rejects.
const countryOf = (code: string) =>
  /^[a-z]{2}$/i.test(code) && code.toUpperCase() !== 'XX'
    ? (countries.of(code.toUpperCase()) ?? code)
    : null;

const site: Preview = {
  title: 'RealistikOsu',
  description:
    'RealistikOsu is a private server for the rhythm game osu! It features ranked Relax, Autopilot and rate changes among countless other unique features!',
  image: `${config.appBaseUrl}/img/logo.png`
};

async function previewFor(pathname: string): Promise<Preview> {
  const user = pathname.match(/^\/users\/(\d+)$/);
  if (user) {
    const found = await getJson<{ id: number; username: string; country: string }>(
      `${config.apiUrl}/api/v2/users/${user[1]}`
    );
    if (!found) return site;
    const country = countryOf(found.country);
    return {
      title: found.username,
      description: country
        ? `${found.username} is a RealistikOsu player from ${country}.`
        : `${found.username} is a RealistikOsu player.`,
      image: `${apiBase()}/api/v2/assets/avatars/${found.id}.png`
    };
  }

  const clan = pathname.match(/^\/c\/(\d+)$/);
  if (clan) {
    const found = await getJson<{ id: number; name: string; tag: string; description: string }>(
      `${config.apiUrl}/api/v2/clans/${clan[1]}`
    );
    if (!found) return site;
    return {
      title: `${found.name} [${found.tag}]`,
      description: found.description || `${found.name} is a clan on RealistikOsu.`,
      image: `${apiBase()}/api/v2/clans/${found.id}/icon`
    };
  }

  const map = pathname.match(/^\/beatmaps\/(\d+)$/);
  if (map) {
    const found = await getJson<{ beatmapset_id: number; song_name: string }>(
      `${config.apiUrl}/api/v2/beatmaps/${map[1]}`
    );
    if (!found) return site;
    return {
      title: found.song_name,
      description: `Play ${found.song_name} on RealistikOsu.`,
      image: `https://assets.ussr.pl/beatmaps/${found.beatmapset_id}/covers/cover.jpg`
    };
  }

  const set = pathname.match(/^\/beatmapsets\/(\d+)$/);
  if (set) {
    const found = await getJson<{ artist: string; title: string; creator: string }>(
      `${config.mirrorUrl}/api/v2/beatmapsets/${set[1]}`,
      false
    );
    if (!found) return site;
    return {
      title: `${found.artist} - ${found.title}`,
      description: `Mapped by ${found.creator}. Play it on RealistikOsu.`,
      image: `https://assets.ussr.pl/beatmaps/${set[1]}/covers/cover.jpg`
    };
  }

  const doc = pathname.match(/^\/doc\/([a-z0-9_-]+)$/i);
  if (doc) {
    const found = await readDoc(doc[1], 'en');
    if (!found) return site;
    return {
      ...site,
      title: found.meta.title,
      description: found.meta.description || site.description
    };
  }

  return site;
}

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

  const preview = await previewFor(event.url.pathname);
  const url = `${config.appBaseUrl}${event.url.pathname}`;
  const tags = [
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'RealistikOsu'],
    ['property', 'og:url', url],
    ['property', 'og:title', preview.title],
    ['property', 'og:description', preview.description],
    ['property', 'og:image', preview.image],
    ['name', 'description', preview.description],
    ['name', 'twitter:card', 'summary'],
    ['name', 'twitter:title', preview.title],
    ['name', 'twitter:description', preview.description],
    ['name', 'twitter:image', preview.image]
  ]
    .map(
      ([attribute, name, content]) => `<meta ${attribute}="${name}" content="${escape(content)}" />`
    )
    .join('\n    ');

  const response = await resolve(event, {
    transformPageChunk: ({ html }) => html.replace('</head>', `    ${tags}\n  </head>`)
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
