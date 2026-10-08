import { describe, expect, test } from 'bun:test';
import { applyChecks, tierReached } from './service';
import { DEFAULT_SETTINGS } from './settings';

describe('applyChecks', () => {
  test('completes tasks that reach their target and sums points once', () => {
    const tasks = [
      { id: 1, points: 30, target: 3, progress: 0, completed_at: null },
      { id: 2, points: 50, target: 1, progress: 0, completed_at: new Date() }
    ];
    const { tasks: updated, points } = applyChecks(tasks, [3, 0]);
    expect(updated[0].completed_at).not.toBeNull();
    expect(updated[0].progress).toBe(3);
    expect(updated[1].completed_at).not.toBeNull();
    expect(points).toBe(80);
  });
  test('progress is capped at the target', () => {
    const { tasks } = applyChecks(
      [{ id: 1, points: 30, target: 3, progress: 0, completed_at: null }],
      [7]
    );
    expect(tasks[0].progress).toBe(3);
  });
});

describe('tierReached', () => {
  test('counts thresholds the points pass', () => {
    expect(tierReached(DEFAULT_SETTINGS.thresholds, 0)).toBe(0);
    expect(tierReached(DEFAULT_SETTINGS.thresholds, 150)).toBe(1);
    expect(tierReached(DEFAULT_SETTINGS.thresholds, 300)).toBe(3);
  });
});
