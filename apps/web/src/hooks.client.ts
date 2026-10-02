import type { HandleClientError } from '@sveltejs/kit';
import { siteApi } from '$lib/api/site';
import { getToken } from '$lib/auth/token';

export const handleError: HandleClientError = ({ error }) => {
  if (!getToken()) return;
  const text = error instanceof Error ? (error.stack ?? error.message) : String(error);
  siteApi.post('/console', { error: text }).catch(() => null);
};
