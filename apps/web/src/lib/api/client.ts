import { env } from '$env/dynamic/public';
import { getToken } from '$lib/auth/token';
import { ApiError } from './errors';

type Params = Record<string, string | number | boolean | null | undefined>;

interface Options {
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

let unauthorised = () => {};

export const onUnauthorised = (handler: () => void) => {
  unauthorised = handler;
};

export function apiUrl(path: string, params?: Params) {
  const url = new URL(`${env.PUBLIC_API_URL ?? ''}${path}`, location.origin);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function failureName(status: number, json: unknown) {
  if (json && typeof json === 'object') {
    const body = json as { data?: unknown; detail?: unknown };
    if (typeof body.data === 'string') return body.data;
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) return 'auth.validation_error';
  }
  return `http_${status}`;
}

export async function request<T>(
  method: string,
  url: URL,
  { body, form, signal }: Options = {}
): Promise<T> {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (body !== undefined) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
      signal
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, 'network_error');
  }

  const json = await response.json().catch(() => null);
  if (response.ok && json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }
  if (response.status === 401 && token) unauthorised();
  throw new ApiError(response.status, failureName(response.status, json));
}

const v2 = (path: string, params?: Params) => apiUrl(`/api/v2${path}`, params);

export const api = {
  get: <T>(path: string, params?: Params, signal?: AbortSignal) =>
    request<T>('GET', v2(path, params), { signal }),
  post: <T = null>(path: string, body?: unknown, params?: Params) =>
    request<T>('POST', v2(path, params), { body }),
  put: <T = null>(path: string, body?: unknown) => request<T>('PUT', v2(path), { body }),
  delete: <T = null>(path: string) => request<T>('DELETE', v2(path)),
  upload: <T>(path: string, file: File) => {
    const form = new FormData();
    form.set('file', file);
    return request<T>('POST', v2(path), { form });
  }
};
