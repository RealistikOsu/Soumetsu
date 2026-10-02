import createDOMPurify from 'dompurify';

// A port of Hanayo's modules/bbcode, so a userpage renders the same as on prod.

const emojiNames = [
  'akerino',
  'alien',
  'angel',
  'angry',
  'barney',
  'blink',
  'blush',
  'cheerful',
  'cool',
  'creepypeppy',
  'cwy',
  'devil',
  'dizzy',
  'djpeppy',
  'ermm',
  'face',
  'foka',
  'getlost',
  'grin',
  'happy',
  'heart',
  'kappa',
  'kappy',
  'kissing',
  'laughing',
  'ninja',
  'peppy',
  'peppyfiero',
  'pinch',
  'pouty',
  'sad',
  'shocked',
  'sick',
  'sideways',
  'silly',
  'sleeping',
  'smile',
  'tongue',
  'unsure',
  'w00t',
  'wassat',
  'whistling',
  'wink',
  'wub'
];

const emojiPattern = new RegExp(`:(${emojiNames.join('|')}):`, 'g');

const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&#34;')
    .replaceAll("'", '&#39;');

function isSafeUrl(raw: string) {
  try {
    return ['http:', 'https:'].includes(new URL(raw).protocol);
  } catch {
    return false;
  }
}

let counter = 0;
const identifier = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

function replaceWithId(
  text: string,
  pattern: RegExp,
  replacement: (groups: string[], id: string) => string
) {
  return text.replace(pattern, (...args) => {
    const groups = args.slice(
      0,
      args.findIndex((arg) => typeof arg === 'number')
    ) as string[];
    return replacement(groups, identifier());
  });
}

// A closing tag with no matching opening one would close the post's own wrapper early, so extras are dropped.
function replaceBalancedClose(text: string, close: RegExp, replacement: string, opens: number) {
  let count = 0;
  return text.replace(close, () => (++count > opens ? '' : replacement));
}

const pairs = (text: string, tags: [string, string][]) =>
  tags.reduce((result, [from, to]) => result.replaceAll(from, to), text);

const parseBold = (text: string) =>
  pairs(text, [
    ['[b]', '<strong>'],
    ['[/b]', '</strong>'],
    ['[bold]', '<strong>'],
    ['[/bold]', '</strong>']
  ]);

const parseCentre = (text: string) =>
  pairs(text, [
    ['[centre]', '<center>'],
    ['[/centre]', '</center>'],
    ['[center]', '<center>'],
    ['[/center]', '</center>']
  ]);

const parseHeading = (text: string) =>
  pairs(text, [['[heading]', '<h2>']]).replace(/\[\/heading\]\n?/g, '</h2>');

const parseItalic = (text: string) =>
  pairs(text, [
    ['[i]', '<em>'],
    ['[/i]', '</em>'],
    ['[italic]', '<em>'],
    ['[/italic]', '</em>']
  ]);

const parseStrike = (text: string) =>
  pairs(text, [
    ['[s]', '<strike>'],
    ['[/s]', '</strike>'],
    ['[strike]', '<strike>'],
    ['[/strike]', '</strike>']
  ]);

const parseUnderline = (text: string) =>
  pairs(text, [
    ['[u]', '<u>'],
    ['[/u]', '</u>'],
    ['[underline]', '<u>'],
    ['[/underline]', '</u>']
  ]);

const parseSpoiler = (text: string) =>
  pairs(text, [
    ['[spoiler]', "<span class='bbcode-spoiler'>"],
    ['[/spoiler]', '</span>']
  ]);

const parseNotice = (text: string) =>
  text.replace(/\[notice\]\n?(.*?)\n?\[\/notice\]\n?/gs, "<div class='bbcode-notice'>$1</div>");

const colourValue = /^(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]+|rgba?\(\d+,\s*\d+,\s*\d+(?:,\s*[\d.]+)?\))$/;

function parseColour(text: string) {
  const opened = text.replace(/\[(color|colour)=([^\]:]+)\]/g, (_, __, colour: string) =>
    colourValue.test(colour.trim()) ? `<span style='color: ${escapeHtml(colour)}'>` : ''
  );
  return opened.replace(/\[\/(color|colour)\]/g, '</span>');
}

const parseAudio = (text: string) =>
  text.replace(/\[audio\]([^[]+)\[\/audio\]\n?/g, (_, source: string) => {
    const src = source.trim();
    return isSafeUrl(src)
      ? `<audio controls='controls' preload='none' src='${escapeHtml(src)}'></audio>`
      : '';
  });

function parseUrl(text: string) {
  let result = text.replace(/\[url\](.+?)\[\/url\]/g, (_, raw: string) => {
    const href = raw.trim();
    if (!isSafeUrl(href)) return escapeHtml(raw);
    const escaped = escapeHtml(href);
    return `<a rel='nofollow' href='${escaped}'>${escaped}</a>`;
  });
  result = result.replace(/\[url=([^\]]+)\]/g, (_, raw: string) => {
    const href = raw.trim();
    return isSafeUrl(href) ? `<a rel='nofollow' href='${escapeHtml(href)}'>` : '';
  });
  return result.replaceAll('[/url]', '</a>');
}

function parseQuote(text: string) {
  return text
    .replace(
      /\[quote="([^:]+)"\]\s*/g,
      (_, who: string) => `<blockquote class='bbcode-blockquote'><h4>${escapeHtml(who)} wrote:</h4>`
    )
    .replace(/\[quote\]\s*/g, "<blockquote class='bbcode-blockquote'>")
    .replace(/\s*\[\/quote\]\n?/g, '</blockquote>');
}

// pt-based scale (size * 6pt, capped at 15) so old posts keep rendering at the same size.
function parseSize(text: string) {
  return text
    .replace(/\[size=(\d+)\]/g, (_, value: string) => {
      const size = Math.min(parseInt(value), 15);
      return size <= 0
        ? '<span>'
        : `<span style='font-size: ${size * 6}pt; line-height: ${size * 6}pt;'>`;
    })
    .replaceAll('[/size]', '</span>');
}

const parseEmail = (text: string) =>
  text
    .replace(/\[email\](([^[]+)@([^[]+))\[\/email\]/g, "<a rel='nofollow' href='mailto:$1'>$1</a>")
    .replace(/\[email=(([^[]+)@([^[]+))\]/g, "<a rel='nofollow' href='mailto:$1'>")
    .replaceAll('[/email]', '</a>');

const parseProfile = (text: string) =>
  text.replace(
    /\[profile(?:=([0-9]+))?\](.*?)\[\/profile\]/g,
    (_, id: string | undefined, label: string) => {
      const display = escapeHtml(label);
      return id ? `<a href='/u/${id}'>${display}</a>` : `<a href='/u/${display}'>/u/${display}</a>`;
    }
  );

function parseImage(text: string) {
  const image = (raw: string) => {
    let decoded = raw.trim();
    try {
      decoded = decodeURIComponent(decoded.replaceAll('+', ' '));
    } catch {
      // keep the raw value
    }
    return isSafeUrl(decoded) ? `<img src='${escapeHtml(decoded)}' loading='lazy'/>` : '';
  };
  return text
    .replace(/\[img\]([^[]+)\[\/img\]/g, (_, raw: string) => image(raw))
    .replace(/\[img=([^[]+)\]\[\/img\]/g, (_, raw: string) => image(raw));
}

const listStyles: Record<string, string> = {
  a: 'lower-alpha',
  A: 'upper-alpha',
  i: 'lower-roman',
  I: 'upper-roman',
  1: 'decimal'
};

function parseList(text: string) {
  const ordered = (_: string, style: string) =>
    `<ol style='list-style-type: ${listStyles[style]};'><li>`;
  return text
    .replace(/\[list=(a|A|i|I|1)\]\s*\[\*\]/g, ordered)
    .replace(/\[list style=(a|A|i|I|1)\]\s*\[\*\]/g, ordered)
    .replace(/\[list=[^\]]+\]\s*\[\*\]/g, '<ol><li>')
    .replace(/\[list\]\s*\[\*\]/g, "<ol style='list-style-type: disc;'><li>")
    .replace(/\[\/\*(:m)?\]\n?\n?/g, '</li>')
    .replace(/\s*\[\*\]/g, '<li>')
    .replace(/\s*\[\/list\]\n?\n?/g, '</ol>')
    .replace(
      /\[list=[^\]]+\](.+?)(<li>|<\/ol>)/g,
      "<ul class='bbcode-list-title'><li>$1</li></ul><ol>$2"
    )
    .replace(
      /\[list\](.+?)(<li>|<\/ol>)/g,
      "<ul class='bbcode-list-title'><li>$1</li></ul><ol style='list-style-type: disc;'>$2"
    );
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function parseImagemap(text: string) {
  const block = /\[imagemap\]\s+(?<url>\S+)\s+(?<lines>.*?)\s*\[\/imagemap\]\n?/gs;
  return text.replace(block, (...args) => {
    const { url, lines } = args.at(-1) as { url: string; lines: string };
    const imageUrl = url.trim();
    if (!isSafeUrl(imageUrl)) return '';

    let html = `<div class='bbcode-imagemap'><img src='${escapeHtml(imageUrl)}' class='bbcode-imagemap-image' loading='lazy'>`;
    const line =
      /^\s*(?<x>\S+)\s+(?<y>\S+)\s+(?<width>\S+)\s+(?<height>\S+)\s+(?<redirect>\S+)\s+(?<title>.+?)\s*$/gm;
    for (const match of lines.matchAll(line)) {
      const g = match.groups!;
      const number = (value: string) => parseFloat(value) || 0;
      const y = clamp(number(g.y), 0, 100);
      const linked = g.redirect !== '#' && isSafeUrl(g.redirect);
      const tag = linked ? 'a' : 'span';
      const href = linked ? escapeHtml(g.redirect) : g.redirect === '#' ? '#' : '';
      html +=
        `<${tag} class='bbcode-imagemap-tooltip' href='${href}' ` +
        `style='left: ${clamp(number(g.x), 0, 100)}%; top: ${y}%; width: ${clamp(number(g.width), 0, 100)}%; height: ${clamp(number(g.height), 0, 100)}%;' ` +
        `data-tooltip='${escapeHtml(g.title)}' data-position='${y < 13 ? 'bottom center' : 'top center'}'></${tag}>`;
    }
    return `${html}</div>`.replaceAll('\n', '');
  });
}

const boxButton = (id: string, title: string) =>
  `<div class='bbcode-box'><button class='bbcode-box-btn' id='btn-${id}' type='button' data-bbcode-box-toggle='true'>` +
  `<i id='icon-${id}' class='bbcode-box-icon fa-solid fa-angle-right'></i><span>${title}</span></button>` +
  `<div class='bbcode-box-content bbcode-hidden' id='content-${id}'>`;

function parseBox(text: string) {
  let boxes = 0;
  let result = replaceWithId(text, /\[box=((?:[^[\]]|\[[^\]]*\])*?)\]\n*/g, (groups, id) => {
    boxes++;
    return boxButton(id, escapeHtml(groups[1]));
  });
  result = replaceBalancedClose(result, /\n*\[\/box\]\n?/g, '</div></div>', boxes);

  let spoilers = 0;
  result = replaceWithId(result, /\[spoilerbox\]\n*/g, (_, id) => {
    spoilers++;
    return boxButton(id, 'SPOILER');
  });
  return replaceBalancedClose(result, /\n*\[\/spoilerbox\]\n?/g, '</div></div>', spoilers);
}

const youtubeOpen =
  "<div class='bbcode-video-box'><div class='bbcode-video'><iframe src='https://www.youtube.com/embed/";

function parseYoutube(text: string) {
  return text
    .replace(/\[youtube\]https:\/\/(.*)youtube\.com\/watch\?v=([^&]+)/g, `${youtubeOpen}$2`)
    .replace(/\[youtube\]https:\/\/(.*)youtu\.be\/([^?]+)/g, `${youtubeOpen}$2`)
    .replace(/\[youtube\]https:\/\/(.*)youtube\.com\/embed\/([^?]+)/g, `${youtubeOpen}$2`)
    .replace(/\[youtube\](.*)/g, `${youtubeOpen}$1`)
    .replace(/\[\/youtube\]\n?/g, "?rel=0' frameborder='0' allowfullscreen></iframe></div></div>");
}

const twitchOpen =
  "<div class='bbcode-video-box'><div class='bbcode-video'><iframe src='https://clips.twitch.tv/embed?clip=";

function parseTwitch(text: string) {
  return text
    .replace(/\[twitch\]https:\/\/(.*)\.twitch\.tv\/(.*)\/clip\/([^?]+)/g, `${twitchOpen}$3`)
    .replace(/\[twitch\](.*)/g, `${twitchOpen}$1`)
    .replace(
      /\[\/twitch\]\n?/g,
      `&parent=${location.host}' frameborder='0' allowfullscreen></iframe></div></div>`
    );
}

// [code] shows its content literally, so it is pulled out before any other tag is parsed.
function extractCodeBlocks(text: string) {
  const blocks = new Map<string, string>();
  const rest = text.replace(
    /\[(code|c)\]\n?(.*?)\n?\[\/(code|c)\]\n?/gs,
    (_, __, content: string) => {
      const placeholder = `${identifier()}`;
      blocks.set(placeholder, content);
      return placeholder;
    }
  );
  return { rest, blocks };
}

function restoreCodeBlocks(text: string, blocks: Map<string, string>) {
  let result = text;
  for (const [placeholder, content] of blocks) {
    result = result.replace(
      placeholder,
      () => `<pre><code class='bbcode-code'>${escapeHtml(content)}</code></pre>`
    );
  }
  return result;
}

const parseSeparator = (text: string) => text.replaceAll('[hr]', "<div class='ui divider'></div>");

function parseContainer(text: string) {
  let opens = 0;
  const result = text.replace(/\[container(.*?)\]/g, (_, raw: string) => {
    opens++;
    let style = '';
    let className = '';
    for (const arg of raw.trim().split(' ')) {
      const [name, value] = arg.split('=');
      if (name === 'compact') className += 'compact-container';
      else if (name === 'center' || name === 'centre') style += 'margin: 0 auto;';
      else if (name === 'width' && /^\d+$/.test(value ?? ''))
        style += `width: ${parseInt(value)}px;`;
    }
    return `<div class='${className}' style='${style}'>`;
  });
  return replaceBalancedClose(result, /\[\/container\]/g, '</div>', opens);
}

function parseAligned(text: string, tag: 'left' | 'right') {
  const opens = text.match(new RegExp(`\\[${tag}\\]`, 'g'))?.length ?? 0;
  const opened = text.replace(new RegExp(`\\[${tag}\\]`, 'g'), `<div style='text-align: ${tag};'>`);
  return replaceBalancedClose(opened, new RegExp(`\\[\\/${tag}\\]`, 'g'), '</div>', opens);
}

let purifier: ReturnType<typeof createDOMPurify> | undefined;

function sanitiser() {
  if (purifier) return purifier;
  const instance = createDOMPurify(window);
  const embeds = ['https://www.youtube.com/embed/', 'https://clips.twitch.tv/embed'];

  instance.addHook('afterSanitizeAttributes', (node) => {
    if (
      node.tagName === 'IFRAME' &&
      !embeds.some((prefix) => node.getAttribute('src')?.startsWith(prefix))
    ) {
      node.remove();
      return;
    }
    if (node.tagName === 'A') node.setAttribute('rel', 'nofollow noopener');
    const style = node.getAttribute('style');
    if (style && /url\(|expression|position\s*:\s*(fixed|absolute|sticky)/i.test(style)) {
      node.removeAttribute('style');
    }
  });
  purifier = instance;
  return instance;
}

export function bbcodeToHtml(source: string) {
  const { rest, blocks } = extractCodeBlocks(source);
  let text = rest.replace(
    emojiPattern,
    "<img src='/img/emotes/$1.png' class='bbcode-emoji' loading='lazy'/>"
  );

  // block
  text = parseImagemap(text);
  text = parseBox(text);
  text = parseList(text);
  text = parseNotice(text);
  text = parseQuote(text);
  text = parseHeading(text);
  text = parseContainer(text);

  // inline
  text = parseAudio(text);
  text = parseBold(text);
  text = parseCentre(text);
  text = parseColour(text);
  text = parseEmail(text);
  text = parseImage(text);
  text = parseItalic(text);
  text = parseSize(text);
  text = parseSpoiler(text);
  text = parseStrike(text);
  text = parseUnderline(text);
  text = parseUrl(text);
  text = parseSeparator(text);
  text = parseYoutube(text);
  text = parseTwitch(text);
  text = parseProfile(text);
  text = parseAligned(text, 'left');
  text = parseAligned(text, 'right');

  text = text.replaceAll('\n', '<br>');
  text = restoreCodeBlocks(text, blocks);

  // The parser closes anything left open inside this wrapper, so it can't leak into the page.
  return sanitiser().sanitize(`<div class='bbcode-container'>${text}</div>`, {
    ADD_TAGS: ['iframe', 'center'],
    ADD_ATTR: [
      'allowfullscreen',
      'frameborder',
      'controls',
      'preload',
      'loading',
      'data-bbcode-box-toggle',
      'data-tooltip',
      'data-position'
    ]
  });
}

// Boxes and spoiler boxes open and close from a click on their button.
export function bbcodeBoxes(node: HTMLElement) {
  const onClick = (event: MouseEvent) => {
    const button = (event.target as Element).closest('[data-bbcode-box-toggle]');
    if (!button) return;
    const box = button.parentElement!;
    box.querySelector('.bbcode-box-content')?.classList.toggle('bbcode-hidden');
    box.classList.toggle('open');
  };
  node.addEventListener('click', onClick);
  return { destroy: () => node.removeEventListener('click', onClick) };
}
