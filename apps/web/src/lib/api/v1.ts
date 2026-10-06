import { isLazer } from '$lib/modes';
import { apiUrl } from './client';

export interface StatsTopScore {
  user_id: number;
  username: string;
  pp_val: number;
  beatmap_id: number;
  beatmapset_id: number;
}

// top_scores has one entry per mode: vanilla 0-3, relax 4-6, autopilot 7, lazer 8-11, lazer relax 12-14, lazer autopilot 15.
interface Homepage {
  online_history: number[];
  top_scores: (StatsTopScore | null)[];
}

// Both live on the old API, which nginx still routes on the same domain, and use its { code, ... } envelope.
async function v1<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(`/api/v1${path}`), { signal });
  if (!response.ok) throw new Error(`v1 ${path} returned ${response.status}`);
  return response.json();
}

// The version is read from whichever field the patcher service uses, and the page copes without it.
export async function patcherVersion(signal?: AbortSignal) {
  const body = await v1<unknown>('/patcher/launcher/version', signal);
  if (typeof body === 'string') return body;
  const found = body as { version?: string; data?: { version?: string } | string };
  return (
    found.version ?? (typeof found.data === 'string' ? found.data : found.data?.version) ?? null
  );
}

export async function homepage(signal?: AbortSignal) {
  const body = await v1<{ data: Homepage }>('/statistics/homepage', signal);
  return body.data;
}

export const onlineHistory = async (signal?: AbortSignal) =>
  (await homepage(signal)).online_history;

const TOP_SCORE_START = [0, 4, 7, 8, 12, 15];

export const topScoreIndex = (mode: number, rx: number) => TOP_SCORE_START[rx] + mode;

// The statistics service keeps daily captures and adds today's figure itself. It refuses players who are
// restricted or haven't played in 60 days, since their captures stop changing.
export type ProfileHistory =
  | { status: 'ready'; points: { time: number; value: number }[] }
  | { status: 'inactive' | 'missing' };

export async function profileHistory(
  kind: 'rank' | 'pp',
  userId: number,
  mode: number,
  rx: number,
  signal?: AbortSignal
): Promise<ProfileHistory> {
  if (isLazer(rx)) return { status: 'missing' };
  const body = await v1<{
    status: string;
    error?: string;
    data?: { captures: { captured_at: string; overall?: number; pp?: number }[] };
  }>(`/profile-history/${kind}?user_id=${userId}&mode=${mode + rx * 4}`, signal);

  if (body.status !== 'success' || !body.data) {
    return { status: body.error === 'users.is_not_active' ? 'inactive' : 'missing' };
  }
  return {
    status: 'ready',
    points: body.data.captures.map((capture) => ({
      time: Date.parse(capture.captured_at),
      value: (kind === 'rank' ? capture.overall : capture.pp) ?? 0
    }))
  };
}

export async function peakRank(userId: number, mode: number, rx: number, signal?: AbortSignal) {
  if (isLazer(rx)) return null;
  const body = await v1<{ status: string; data?: { rank: number; captured_at: string } }>(
    `/profile-history/peak-rank?user_id=${userId}&mode=${mode + rx * 4}`,
    signal
  );
  return body.status === 'success' && body.data?.rank
    ? { rank: body.data.rank, time: Date.parse(body.data.captured_at) }
    : null;
}
