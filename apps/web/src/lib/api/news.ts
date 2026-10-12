import type { NewsArticle, NewsSummary, StaffPost } from '$lib/news';
import { siteApi } from './site';

export const NEWS_PAGE_SIZE = 12;

export const newsList = (page: number, signal?: AbortSignal, limit = NEWS_PAGE_SIZE) =>
  siteApi.get<{ posts: NewsSummary[]; total: number }>('/news', { page, limit }, signal);
export const newsPost = (slug: string, signal?: AbortSignal) =>
  siteApi.get<NewsArticle>(`/news/${slug}`, undefined, signal);

export const staffNews = (signal?: AbortSignal) =>
  siteApi.get<StaffPost[]>('/admin/news', undefined, signal);
export const saveNews = (
  slug: string,
  body: { title: string; preview: string; body: string; previous?: string }
) => siteApi.put<StaffPost>(`/admin/news/${slug}`, body);
export const publishNews = (slug: string) => siteApi.post<StaffPost>(`/admin/news/${slug}/publish`);
export const deleteNews = (slug: string) => siteApi.delete(`/admin/news/${slug}`);
export const uploadNewsCover = (slug: string, file: File) =>
  siteApi.upload<StaffPost>(`/admin/news/${slug}/cover`, file);
