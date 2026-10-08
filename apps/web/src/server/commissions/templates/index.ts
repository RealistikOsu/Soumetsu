import { dailyChallenge } from './dailyChallenge';
import { login } from './login';
import { mapProperty } from './mapProperty';
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
  ...quality
];

export const byKey = new Map(templates.map((template) => [template.key, template]));
