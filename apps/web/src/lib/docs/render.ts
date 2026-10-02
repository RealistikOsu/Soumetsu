import { Marked } from 'marked';
import markedFootnote from 'marked-footnote';
import { bbcodeToHtml } from '$lib/bbcode';
import { m } from '$lib/paraglide/messages';
import { sanitise } from '$lib/sanitise';

// Plain markdown works on its own. The extras are all optional and read as ordinary markdown elsewhere:
// GitHub callouts, tone and column comments, tables, and bbcode-example fences. See website-docs/README.md.

const callouts: Record<string, [string, string, () => string]> = {
  NOTE: ['c-blue', 'fa-circle-info', m.support_doc_callout_note],
  TIP: ['c-green', 'fa-lightbulb', m.support_doc_callout_tip],
  IMPORTANT: ['c-purple', 'fa-circle-exclamation', m.support_doc_callout_important],
  WARNING: ['c-yellow', 'fa-triangle-exclamation', m.support_doc_callout_warning],
  CAUTION: ['c-red', 'fa-hand', m.support_doc_callout_caution]
};

const escapeHtml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const slug = (text: string) =>
  text
    .replace(/<[^>]+>/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');

// Heading html reduced to its text, with entities like &amp; decoded.
const plainText = (html: string) =>
  new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';

function withCallouts(html: string) {
  return html.replace(
    /<blockquote>\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*([\s\S]*?)<\/blockquote>/g,
    (_, kind: string, rest: string) => {
      const [colour, icon, label] = callouts[kind];
      return `<div class="callout ${colour}"><p class="callout-title"><i class="fa-solid ${icon}"></i>${label()}</p><p>${rest}</div>`;
    }
  );
}

// A tone comment colours the heading after it and everything under it, up to the next heading of the
// same level or higher.
function withTones(html: string) {
  const parts = html.split(/(<!-- tone: \w+ -->\s*)?(?=<h[1-6][ >])/);
  const out: string[] = [];
  const open: number[] = [];
  let pending: string | null = null;

  for (const part of parts) {
    if (part === undefined) continue;
    const tone = part.match(/^<!-- tone: (\w+) -->\s*$/);
    if (tone) {
      pending = tone[1];
      continue;
    }
    const heading = part.match(/^<h([1-6])/);
    if (heading) {
      const level = Number(heading[1]);
      while (open.length && open[open.length - 1] >= level) {
        out.push('</section>');
        open.pop();
      }
      if (pending) {
        out.push(`<section class="tone tone-${pending}">`);
        open.push(level);
        pending = null;
      }
    }
    out.push(part);
  }
  return out.join('') + '</section>'.repeat(open.length);
}

export function renderDoc(markdown: string) {
  const examples: string[] = [];
  const source = markdown.replace(/```bbcode-example\n([\s\S]*?)\n```/g, (_, code: string) => {
    examples.push(
      `<div class="doc-bbcode-example"><pre class="doc-bbcode-example-source">${escapeHtml(code)}</pre><div class="doc-bbcode-example-preview">${bbcodeToHtml(code)}</div></div>`
    );
    return `\n\n@@BBCODE${examples.length - 1}@@\n\n`;
  });

  const marked = new Marked({ gfm: true }).use(markedFootnote());
  let html = marked.parse(source, { async: false });

  html = html.replace(/<p>@@BBCODE(\d+)@@<\/p>/g, (_, n: string) => examples[Number(n)]);
  html = withTones(withCallouts(html));
  html = html.replace(/<!-- columns -->\s*<ul>/g, '<ul class="columns">');

  const sections: { id: string; title: string }[] = [];
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, level: string, inner: string) => {
    const id = slug(inner);
    if (level === '2') sections.push({ id, title: plainText(inner) });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });

  return { html: sanitise(html), sections };
}
