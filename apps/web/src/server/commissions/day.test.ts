import { describe, expect, test } from 'bun:test';
import { dayWindow, windowOf } from './day';

describe('dayWindow', () => {
  test('runs from 06:00 UTC to 06:00 UTC the next day', () => {
    const window = dayWindow(new Date('2026-10-08T23:59:59Z'));
    expect(window.date).toBe('2026-10-08');
    expect(window.start.toISOString()).toBe('2026-10-08T06:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-10-09T06:00:00.000Z');
    expect(window.startUnix).toBe('1791439200');
    expect(window.endUnix).toBe('1791525600');
  });
  test('the early hours still belong to the day before', () => {
    expect(dayWindow(new Date('2026-10-09T05:59:59Z')).date).toBe('2026-10-08');
    expect(dayWindow(new Date('2026-10-09T06:00:00Z')).date).toBe('2026-10-09');
  });
  test('day window excludes the next day', () => {
    const today = windowOf('2026-10-08');
    expect(today.endUnix).toBe(windowOf('2026-10-09').startUnix);
    // scores.time is compared as text, so the last second of the day must sort below endUnix and the next day's first second must not.
    expect('1791525599' < today.endUnix).toBe(true);
    expect('1791525600' >= today.endUnix).toBe(true);
  });
});
