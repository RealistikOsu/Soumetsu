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
// English is the full set; another language's folder only needs the docs that have been translated.
const folder = (lang = 'en') => resolve(process.cwd(), config.docsPath, lang);

const language = (lang: string | null) => (lang && /^[a-z]{2}$/.test(lang) ? lang : 'en');

async function readLocalised(slug: string, lang: string) {
  const translated =
    lang === 'en'
      ? null
      : await readFile(resolve(folder(lang), `${slug}.md`), 'utf8').catch(() => null);
  return translated ?? (await readFile(resolve(folder(), `${slug}.md`), 'utf8').catch(() => null));
}

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

export async function listDocs(lang: string | null) {
  const names = (await readdir(folder())).filter((name) => name.endsWith('.md'));
  const docs = await Promise.all(
    names.map(async (name) => {
      const slug = name.slice(0, -3);
      return parse(slug, (await readLocalised(slug, language(lang))) ?? '').meta;
    })
  );
  const rank = (slug: string) => (FIRST.includes(slug) ? FIRST.indexOf(slug) : FIRST.length);
  return docs.sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug));
}

export async function readDoc(slug: string, lang: string | null) {
  // Only plain file names, so a request can't reach outside the folder.
  if (!/^[a-z0-9_-]+$/i.test(slug)) return null;
  const raw = await readLocalised(slug, language(lang));
  return raw === null ? null : parse(slug, raw);
}
