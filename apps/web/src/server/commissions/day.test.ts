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
    const window = windowOf('2026-10-08');
    const lastSecond = Math.floor(window.end.getTime() / 1000);
    expect(String(lastSecond) >= window.endUnix).toBe(true);
    expect(String(lastSecond - 1) < window.endUnix).toBe(true);
  });
});
