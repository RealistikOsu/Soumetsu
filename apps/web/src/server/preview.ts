import { env } from '$env/dynamic/public';
import { config } from '$server/config';
import { readDoc } from '$server/docs';

// Pages are rendered in the browser, so link previews (Discord embeds and the like) would find nothing to read.
// For the pages people share, the server works out the preview here and the hook puts it into the first HTML.

export interface Preview {
  title: string;
  description: string;
  image: string;
  alt: string;
  wide?: boolean;
}

interface PageInfo {
  title: string;
  description: string;
}

interface UserRef {
  id: number;
  username: string;
  country: string;
}

interface BeatmapRef {
  set_id: number;
  artist: string;
  title: string;
  version: string;
  star_rating: number | null;
}

interface MatchSummary {
  name: string;
  status: 'active' | 'ended';
  map_count: number;
  players: UserRef[];
  cover_set_ids: number[];
}

export const site: Preview = {
  title: 'RealistikOsu',
  description:
    'RealistikOsu is a private server for the rhythm game osu! It features ranked Relax, Autopilot and rate changes among countless other unique features!',
  image: `${config.appBaseUrl}/img/logo.png`,
  alt: 'RealistikOsu logo'
};

const pages: Record<string, PageInfo> = {
  '/leaderboard': {
    title: 'Leaderboard',
    description: 'The top players on RealistikOsu, ranked by pp in every mode.'
  },
  '/clanboard': {
    title: 'Clans',
    description: 'The top clans on RealistikOsu.'
  },
  '/beatmap_listing': {
    title: 'Beatmaps',
    description: 'Search every beatmap on RealistikOsu by name, mode and status.'
  },
  '/about': {
    title: 'About',
    description: 'What RealistikOsu is, and what it has that other private servers do not.'
  },
  '/team': {
    title: 'Team',
    description: 'The people who run RealistikOsu.'
  },
  '/donate': {
    title: 'Support',
    description: 'Help keep RealistikOsu running and get supporter perks in return.'
  },
  '/patcher': {
    title: 'Patcher',
    description: 'Download the patcher that connects your osu! client to RealistikOsu.'
  },
  '/upload-requests': {
    title: 'Upload requests',
    description: 'Ask for a beatmap to be uploaded to RealistikOsu.'
  },
  '/doc': {
    title: 'Documentation',
    description: 'Rules, guides and answers to common questions about RealistikOsu.'
  },
  '/daily-challenge': {
    title: 'Daily challenge',
    description: 'A new beatmap to play every day on RealistikOsu.'
  },
  '/register': {
    title: 'Create an account',
    description: 'Make a RealistikOsu account and start climbing the leaderboards.'
  },
  '/login': {
    title: 'Your account',
    description: 'Log in to RealistikOsu.'
  },
  '/connect': {
    title: 'Connecting',
    description: 'How to connect your osu! client to RealistikOsu.'
  }
};

const descriptionLimit = 200;
const cacheTtl = 60_000;
const cacheSize = 500;

const apiBase = () => (env.PUBLIC_API_URL || config.appBaseUrl).replace(/\/$/, '');
const cover = (setId: number) => `https://assets.ussr.pl/beatmaps/${setId}/covers/cover.jpg`;
const avatar = (id: number) => `${apiBase()}/api/v2/assets/avatars/${id}.png`;

const numbers = new Intl.NumberFormat('en-GB');
const countries = new Intl.DisplayNames(['en'], { type: 'region' });
const plainCountries: Record<string, string> = { HK: 'Hong Kong', MO: 'Macau' };

const limited = (preview: Preview): Preview => ({
  ...preview,
  description:
    preview.description.length > descriptionLimit
      ? `${preview.description.slice(0, descriptionLimit - 1).trimEnd()}…`
      : preview.description
});

const count = (n: number, noun: string) => `${numbers.format(n)} ${noun}${n === 1 ? '' : 's'}`;

const stars = (rating: number | null) => (rating ? `${rating.toFixed(2)} stars` : null);

// Old accounts can have '' or '0' as their country, which Intl rejects.
const countryOf = (code: string) =>
  /^[a-z]{2}$/i.test(code) && code.toUpperCase() !== 'XX'
    ? (plainCountries[code.toUpperCase()] ?? countries.of(code.toUpperCase()) ?? code)
    : null;

async function getJson<T>(url: string, enveloped = true): Promise<T | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) }).catch(() => null);
  if (!response?.ok) return null;
  const body = await response.json().catch(() => null);
  if (body === null) return null;
  return enveloped ? (body as { data: T }).data : (body as T);
}

const cache = new Map<string, { at: number; value: Preview }>();

async function cached(key: string, build: () => Promise<Preview>) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < cacheTtl) return hit.value;
  const value = await build();
  cache.delete(key);
  cache.set(key, { at: Date.now(), value });
  if (cache.size > cacheSize) cache.delete(cache.keys().next().value!);
  return value;
}

const api = (path: string) => `${config.apiUrl}/api/v2${path}`;

async function user(id: string) {
  const found = await getJson<{
    id: number;
    username: string;
    country: string;
    stats: { global_rank: number; pp: number; accuracy: number; playcount: number };
  }>(api(`/users/${id}`));
  if (!found) return site;

  const country = countryOf(found.country);
  const { stats } = found;
  const parts = [
    stats.global_rank > 0 ? `#${numbers.format(stats.global_rank)} global` : null,
    stats.pp > 0 ? `${numbers.format(stats.pp)}pp` : null,
    stats.playcount > 0 ? `${stats.accuracy.toFixed(2)}% accuracy` : null,
    stats.playcount > 0 ? count(stats.playcount, 'play') : null,
    country
  ].filter((part) => part !== null);

  return {
    title: found.username,
    description: parts.length
      ? parts.join(' · ')
      : country
        ? `${found.username} is a RealistikOsu player from ${country}.`
        : `${found.username} is a RealistikOsu player.`,
    image: avatar(found.id),
    alt: `${found.username}'s avatar`
  };
}

async function userHistory(id: string, kind: 'ranked-play' | 'multiplayer') {
  const found = await getJson<{ id: number; username: string }>(api(`/users/${id}`));
  if (!found) return site;
  const name = kind === 'ranked-play' ? 'ranked play' : 'multiplayer';
  return {
    title: `${found.username}'s ${name} history`,
    description: `Every ${name} match ${found.username} has played on RealistikOsu.`,
    image: avatar(found.id),
    alt: `${found.username}'s avatar`
  };
}

async function clan(id: string) {
  const found = await getJson<{ id: number; name: string; tag: string; description: string }>(
    api(`/clans/${id}`)
  );
  if (!found) return site;
  return {
    title: `${found.name} [${found.tag}]`,
    description: found.description || `${found.name} is a clan on RealistikOsu.`,
    image: `${apiBase()}/api/v2/clans/${found.id}/icon`,
    alt: `${found.name} clan icon`
  };
}

async function beatmap(id: string) {
  const found = await getJson<{
    beatmapset_id: number;
    song_name: string;
    mode: number;
    difficulty_std: number;
    difficulty_taiko: number;
    difficulty_ctb: number;
    difficulty_mania: number;
  }>(api(`/beatmaps/${id}`));
  if (!found) return site;
  const rating = [
    found.difficulty_std,
    found.difficulty_taiko,
    found.difficulty_ctb,
    found.difficulty_mania
  ][found.mode];
  const difficulty = stars(rating);
  return {
    title: found.song_name,
    description: `${difficulty ? `${difficulty}. ` : ''}Play ${found.song_name} on RealistikOsu.`,
    image: cover(found.beatmapset_id),
    alt: `${found.song_name} cover`,
    wide: true
  };
}

async function beatmapset(id: string) {
  const found = await getJson<{ artist: string; title: string; creator: string }>(
    `${config.mirrorUrl}/api/v2/beatmapsets/${id}`,
    false
  );
  if (!found) return site;
  return {
    title: `${found.artist} - ${found.title}`,
    description: `Mapped by ${found.creator}. Play it on RealistikOsu.`,
    image: cover(Number(id)),
    alt: `${found.artist} - ${found.title} cover`,
    wide: true
  };
}

// Stable scores name their table in ?rx=, since their ids overlap with lazer's.
async function scoreCard(id: string, rx: string | null) {
  const found = await getJson<{
    score: number;
    accuracy: number;
    pp: number;
    play_mode: number;
    beatmap: { beatmapset_id: number; title: string; artist: string; version: string };
    player: { username: string };
  }>(api(rx === null ? `/lazer/scores/${id}` : `/scores/${id}/detail?custom_mode=${rx}`));
  if (!found) return site;
  const { beatmap } = found;
  const name = `${beatmap.artist} - ${beatmap.title} [${beatmap.version}]`;
  return {
    title: `${found.player.username} | ${beatmap.artist} - ${beatmap.title}`,
    description: [
      `${numbers.format(found.score)} score`,
      `${found.accuracy.toFixed(2)}% accuracy`,
      found.pp > 0 ? `${numbers.format(Math.round(found.pp))}pp` : null,
      `[${beatmap.version}]`
    ]
      .filter((part) => part !== null)
      .join(' · '),
    image: cover(beatmap.beatmapset_id),
    alt: `${name} cover`,
    wide: true
  };
}

const songName = (map: BeatmapRef) => `${map.artist} - ${map.title} [${map.version}]`;

async function daily(date: string) {
  const found = await getJson<{ beatmap: BeatmapRef; participants: number }>(
    api(`/daily-challenge/${date}`)
  );
  if (!found) return { ...site, ...pages['/daily-challenge'] };
  const name = songName(found.beatmap);
  return {
    title: `Daily challenge · ${name}`,
    description: [date, stars(found.beatmap.star_rating), count(found.participants, 'participant')]
      .filter((part) => part !== null)
      .join(' · '),
    image: cover(found.beatmap.set_id),
    alt: `${name} cover`,
    wide: true
  };
}

async function match(kind: 'ranked-play' | 'multiplayer', id: string) {
  const found = await getJson<{ match: MatchSummary }>(api(`/${kind}/matches/${id}`));
  if (!found) return site;
  const { match } = found;
  const names = match.players.slice(0, 4).map((player) => player.username);
  const others = match.players.length - names.length;
  const players = names.length
    ? `${names.join(', ')}${others > 0 ? ` and ${others} more` : ''}`
    : null;
  const description = [
    players,
    `${count(match.map_count, 'map')} played`,
    match.status === 'active' ? 'In progress' : 'Finished'
  ]
    .filter((part) => part !== null)
    .join(' · ');
  const set = match.cover_set_ids[0];
  if (set === undefined) return { ...site, title: match.name, description };
  return {
    title: match.name,
    description,
    image: cover(set),
    alt: `${match.name} cover`,
    wide: true
  };
}

const today = () => new Date().toISOString().slice(0, 10);

type Kind = 'ranked-play' | 'multiplayer';

const dynamic: [RegExp, (hit: string[], url: URL) => Promise<Preview>][] = [
  [/^\/users\/(\d+)$/, ([, id]) => user(id)],
  [/^\/users\/(\d+)\/(ranked-play|multiplayer)$/, ([, id, kind]) => userHistory(id, kind as Kind)],
  [/^\/c\/(\d+)$/, ([, id]) => clan(id)],
  [/^\/beatmaps\/(\d+)$/, ([, id]) => beatmap(id)],
  [/^\/beatmapsets\/(\d+)$/, ([, id]) => beatmapset(id)],
  [
    /^\/scores\/(\d+)$/,
    ([, id], url) =>
      scoreCard(
        id,
        /^[0-2]$/.test(url.searchParams.get('rx') ?? '') ? url.searchParams.get('rx') : null
      )
  ],
  [/^\/(ranked-play|multiplayer)\/(\d+)(?:\/history)?$/, ([, kind, id]) => match(kind as Kind, id)]
];

export async function previewFor(url: URL): Promise<Preview> {
  const { pathname } = url;

  if (pathname === '/daily-challenge') {
    const asked = url.searchParams.get('date') ?? '';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today();
    return limited(await cached(`${pathname}?date=${date}`, () => daily(date)));
  }

  const page = pages[pathname];
  if (page) return { ...site, ...page };

  const doc = pathname.match(/^\/doc\/([a-z0-9_-]+)$/i);
  if (doc) {
    const found = await readDoc(doc[1], 'en');
    if (!found) return site;
    return limited({
      ...site,
      title: found.meta.title,
      description: found.meta.description || site.description
    });
  }

  for (const [pattern, build] of dynamic) {
    const hit = pathname.match(pattern);
    if (hit) return limited(await cached(`${pathname}${url.search}`, () => build(hit, url)));
  }
  return site;
}
