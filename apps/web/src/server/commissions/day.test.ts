import { describe, expect, test } from 'bun:test';
import { clockFrom } from './day';

const at = (iso: string) => new Date(iso);
const iso = (date: Date) => date.toISOString();

describe('clockFrom', () => {
  test("a day runs from its challenge's start to the next one's", () => {
    const clock = clockFrom([at('2026-10-08T06:00:00Z'), at('2026-10-09T06:00:00Z')]);
    const day = clock.dayWindow(at('2026-10-09T05:59:59Z'));
    expect(day.date).toBe('2026-10-08');
    expect(iso(day.start)).toBe('2026-10-08T06:00:00.000Z');
    expect(iso(day.end)).toBe('2026-10-09T06:00:00.000Z');
    expect(clock.dayWindow(at('2026-10-09T06:00:00Z')).date).toBe('2026-10-09');
  });

  test('a midnight challenge followed by a 06:00 one makes one 30-hour day, with no gap', () => {
    const clock = clockFrom([at('2026-10-08T00:00:00Z'), at('2026-10-09T06:00:00Z')]);
    const day = clock.dayWindow(at('2026-10-09T03:00:00Z'));
    expect(day.date).toBe('2026-10-08');
    expect(iso(day.end)).toBe('2026-10-09T06:00:00.000Z');
    expect(clock.windowOf('2026-10-08').end).toEqual(day.end);
  });

  test('a gap of several days becomes whole days, the last stretched to the next challenge', () => {
    const clock = clockFrom([at('2026-10-08T06:00:00Z'), at('2026-10-11T12:00:00Z')]);
    expect(clock.dayWindow(at('2026-10-09T07:00:00Z')).date).toBe('2026-10-09');
    const last = clock.dayWindow(at('2026-10-11T08:00:00Z'));
    expect(iso(last.start)).toBe('2026-10-10T06:00:00.000Z');
    expect(iso(last.end)).toBe('2026-10-11T12:00:00.000Z');
  });

  test('after the last challenge days keep its start time', () => {
    const clock = clockFrom([at('2026-10-08T06:00:00Z')]);
    expect(iso(clock.windowOf('2026-10-12').start)).toBe('2026-10-12T06:00:00.000Z');
    expect(clock.dayWindow(at('2026-10-12T05:00:00Z')).date).toBe('2026-10-11');
  });

  test('previous is the window just before, whatever its length', () => {
    const clock = clockFrom([at('2026-10-08T00:00:00Z'), at('2026-10-09T06:00:00Z')]);
    const today = clock.dayWindow(at('2026-10-09T10:00:00Z'));
    expect(today.date).toBe('2026-10-09');
    expect(clock.previous(today).date).toBe('2026-10-08');
  });

  test('midnight UTC when nothing was ever scheduled', () => {
    const clock = clockFrom([]);
    const day = clock.windowOf('2026-10-08');
    expect(iso(day.start)).toBe('2026-10-08T00:00:00.000Z');
    expect(day.endUnix).toBe(clock.windowOf('2026-10-09').startUnix);
  });
});
