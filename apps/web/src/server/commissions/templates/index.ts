import { dailyChallenge } from './dailyChallenge';
import { login } from './login';
import { playCount } from './playCount';
import type { Template } from './types';

export const templates: Template[] = [...login, ...dailyChallenge, ...playCount];

export const byKey = new Map(templates.map((template) => [template.key, template]));
