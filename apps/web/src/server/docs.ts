import { createHash } from 'node:crypto';
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

const read = (slug: string, lang: string) =>
  readFile(resolve(folder(lang), `${slug}.md`), 'utf8').catch(() => null);

// Line endings and a BOM depend on the checkout, so they are left out before comparing.
const normalise = (raw: string) =>
  (raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw).replaceAll('\r\n', '\n');

// Front matter is optional: a plain markdown file works with the file name as its title.
function parse(slug: string, raw: string) {
  const text = normalise(raw);
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
  return { meta, fields, body: front ? text.slice(front[0].length) : text };
}

const FIRST = ['rules', 'filters', 'bbcode'];

export async function listDocs(lang: string | null) {
  const names = (await readdir(folder())).filter((name) => name.endsWith('.md'));
  const docs = await Promise.all(
    names.map(async (name) => {
      const slug = name.slice(0, -3);
      const raw = (await read(slug, language(lang))) ?? (await read(slug, 'en')) ?? '';
      return parse(slug, raw).meta;
    })
  );
  const rank = (slug: string) => (FIRST.includes(slug) ? FIRST.indexOf(slug) : FIRST.length);
  return docs.sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug));
}

// A translation names the English file it was made from in reference_version (the MD5 of that file, as
// Hanayo did), so a later edit to the English page marks every translation of it as out of date.
export async function readDoc(slug: string, lang: string | null) {
  // Only plain file names, so a request can't reach outside the folder.
  if (!/^[a-z0-9_-]+$/i.test(slug)) return null;

  const english = await read(slug, 'en');
  const translated = language(lang) === 'en' ? null : await read(slug, language(lang));
  const raw = translated ?? english;
  if (raw === null) return null;

  const { meta, fields, body } = parse(slug, raw);
  const reference =
    english === null ? null : createHash('md5').update(normalise(english)).digest('hex');
  const outdated =
    translated !== null && reference !== null && fields.reference_version !== reference;
  return { meta, body, outdated };
}
