export interface DayWindow {
  date: string;
  start: Date;
  end: Date;
  // scores.time is a varchar of unix seconds, compared as text, so these are 10-digit strings.
  startUnix: string;
  endUnix: string;
}

const unix = (date: Date) => String(Math.floor(date.getTime() / 1000));

const HOUR = 3_600_000;

// A commission day starts at the hour set in the panel (UTC), so it can sit next to the daily challenge's start.
export function windowOf(date: string, startHour: number): DayWindow {
  const start = new Date(new Date(`${date}T00:00:00Z`).getTime() + startHour * HOUR);
  const end = new Date(start.getTime() + 86_400_000);
  return { date, start, end, startUnix: unix(start), endUnix: unix(end) };
}

export const dayWindow = (now: Date, startHour: number) =>
  windowOf(new Date(now.getTime() - startHour * HOUR).toISOString().slice(0, 10), startHour);
