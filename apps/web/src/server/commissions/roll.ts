import type { PlayerContext } from './context';
import type { Settings } from './settings';
import type { Params, Template } from './templates/types';

export interface Rolled {
  template: string;
  params: Params;
  points: number;
  target: number;
}

function weighted(candidates: Template[], settings: Settings, random: () => number) {
  const weights = candidates.map((candidate) => settings.weights[candidate.key] ?? 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return null;
  let roll = random() * total;
  for (const [index, candidate] of candidates.entries()) {
    roll -= weights[index];
    if (roll < 0) return candidate;
  }
  return candidates[candidates.length - 1];
}

// The most points the remaining slots can still earn, taking at most one template per family.
function ceiling(candidates: Template[], settings: Settings, slots: number, excludeFamily: string) {
  const best = new Map<string, number>();
  for (const candidate of candidates) {
    if (candidate.family === excludeFamily) continue;
    const points = settings.tierPoints[candidate.tier];
    best.set(candidate.family, Math.max(best.get(candidate.family) ?? 0, points));
  }
  return [...best.values()]
    .sort((a, b) => b - a)
    .slice(0, slots)
    .reduce((sum, points) => sum + points, 0);
}

// Picks tasksPerDay templates from distinct families. A candidate is only considered if the day can still reach
// minDayPoints after it, so a full bar never depends on rolling every task.
export function rollDay(
  templates: Template[],
  ctx: PlayerContext,
  settings: Settings,
  random = Math.random
): Rolled[] {
  const rolled: Rolled[] = [];
  const usedFamilies = new Set<string>();
  const skipped = new Set<string>();
  let points = 0;

  while (rolled.length < settings.tasksPerDay) {
    const slotsLeft = settings.tasksPerDay - rolled.length;
    const needed = settings.minDayPoints - points;
    let candidates = templates.filter(
      (candidate) =>
        !usedFamilies.has(candidate.family) &&
        !skipped.has(candidate.key) &&
        (settings.weights[candidate.key] ?? 1) > 0
    );
    if (!candidates.length) break;

    const fits = candidates.filter(
      (candidate) =>
        settings.tierPoints[candidate.tier] +
          ceiling(candidates, settings, slotsLeft - 1, candidate.family) >=
        needed
    );
    if (fits.length) candidates = fits;

    const chosen = weighted(candidates, settings, random);
    if (!chosen) break;
    const params = chosen.roll(ctx, settings, random);
    if (params === null) {
      skipped.add(chosen.key);
      continue;
    }
    const taskPoints = settings.tierPoints[chosen.tier];
    rolled.push({
      template: chosen.key,
      params,
      points: taskPoints,
      target: chosen.target(params)
    });
    usedFamilies.add(chosen.family);
    points += taskPoints;
  }
  return rolled;
}

// Stands in for a task whose template was switched off after the day was rolled. A template from the same tier is
// preferred so the task keeps feeling like the one it replaces; the caller keeps the old points either way.
export function rollReplacement(
  templates: Template[],
  ctx: PlayerContext,
  settings: Settings,
  tier: Template['tier'] | undefined,
  usedFamilies: Set<string>,
  random = Math.random
): Rolled | null {
  const skipped = new Set<string>();
  const open = (candidate: Template) =>
    !usedFamilies.has(candidate.family) &&
    !skipped.has(candidate.key) &&
    (settings.weights[candidate.key] ?? 1) > 0;

  for (;;) {
    const candidates = templates.filter(open);
    const sameTier = candidates.filter((candidate) => candidate.tier === tier);
    const chosen = weighted(sameTier.length ? sameTier : candidates, settings, random);
    if (!chosen) return null;
    const params = chosen.roll(ctx, settings, random);
    if (params === null) {
      skipped.add(chosen.key);
      continue;
    }
    return {
      template: chosen.key,
      params,
      points: settings.tierPoints[chosen.tier],
      target: chosen.target(params)
    };
  }
}
