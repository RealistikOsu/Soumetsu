import { apiUrl } from '$lib/api/client';

export const avatarUrl = (id: number) => apiUrl(`/api/v2/assets/avatars/${id}.png`).href;
export const bannerUrl = (id: number) => apiUrl(`/api/v2/assets/banners/${id}.png`).href;
export const clanIconUrl = (id: number) => apiUrl(`/api/v2/clans/${id}/icon`).href;

export const defaultAvatar = '/img/avatar-default.svg';

type CoverSize = 'list' | 'card' | 'cover';

export const coverUrl = (setId: number, size: CoverSize = 'list') =>
  `https://assets.ussr.pl/beatmaps/${setId}/covers/${size}.jpg`;

export const previewUrl = (setId: number) => `https://b.ussr.pl/preview/${setId}.mp3`;

export const isServerOnlySet = (setId: number) => setId >= 1_000_000_000;

export const downloadUrl = (setId: number) => `https://ussr.pl/d/${setId}`;

export const mirrors = [
  { name: 'Beatconnect', url: (setId: number) => `https://beatconnect.io/b/${setId}` },
  { name: 'Mino', url: (setId: number) => `https://catboy.best/d/${setId}` },
  { name: 'osu.direct', url: (setId: number) => `https://osu.direct/d/${setId}` }
];

const banchoModes = ['osu', 'taiko', 'fruits', 'mania'];

export const banchoUrl = (setId: number, diff: { id: number; mode: number } | null) =>
  `https://osu.ppy.sh/beatmapsets/${setId}` +
  (diff ? `#${banchoModes[diff.mode] ?? 'osu'}/${diff.id}` : '');

export const flagUrl = (country: string) => `/img/flags/${country.toLowerCase()}.svg`;

export const replayUrl = (scoreId: number) => `/web/replays/${scoreId}`;
