import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from './config';

export interface DocMeta {
  slug: string;
  title: string;
  description: string;
  icon: string;
  colour: string;
  oldId: number | null;
}

// Docs are read from disk on every request, so a file dropped into the folder shows up straight away.
const folder = () => resolve(process.cwd(), config.docsPath, 'en');

// Front matter is optional: a plain markdown file works with the file name as its title.
function parse(slug: string, raw: string) {
  const text = (raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw).replaceAll('\r\n', '\n');
  const front = text.match(/^---\n([\s\S]*?)\n---\n?/);
  const fields: Record<string, string> = {};
  for (const line of front?.[1].split('\n') ?? []) {
    const [name, ...rest] = line.split(':');
    if (name && rest.length) fields[name.trim()] = rest.join(':').trim().replace(/^"|"$/g, '');
  }
  const meta: DocMeta = {
    slug,
    title: fields.title || slug,
    description: fields.description ?? '',
    icon: fields.icon || 'book',
    colour: fields.colour || 'blue',
    oldId: fields.old_id ? Number(fields.old_id) : null
  };
  return { meta, body: front ? text.slice(front[0].length) : text };
}

const FIRST = ['rules', 'filters', 'bbcode'];

export async function listDocs() {
  const names = (await readdir(folder())).filter((name) => name.endsWith('.md'));
  const docs = await Promise.all(
    names.map(async (name) => {
      const slug = name.slice(0, -3);
      return parse(slug, await readFile(resolve(folder(), name), 'utf8')).meta;
    })
  );
  const rank = (slug: string) => (FIRST.includes(slug) ? FIRST.indexOf(slug) : FIRST.length);
  return docs.sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug));
}

export async function readDoc(slug: string) {
  // Only plain file names, so a request can't reach outside the folder.
  if (!/^[a-z0-9_-]+$/i.test(slug)) return null;
  const raw = await readFile(resolve(folder(), `${slug}.md`), 'utf8').catch(() => null);
  return raw === null ? null : parse(slug, raw);
}
