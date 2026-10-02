import { m } from '$lib/paraglide/messages';

// Prod's rules for a new password: at least 8 characters, and not one of the 10,000 most common.
// The list is large, so it is only loaded on pages with a new-password field.
export async function passwordProblem(password: string) {
  if (password.length < 8) {
    return m.auth_password_too_short();
  }
  const { default: common } = await import('./top.json');
  if ((common as string[]).includes(password)) {
    return m.auth_password_common();
  }
  return null;
}

// Prod's username rule, with the dash escaped as the v flag needs.
export const usernamePattern = new RegExp(String.raw`^[A-Za-z0-9 _\[\]\-]{2,15}$`, 'v');

export function usernameProblem(username: string) {
  if (!usernamePattern.test(username)) {
    return m.auth_username_invalid();
  }
  if (username.includes('_') && username.includes(' ')) {
    return m.auth_username_mixed();
  }
  return null;
}

export const forbiddenUsernames = new Set([
  'whitecat',
  'merami',
  'ppy',
  'peppy',
  'varvallian',
  'spare',
  'beasttroll',
  'beasttrollmc',
  'wubwubwolf',
  'whitew0lf',
  'vaxei',
  'alumetri',
  'mathi',
  'flyingtuna',
  'idke',
  'fgsky',
  'dxrkify',
  'karthy',
  'osu!',
  'freddie benson',
  'micca',
  'ryuk',
  'azr8',
  'toy',
  'fieryrage',
  'firebat92',
  'umbre',
  'mouseeasy',
  'bartek22830',
  'gashi',
  'moeyandere',
  'piggey',
  'angelism',
  'cookiezi',
  'nathan on osu',
  'chocomint',
  'wakson',
  'karuna',
  'monko2k',
  'koifishu',
  'bananya',
  'hvick',
  'hvick225',
  'sotarks',
  'rrtyui',
  'armin',
  'a r m i n',
  'rustbell',
  'thelewa',
  'happystick',
  'cptnxn',
  'reimu-desu',
  'bahamete',
  'azer',
  'axarious',
  'oxycodone',
  'sayonara-bye',
  'sapphireghost',
  'adamqs',
  '_index',
  '-gn',
  'rafis'
]);

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
