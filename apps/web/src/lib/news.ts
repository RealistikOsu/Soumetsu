export const PREVIEW_MAX = 300;

// Lowercase words joined by dashes, the only shape a slug may take.
export const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');

export interface NewsSummary {
  slug: string;
  title: string;
  preview: string;
  cover_url: string | null;
  author: { id: number; username: string } | null;
  published_at: string;
  updated_at: string;
}

export type NewsArticle = NewsSummary & { body: string };

export type NewsArchiveEntry = Pick<NewsSummary, 'slug' | 'title' | 'published_at'>;

export interface StaffPost {
  slug: string;
  title: string;
  preview: string;
  authorId: number;
  cover: string | null;
  publishedAt: string | null;
  updatedAt: string;
  body: string;
}
