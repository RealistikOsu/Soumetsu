import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PREVIEW_MAX } from '$lib/news';
import { config } from './config';
import { db } from './db';
import { frontMatter } from './docs';
import { Failure } from './respond';

export interface NewsPost {
  slug: string;
  title: string;
  preview: string;
  authorId: number;
  cover: string | null;
  publishedAt: string | null;
  updatedAt: string;
  body: string;
}

export type NewsInput = { title: string; preview: string; body: string };

export interface PublicPost {
  slug: string;
  title: string;
  preview: string;
  cover_url: string | null;
  author: { id: number; username: string } | null;
  published_at: string;
  updated_at: string;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COVER_MAX = 5 * 1024 * 1024;
const COVER_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};
const COVER_EXTENSIONS = Object.fromEntries(Object.entries(COVER_TYPES).map(([t, e]) => [e, t]));

const folder = () => resolve(process.cwd(), config.newsPath);
const pathOf = (name: string) => resolve(folder(), name);

const validSlug = (slug: string) =>
  slug.length >= 3 && slug.length <= 80 && SLUG.test(slug) && slug !== 'covers';

function checkSlug(slug: string) {
  if (!validSlug(slug)) throw new Failure(400, 'auth.validation_error');
}

// One line per value: a stray newline would end the front matter early.
const oneLine = (value: string) => value.replace(/\s*\n\s*/g, ' ').trim();

function serialise(post: NewsPost) {
  return [
    '---',
    `title: ${oneLine(post.title)}`,
    `preview: ${oneLine(post.preview)}`,
    `author_id: ${post.authorId}`,
    `cover: ${post.cover ?? ''}`,
    `published_at: ${post.publishedAt ?? ''}`,
    `updated_at: ${post.updatedAt}`,
    '---',
    post.body
  ].join('\n');
}

function parse(slug: string, raw: string): NewsPost | null {
  const { fields, body } = frontMatter(raw);
  if (!validSlug(slug) || !fields.title) return null;
  const publishedAt = fields.published_at || null;
  return {
    slug,
    title: fields.title,
    preview: fields.preview ?? '',
    authorId: Number(fields.author_id) || 0,
    cover: fields.cover || null,
    publishedAt,
    updatedAt: fields.updated_at || publishedAt || '',
    body
  };
}

// Every file is re-read only when its mtime moves, so hand edits on the server show up straight away.
const cache = new Map<string, { mtime: number; post: NewsPost | null }>();

async function load(name: string) {
  const info = await stat(pathOf(name)).catch(() => null);
  if (!info) return null;
  const hit = cache.get(name);
  if (hit && hit.mtime === info.mtimeMs) return hit.post;
  const post = parse(name.slice(0, -'.md'.length), await readFile(pathOf(name), 'utf8'));
  if (!post) console.warn(`news: skipping ${name}, it has no title or its name isn't a slug`);
  cache.set(name, { mtime: info.mtimeMs, post });
  return post;
}

const sortKey = (post: NewsPost) => Date.parse(post.publishedAt ?? post.updatedAt) || 0;

export async function listPosts({ drafts = false } = {}) {
  const names = await readdir(folder()).catch(() => [] as string[]);
  const posts = await Promise.all(names.filter((n) => n.endsWith('.md')).map(load));
  return posts
    .filter((post): post is NewsPost => post !== null && (drafts || post.publishedAt !== null))
    .sort((a, b) => sortKey(b) - sortKey(a));
}

export async function getPost(slug: string, { drafts = false } = {}) {
  if (!validSlug(slug)) return null;
  const post = await load(`${slug}.md`);
  return post && (drafts || post.publishedAt) ? post : null;
}

async function write(name: string, data: string | Uint8Array) {
  await mkdir(folder(), { recursive: true });
  const temp = pathOf(`${name}.tmp`);
  await writeFile(temp, data);
  await rename(temp, pathOf(name));
}

// Two writes inside one millisecond keep the same mtime, so the cache is set here rather than trusted to notice.
async function writePost(post: NewsPost) {
  const name = `${post.slug}.md`;
  await write(name, serialise(post));
  cache.set(name, { mtime: (await stat(pathOf(name))).mtimeMs, post });
  return post;
}

async function removeCovers(slug: string, keep?: string) {
  await Promise.all(
    Object.keys(COVER_EXTENSIONS)
      .map((ext) => `${slug}.${ext}`)
      .filter((name) => name !== keep)
      .map((name) => rm(pathOf(name), { force: true }))
  );
}

async function existing(slug: string) {
  const post = await getPost(slug, { drafts: true });
  if (!post) throw new Failure(404, 'news.not_found');
  return post;
}

export async function savePost(
  slug: string,
  input: NewsInput,
  authorId: number,
  previous?: string,
  create = false
) {
  checkSlug(slug);
  const title = oneLine(input.title ?? '');
  const preview = oneLine(input.preview ?? '');
  if (!title || !preview || preview.length > PREVIEW_MAX) {
    throw new Failure(400, 'auth.validation_error');
  }

  let before = await getPost(slug, { drafts: true });
  if (create && before) throw new Failure(409, 'news.slug_taken');
  if (previous && previous !== slug) {
    const old = await existing(previous);
    // Lazer and shared links point at a published slug.
    if (old.publishedAt) throw new Failure(409, 'news.slug_locked');
    if (before) throw new Failure(409, 'news.slug_taken');
    if (old.cover) {
      const moved = `${slug}.${old.cover.split('.').pop()}`;
      await rename(pathOf(old.cover), pathOf(moved));
      old.cover = moved;
    }
    await rm(pathOf(`${previous}.md`), { force: true });
    cache.delete(`${previous}.md`);
    before = old;
  }

  return writePost({
    slug,
    title,
    preview,
    authorId: before?.authorId || authorId,
    cover: before?.cover ?? null,
    publishedAt: before?.publishedAt ?? null,
    updatedAt: new Date().toISOString(),
    body: input.body ?? ''
  });
}

export async function publishPost(slug: string) {
  const post = await existing(slug);
  if (post.publishedAt) return post;
  const now = new Date().toISOString();
  return writePost({ ...post, publishedAt: now, updatedAt: now });
}

export async function deletePost(slug: string) {
  checkSlug(slug);
  await rm(pathOf(`${slug}.md`), { force: true });
  cache.delete(`${slug}.md`);
  await removeCovers(slug);
}

export async function saveCover(slug: string, file: File) {
  const post = await existing(slug);
  const ext = COVER_TYPES[file.type];
  if (!ext || file.size > COVER_MAX) throw new Failure(400, 'users.invalid_file_format');
  const name = `${slug}.${ext}`;
  await write(name, new Uint8Array(await file.arrayBuffer()));
  await removeCovers(slug, name);
  return writePost({ ...post, cover: name, updatedAt: new Date().toISOString() });
}

export function coverFile(name: string) {
  const match = name.match(/^([a-z0-9-]+)\.(jpg|png|webp)$/);
  if (!match || !validSlug(match[1])) return null;
  return { path: pathOf(name), type: COVER_EXTENSIONS[match[2]] };
}

export async function authorsOf(posts: NewsPost[]) {
  const ids = [...new Set(posts.map((p) => p.authorId).filter((id) => id > 0))];
  if (!ids.length) return new Map<number, string>();
  const users = await db.users.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true }
  });
  return new Map(users.map((u) => [u.id, u.username]));
}

export function publicPost(post: NewsPost, authors: Map<number, string>): PublicPost {
  const username = authors.get(post.authorId);
  return {
    slug: post.slug,
    title: post.title,
    preview: post.preview,
    cover_url: post.cover ? `${config.appBaseUrl}/news/covers/${post.cover}` : null,
    author: username ? { id: post.authorId, username } : null,
    published_at: post.publishedAt ?? post.updatedAt,
    updated_at: post.updatedAt
  };
}
