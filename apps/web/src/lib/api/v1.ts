import { apiUrl } from './client';

interface PatcherVersion {
  version: string;
}

interface Homepage {
  online_history: number[];
}

// Both live on the old API, which nginx still routes on the same domain, and use its { code, ... } envelope.
async function v1<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(`/api/v1${path}`), { signal });
  if (!response.ok) throw new Error(`v1 ${path} returned ${response.status}`);
  return response.json();
}

export const patcherVersion = (signal?: AbortSignal) =>
  v1<PatcherVersion>('/patcher/launcher/version', signal);

export async function onlineHistory(signal?: AbortSignal) {
  const body = await v1<{ data: Homepage }>('/statistics/homepage', signal);
  return body.data.online_history;
}
