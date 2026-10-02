// The level curve the game server uses; the API only reports the whole level, so the progress is worked out here.
const required = (level: number) =>
  level <= 100
    ? Math.floor(5000 / 3) * (4 * level ** 3 - 3 * level ** 2 - level) +
      Math.floor((1250 * 1.8 ** (level - 60)) / 3)
    : 26_931_190_829 + 100_000_000_000 * (level - 100);

export function level(totalScore: number) {
  if (totalScore <= 0) return 1;

  let current = 1;
  let needed = 0;
  while (needed <= totalScore) {
    current += 1;
    needed += required(current);
    if (current > 120) break;
  }

  let previous = 0;
  for (let l = 2; l < current; l++) previous += required(l);
  const progress = needed > previous ? (totalScore - previous) / (needed - previous) : 0;
  return current - 1 + progress;
}
