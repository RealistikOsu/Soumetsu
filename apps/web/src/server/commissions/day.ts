export interface DayWindow {
  date: string;
  start: Date;
  end: Date;
  // scores.time is a varchar of unix seconds, compared as text, so these are 10-digit strings.
  startUnix: string;
  endUnix: string;
}

const unix = (date: Date) => String(Math.floor(date.getTime() / 1000));

// A commission day lines up with the daily challenge, which runs from 06:00 UTC to 06:00 UTC the next day, so a
// day's challenge tasks can be played (and settle) inside the day they belong to.
export const DAY_START_HOUR = 6;
const OFFSET = DAY_START_HOUR * 3_600_000;

export function windowOf(date: string): DayWindow {
  const start = new Date(new Date(`${date}T00:00:00Z`).getTime() + OFFSET);
  const end = new Date(start.getTime() + 86_400_000);
  return { date, start, end, startUnix: unix(start), endUnix: unix(end) };
}

export const dayWindow = (now = new Date()) =>
  windowOf(new Date(now.getTime() - OFFSET).toISOString().slice(0, 10));
