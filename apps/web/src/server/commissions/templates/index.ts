import { dailyChallenge } from './dailyChallenge';
import { casino } from './casino';
import { leaderboard } from './leaderboard';
import { login } from './login';
import { mapProperty } from './mapProperty';
import { meme } from './meme';
import { mods } from './mods';
import { multiplayer } from './multiplayer';
import { playCount } from './playCount';
import { quality } from './quality';
import { session } from './session';
import type { Template } from './types';

export const templates: Template[] = [
  ...login,
  ...dailyChallenge,
  ...playCount,
  ...mapProperty,
  ...session,
  ...quality,
  ...mods,
  ...leaderboard,
  ...multiplayer,
  ...casino,
  ...meme
];

export const byKey = new Map(templates.map((template) => [template.key, template]));
