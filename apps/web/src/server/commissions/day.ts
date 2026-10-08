export interface DayWindow {
  date: string;
  start: Date;
  end: Date;
  // scores.time is a varchar of unix seconds, compared as text, so these are 10-digit strings.
  startUnix: string;
  endUnix: string;
}

const unix = (date: Date) => String(Math.floor(date.getTime() / 1000));

export function windowOf(date: string): DayWindow {
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(start.getTime() + 86_400_000);
  return { date, start, end, startUnix: unix(start), endUnix: unix(end) };
}

export const dayWindow = (now = new Date()) => windowOf(now.toISOString().slice(0, 10));
