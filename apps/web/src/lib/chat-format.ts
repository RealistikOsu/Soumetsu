// osu! chat text: /me and /np arrive as a CTCP ACTION (\x01ACTION ...\x01), and links are written
// [url label] or left bare.

export type ChatPart = { text: string } | { text: string; href: string; external: boolean };

const ACTION_START = '\x01ACTION ';
const LINK = /\[((?:https?|osump):\/\/\S+) ([^\]]+)\]|((?:https?|osump):\/\/[^\s\]]+)/g;

// Beatmap links from the game or any osu! site open the map here instead.
function localHref(url: string) {
  const match = url.match(
    /^https?:\/\/[^/]+\/(?:beatmapsets\/(\d+)(?:#\/?(?:\w+\/)?(\d+))?|b\/(\d+)|beatmaps\/(\d+)|s\/(\d+))/
  );
  if (!match) return null;
  const [, set, diff, b, beatmap, s] = match;
  if (diff || b || beatmap) return `/b/${diff ?? b ?? beatmap}`;
  return `/beatmapsets/${set ?? s}`;
}

export function parseChat(content: string) {
  const action = content.startsWith(ACTION_START) && content.endsWith('\x01');
  const text = action ? content.slice(ACTION_START.length, -1) : content;
  const parts: ChatPart[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    const url = match[1] ?? match[3];
    const local = localHref(url);
    parts.push({ text: match[2] ?? url, href: local ?? url, external: !local });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return { action, parts };
}

// The conversation list shows a one-line preview, without the link markup.
export const chatPreview = (content: string) =>
  parseChat(content)
    .parts.map((part) => part.text)
    .join('');
