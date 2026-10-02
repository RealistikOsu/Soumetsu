import { getLocale } from '$lib/i18n';
import { siteApi } from './site';

export interface DocMeta {
  slug: string;
  title: string;
  description: string;
  icon: string;
  colour: string;
  oldId: number | null;
}

export const docs = (signal?: AbortSignal) =>
  siteApi.get<DocMeta[]>('/docs', { lang: getLocale() }, signal);

// lang overrides the reader's language, so an out-of-date translation can link to the English page.
export const doc = (slug: string, signal?: AbortSignal, lang: string = getLocale()) =>
  siteApi.get<{ meta: DocMeta; body: string; outdated: boolean }>(
    `/docs/${slug}`,
    { lang },
    signal
  );
