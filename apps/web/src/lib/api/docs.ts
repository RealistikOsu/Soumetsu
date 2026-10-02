import { siteApi } from './site';

export interface DocMeta {
  slug: string;
  title: string;
  description: string;
  icon: string;
  colour: string;
  oldId: number | null;
}

export const docs = (signal?: AbortSignal) => siteApi.get<DocMeta[]>('/docs', undefined, signal);

export const doc = (slug: string, signal?: AbortSignal) =>
  siteApi.get<{ meta: DocMeta; body: string }>(`/docs/${slug}`, undefined, signal);
