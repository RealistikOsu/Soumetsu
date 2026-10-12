import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { mkdtemp, readdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Failure } from '$server/respond';

let dir = '';
mock.module('$server/config', () => ({
  config: {
    get newsPath() {
      return dir;
    },
    appBaseUrl: 'https://ussr.pl',
    docsPath: '../../website-docs'
  }
}));
mock.module('$server/db', () => ({ db: {} }));
mock.module('$server/admin/console', () => ({ record: async () => {} }));

const news = await import('./news');

const input = { title: 'Hello there', preview: 'A short preview.', body: 'Some **text**.' };

async function code(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    return error instanceof Failure ? error.code : String(error);
  }
  return null;
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'news-'));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('savePost', () => {
  test('writes a draft that reads back the same', async () => {
    await news.savePost('hello-there', input, 7);
    const post = await news.getPost('hello-there', { drafts: true });
    expect(post).toMatchObject({
      slug: 'hello-there',
      title: 'Hello there',
      preview: 'A short preview.',
      authorId: 7,
      cover: null,
      publishedAt: null,
      body: 'Some **text**.'
    });
    expect(await readdir(dir)).toEqual(['hello-there.md']);
  });

  test('keeps drafts out of the public list', async () => {
    await news.savePost('hello-there', input, 7);
    expect(await news.listPosts()).toEqual([]);
    expect(await news.listPosts({ drafts: true })).toHaveLength(1);
    expect(await news.getPost('hello-there')).toBeNull();
  });

  test('refuses bad slugs before touching the disk', async () => {
    for (const slug of ['../escape', 'Upper', 'ab', 'covers', 'a--b', `${'a'.repeat(81)}`]) {
      expect(await code(() => news.savePost(slug, input, 7))).toBe('auth.validation_error');
    }
    expect(await readdir(dir)).toEqual([]);
  });

  test('needs a title and a preview of at most 300 characters', async () => {
    expect(await code(() => news.savePost('abc', { ...input, title: ' ' }, 7))).toBe(
      'auth.validation_error'
    );
    expect(await code(() => news.savePost('abc', { ...input, preview: 'x'.repeat(301) }, 7))).toBe(
      'auth.validation_error'
    );
  });

  test('renames a draft, cover and all', async () => {
    await news.savePost('old-name', input, 7);
    await news.saveCover(
      'old-name',
      new File([new Uint8Array(10)], 'c.png', { type: 'image/png' })
    );
    await news.savePost('new-name', input, 7, 'old-name');
    expect((await readdir(dir)).sort()).toEqual(['new-name.md', 'new-name.png']);
    expect((await news.getPost('new-name', { drafts: true }))?.cover).toBe('new-name.png');
  });

  test('refuses to create over an existing post but plain saves update it', async () => {
    await news.savePost('live-post', input, 7);
    await news.publishPost('live-post');
    expect(
      await code(() => news.savePost('live-post', { ...input, title: 'Other' }, 7, undefined, true))
    ).toBe('news.slug_taken');
    expect((await news.getPost('live-post'))?.title).toBe('Hello there');
    await news.savePost('live-post', { ...input, title: 'Edited' }, 7);
    expect((await news.getPost('live-post'))?.title).toBe('Edited');
    await news.savePost('fresh-post', input, 7, undefined, true);
    expect(await news.getPost('fresh-post', { drafts: true })).not.toBeNull();
  });

  test('refuses to rename a published post or onto a taken slug', async () => {
    await news.savePost('live-post', input, 7);
    await news.publishPost('live-post');
    expect(await code(() => news.savePost('moved-post', input, 7, 'live-post'))).toBe(
      'news.slug_locked'
    );
    await news.savePost('other-post', input, 7);
    expect(await code(() => news.savePost('live-post', input, 7, 'other-post'))).toBe(
      'news.slug_taken'
    );
  });
});

describe('publishPost', () => {
  test('sets published_at once', async () => {
    await news.savePost('hello-there', input, 7);
    const first = await news.publishPost('hello-there');
    expect(first.publishedAt).not.toBeNull();
    const second = await news.publishPost('hello-there');
    expect(second.publishedAt).toBe(first.publishedAt);
  });

  test('says when there is nothing to publish', async () => {
    expect(await code(() => news.publishPost('missing'))).toBe('news.not_found');
  });
});

describe('listPosts', () => {
  test('orders newest first and skips broken files', async () => {
    await writeFile(
      join(dir, 'older.md'),
      '---\ntitle: Older\npreview: p\nauthor_id: 1\npublished_at: 2026-01-01T00:00:00Z\n---\nbody'
    );
    await writeFile(
      join(dir, 'newer.md'),
      '﻿---\r\ntitle: Newer\r\npreview: p\r\nauthor_id: 1\r\npublished_at: 2026-05-01T00:00:00Z\r\n---\r\nbody'
    );
    await writeFile(join(dir, 'no-title.md'), '---\npreview: p\n---\nbody');
    await writeFile(join(dir, 'Bad Name.md'), '---\ntitle: x\npreview: p\n---\nbody');
    const posts = await news.listPosts();
    expect(posts.map((p) => p.slug)).toEqual(['newer', 'older']);
    expect(posts[0].updatedAt).toBe('2026-05-01T00:00:00Z');
  });

  test('picks up a file changed on disk', async () => {
    await news.savePost('hello-there', input, 7);
    await news.publishPost('hello-there');
    expect((await news.listPosts())[0].title).toBe('Hello there');
    const path = join(dir, 'hello-there.md');
    const text = (await readFile(path, 'utf8')).replace('title: Hello there', 'title: Changed');
    await writeFile(path, text);
    const later = new Date(Date.now() + 5000);
    await utimes(path, later, later);
    expect((await news.listPosts())[0].title).toBe('Changed');
  });
});

describe('saveCover', () => {
  test('replaces a cover of another type', async () => {
    await news.savePost('hello-there', input, 7);
    await news.saveCover(
      'hello-there',
      new File([new Uint8Array(10)], 'a.png', { type: 'image/png' })
    );
    await news.saveCover(
      'hello-there',
      new File([new Uint8Array(10)], 'b.jpg', { type: 'image/jpeg' })
    );
    expect((await readdir(dir)).sort()).toEqual(['hello-there.jpg', 'hello-there.md']);
    expect((await news.getPost('hello-there', { drafts: true }))?.cover).toBe('hello-there.jpg');
  });

  test('refuses other types and big files', async () => {
    await news.savePost('hello-there', input, 7);
    const gif = new File([new Uint8Array(10)], 'a.gif', { type: 'image/gif' });
    expect(await code(() => news.saveCover('hello-there', gif))).toBe('users.invalid_file_format');
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'a.png', { type: 'image/png' });
    expect(await code(() => news.saveCover('hello-there', big))).toBe('users.invalid_file_format');
  });
});

describe('deletePost', () => {
  test('removes the post and its cover', async () => {
    await news.savePost('hello-there', input, 7);
    await news.saveCover(
      'hello-there',
      new File([new Uint8Array(10)], 'a.png', { type: 'image/png' })
    );
    await news.deletePost('hello-there');
    expect(await readdir(dir)).toEqual([]);
  });
});

describe('coverFile', () => {
  test('only serves cover-shaped names', async () => {
    expect(news.coverFile('hello-there.png')?.type).toBe('image/png');
    expect(news.coverFile('../x.png')).toBeNull();
    expect(news.coverFile('hello-there.md')).toBeNull();
  });
});
