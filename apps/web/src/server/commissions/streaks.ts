// Ported from soumetsu-api's daily_stats.py so commission and daily challenge streaks follow the same rules.
export function streaks(periods: Set<number>, now: number) {
  let current = 0;
  const cursor = periods.has(now) ? now : now - 1;
  while (periods.has(cursor - current)) current++;

  let best = 0;
  for (const start of periods) {
    if (periods.has(start - 1)) continue;
    let length = 1;
    while (periods.has(start + length)) length++;
    best = Math.max(best, length);
  }
  return { current, best };
}

const EPOCH_ORDINAL = 719163; // 1970-01-01 in Python's toordinal

export const dayOrdinal = (day: Date) => Math.floor(day.getTime() / 86_400_000) + EPOCH_ORDINAL;

export const weekIndex = (day: Date) => Math.floor((dayOrdinal(day) - 1) / 7);

const DAYS_PER_QUALIFYING_WEEK = 3;

export interface StreakStats {
  totalDays: number;
  currentDailyStreak: number;
  bestDailyStreak: number;
  currentWeeklyStreak: number;
  bestWeeklyStreak: number;
}

export function streakStats(completedDays: Date[], today: Date): StreakStats {
  const played = new Set(completedDays.map(dayOrdinal));
  const perWeek = new Map<number, number>();
  for (const day of completedDays) {
    const week = weekIndex(day);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }
  const qualifying = new Set(
    [...perWeek].filter(([, count]) => count >= DAYS_PER_QUALIFYING_WEEK).map(([week]) => week)
  );

  const daily = streaks(played, dayOrdinal(today));
  const weekly = streaks(qualifying, weekIndex(today));
  return {
    totalDays: played.size,
    currentDailyStreak: daily.current,
    bestDailyStreak: daily.best,
    currentWeeklyStreak: weekly.current,
    bestWeeklyStreak: weekly.best
  };
}
