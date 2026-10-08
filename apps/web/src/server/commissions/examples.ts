import { fakeContext } from './context';
import { DEFAULT_SETTINGS } from './settings';
import { templates } from './templates';
import type { Params } from './templates/types';

export interface TemplateInfo {
  key: string;
  family: string;
  tier: string;
  example: Params | null;
}

// A typical mid-level player, so every template can roll an example for the admin panel to word.
const sample = fakeContext({
  usualStars: 5,
  topPp: () => 250,
  bestTopPp: () => ({ mode: 0, variant: 0, pp: 250 })
});

export function templateInfo(): TemplateInfo[] {
  return templates.map((template) => {
    let example: Params | null = null;
    try {
      example = template.roll(sample, DEFAULT_SETTINGS, () => 0.5);
    } catch {
      example = null;
    }
    return { key: template.key, family: template.family, tier: template.tier, example };
  });
}
