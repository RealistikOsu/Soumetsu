import { ApiError } from './errors';

export interface MirrorBeatmap {
  id: number;
  beatmapset_id: number;
  version: string;
  difficulty_rating: number;
  mode_int: number;
  status: string;
  ar: number;
  od: number;
  cs: number;
  hp: number;
  bpm: number;
  hit_length: number;
  total_length: number;
  max_combo: number;
  checksum: string;
}

export interface MirrorBeatmapDetail {
  id: number;
  set_id: number;
  artist: string;
  title: string;
  creator: string;
  version: string;
  star_rating: number;
  mode: number;
  status_string: string;
  ar: number;
  od: number;
  cs: number;
  hp: number;
  bpm: number;
  hit_length: number;
  total_length: number;
  max_combo: number;
  checksum: string;
}

export interface MirrorSet {
  id: number;
  artist: string;
  title: string;
  creator: string;
  user_id: number;
  status: string;
  tags: string;
  source: string;
  video: boolean;
  beatmaps: MirrorBeatmap[];
}

// The old search shape, which the listing still uses.
export interface SearchedSet {
  SetID: number;
  ChildrenBeatmaps: {
    BeatmapID: number;
    DiffName: string;
    Mode: number;
    BPM: number;
    DifficultyRating: number;
    TotalLength: number;
  }[];
  RankedStatus: number;
  Artist: string;
  Title: string;
  Creator: string;
  HasVideo: boolean;
}

async function mirror<T>(
  path: string,
  params: Record<string, string | number> = {},
  signal?: AbortSignal
) {
  const url = new URL(`/site-api/mirror/${path}`, location.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, 'network_error');
  }
  if (!response.ok) throw new ApiError(response.status, `mirror.http_${response.status}`);
  return (await response.json()) as T;
}

export const mirrorSet = (setId: number, signal?: AbortSignal) =>
  mirror<MirrorSet>(`api/v2/beatmapsets/${setId}`, {}, signal);

export const mirrorBeatmap = (id: number, signal?: AbortSignal) =>
  mirror<MirrorBeatmapDetail>(`api/v2/beatmaps/${id}`, {}, signal);

export const searchSets = (
  params: { query: string; offset: number; amount: number; mode?: string; status?: string },
  signal?: AbortSignal
) => {
  const query: Record<string, string | number> = {
    offset: params.offset,
    amount: params.amount,
    query: params.query
  };
  if (params.mode) query.mode = params.mode;
  if (params.status) query.status = params.status;
  return mirror<SearchedSet[] | null>('api/search', query, signal);
};
