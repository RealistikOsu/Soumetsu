import { dailyChallenge } from './dailyChallenge';
import { login } from './login';
import type { Template } from './types';

export const templates: Template[] = [...login, ...dailyChallenge];

export const byKey = new Map(templates.map((template) => [template.key, template]));
