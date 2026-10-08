export interface DayWindow {
  date: string;
  start: Date;
  end: Date;
  // scores.time is a varchar of unix seconds, compared as text, so these are 10-digit strings.
  startUnix: string;
  endUnix: string;
}

const DAY = 86_400_000;

const unix = (date: Date) => String(Math.floor(date.getTime() / 1000));

const isoDate = (at: number) => new Date(at).toISOString().slice(0, 10);

const span = (start: number, end: number): DayWindow => ({
  date: isoDate(start),
  start: new Date(start),
  end: new Date(end),
  startUnix: unix(new Date(start)),
  endUnix: unix(new Date(end))
});

export interface DayClock {
  windowOf(date: string): DayWindow;
  dayWindow(now: Date): DayWindow;
  previous(window: DayWindow): DayWindow;
}

// A commission day starts with a daily challenge and runs until the next one starts, so the reset, the challenge
// changing and its placements settling line up whatever hour staff schedule it for, and no hours fall between two
// days. A gap of several days is cut into 24-hour days, the last one stretched to meet the next challenge; past the
// last challenge (or before the first) days keep its start time. With nothing ever scheduled, days start at
// midnight UTC. `starts` are the challenges' start times, oldest first.
export function clockFrom(starts: Date[]): DayClock {
  const times = starts.map((start) => start.getTime());

  const dayWindow = (now: Date): DayWindow => {
    const at = now.getTime();
    if (!times.length) {
      const start = Math.floor(at / DAY) * DAY;
      return span(start, start + DAY);
    }
    const index = times.findLastIndex((time) => time <= at);
    if (index === -1) {
      // Before the first challenge: whole days ending where it starts.
      const first = times[0];
      const start = first - Math.ceil((first - at) / DAY) * DAY;
      return span(start, start + DAY);
    }
    const from = times[index];
    const next = times[index + 1];
    const k = Math.floor((at - from) / DAY);
    if (next === undefined) return span(from + k * DAY, from + (k + 1) * DAY);
    const days = Math.max(1, Math.floor((next - from) / DAY));
    const chunk = Math.min(k, days - 1);
    return span(from + chunk * DAY, chunk === days - 1 ? next : from + (chunk + 1) * DAY);
  };

  // Rows from before this clock, or dates a long day swallowed, fall back to that calendar day.
  const windowOf = (date: string): DayWindow => {
    const midnight = new Date(`${date}T00:00:00Z`).getTime();
    for (let hour = 0; hour < 24; hour++) {
      const window = dayWindow(new Date(midnight + hour * 3_600_000));
      if (window.date === date) return window;
    }
    const later = dayWindow(new Date(midnight + DAY));
    if (later.date === date) return later;
    return span(midnight, midnight + DAY);
  };

  const previous = (window: DayWindow) => dayWindow(new Date(window.start.getTime() - 1));

  return { windowOf, dayWindow, previous };
}
