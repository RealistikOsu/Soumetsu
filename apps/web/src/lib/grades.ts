import type { Score } from '$lib/api/scores';
import { hasMod } from '$lib/mods';

export type GradeName = 'SS' | 'SSH' | 'S' | 'SH' | 'A' | 'B' | 'C' | 'D';

// The classes are the colour keys in the stylesheet: gold, silver, then one per letter.
export const gradeClass: Record<GradeName, string> = {
  SS: 'x',
  SSH: 'xh',
  S: 'x',
  SH: 'xh',
  A: 'a',
  B: 'b',
  C: 'c',
  D: 'd'
};

export const gradeLabel = (grade: GradeName) => grade.replace('H', '');

export function gradeOf(
  score: Pick<
    Score,
    | 'completed'
    | 'mods'
    | 'play_mode'
    | 'count_300'
    | 'count_100'
    | 'count_50'
    | 'count_misses'
    | 'accuracy'
  >
): GradeName {
  if (score.completed < 1) return 'D';
  const silver = hasMod(score.mods, 'HD') || hasMod(score.mods, 'FL');
  const named = (name: 'SS' | 'S') => (silver ? (`${name}H` as GradeName) : name);

  const hits = score.count_300 + score.count_100 + score.count_50 + score.count_misses;
  if (score.play_mode === 2 || score.play_mode === 3) {
    const thresholds = score.play_mode === 2 ? [98, 94, 90, 85] : [95, 90, 80, 70];
    const accuracy = score.accuracy;
    if (accuracy >= 100) return named('SS');
    if (accuracy > thresholds[0]) return named('S');
    if (accuracy > thresholds[1]) return 'A';
    if (accuracy > thresholds[2]) return 'B';
    return accuracy > thresholds[3] ? 'C' : 'D';
  }

  const total = score.play_mode === 1 ? hits - score.count_50 : hits;
  if (total === 0) return 'D';
  const r300 = score.count_300 / total;
  const r50 = score.play_mode === 1 ? 0 : score.count_50 / total;
  const misses = score.count_misses;
  if (r300 === 1) return named('SS');
  if (r300 > 0.9 && r50 <= 0.01 && misses === 0) return named('S');
  if ((r300 > 0.8 && misses === 0) || r300 > 0.9) return 'A';
  if ((r300 > 0.7 && misses === 0) || r300 > 0.8) return 'B';
  return r300 > 0.6 ? 'C' : 'D';
}
