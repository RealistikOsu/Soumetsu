import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { config } from '$server/config';

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

async function getJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) }).catch(() => null);
  if (!response?.ok) return null;
  return ((await response.json()) as { data: T }).data;
}

const countries = new Intl.DisplayNames(['en'], { type: 'region' });

async function previewFor(pathname: string): Promise<Preview | null> {
  const user = pathname.match(/^\/users\/(\d+)$/);
  if (user) {
    const found = await getJson<{ id: number; username: string; country: string }>(
      `${config.apiUrl}/api/v2/users/${user[1]}`
    );
    if (!found) return null;
    return {
      title: found.username,
      description: `${found.username} is a RealistikOsu player from ${countries.of(found.country) ?? found.country}.`,
      image: `${apiBase()}/api/v2/assets/avatars/${found.id}.png`
    };
  }

  const clan = pathname.match(/^\/c\/(\d+)$/);
  if (clan) {
    const found = await getJson<{ id: number; name: string; tag: string; description: string }>(
      `${config.apiUrl}/api/v2/clans/${clan[1]}`
    );
    if (!found) return null;
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
    if (!found) return null;
    return {
      title: found.song_name,
      description: `Play ${found.song_name} on RealistikOsu.`,
      image: `https://assets.ussr.pl/beatmaps/${found.beatmapset_id}/covers/cover.jpg`
    };
  }
  return null;
}

export const handle: Handle = async ({ event, resolve }) => {
  const preview = await previewFor(event.url.pathname);
  if (!preview) return resolve(event);

  const url = `${config.appBaseUrl}${event.url.pathname}`;
  const tags = [
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'RealistikOsu'],
    ['property', 'og:url', url],
    ['property', 'og:title', preview.title],
    ['property', 'og:description', preview.description],
    ['property', 'og:image', preview.image],
    ['name', 'twitter:card', 'summary'],
    ['name', 'twitter:title', preview.title],
    ['name', 'twitter:description', preview.description],
    ['name', 'twitter:image', preview.image]
  ]
    .map(
      ([attribute, name, content]) => `<meta ${attribute}="${name}" content="${escape(content)}" />`
    )
    .join('\n    ');

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('</head>', `    ${tags}\n  </head>`)
  });
};
