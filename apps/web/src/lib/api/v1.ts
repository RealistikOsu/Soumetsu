import { apiUrl } from './client';

interface Homepage {
  online_history: number[];
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

export async function onlineHistory(signal?: AbortSignal) {
  const body = await v1<{ data: Homepage }>('/statistics/homepage', signal);
  return body.data.online_history;
}
