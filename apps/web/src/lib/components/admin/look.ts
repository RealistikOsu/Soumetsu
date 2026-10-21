// An icon and colour for a log line, picked from the words it uses.
const looks: [RegExp, string, string][] = [
  [/unrestrict|unban|unfr|unsilence/i, 'c-green', 'fa-rotate-left'],
  [/restrict/i, 'c-orange', 'fa-circle-exclamation'],
  [/\bban(ned|s)?\b/i, 'c-red', 'fa-ban'],
  [/silence/i, 'c-purple', 'fa-comment-slash'],
  [/froze|freez/i, 'c-lblue', 'fa-snowflake'],
  [/\branked|qualif/i, 'c-lblue', 'fa-angles-up'],
  [/loved/i, 'c-pink', 'fa-heart'],
  [/unrank/i, 'c-grey', 'fa-xmark'],
  [/donor|supporter/i, 'c-yellow', 'fa-heart'],
  [/privilege/i, 'c-red', 'fa-key'],
  [/badge/i, 'c-yellow', 'fa-certificate'],
  [/bancho|setting/i, 'c-orange', 'fa-sliders'],
  [/wipe|rollback|roll back|delet/i, 'c-red', 'fa-eraser'],
  [/clan/i, 'c-purple', 'fa-shield-halved'],
  [/news|post/i, 'c-blue', 'fa-newspaper'],
  [/edit|chang|rename|password/i, 'c-blue', 'fa-pen']
];

export function logLook(text: string) {
  const hit = looks.find(([pattern]) => pattern.test(text));
  return { colour: hit?.[1] ?? 'c-grey', icon: hit?.[2] ?? 'fa-circle-dot' };
}
