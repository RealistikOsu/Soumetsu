import { describe, expect, test } from 'bun:test';
import { dayWindow, windowOf } from './day';

describe('dayWindow', () => {
  test('spans the UTC day of the given moment', () => {
    const window = dayWindow(new Date('2026-10-08T23:59:59Z'));
    expect(window.date).toBe('2026-10-08');
    expect(window.start.toISOString()).toBe('2026-10-08T00:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-10-09T00:00:00.000Z');
    expect(window.startUnix).toBe('1791417600');
    expect(window.endUnix).toBe('1791504000');
  });
  test('day window excludes the next day', () => {
    const today = windowOf('2026-10-08');
    expect(today.endUnix).toBe(windowOf('2026-10-09').startUnix);
    // scores.time is compared as text, so the last second of the day must sort below endUnix and the next day's first second must not.
    expect('1791503999' < today.endUnix).toBe(true);
    expect('1791504000' >= today.endUnix).toBe(true);
  });
});
