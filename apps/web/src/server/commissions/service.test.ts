import { describe, expect, mock, test } from 'bun:test';

mock.module('$server/admin/console', () => ({ record: async () => {} }));
const { applyChecks, tierReached } = await import('./service');
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

describe('runChecks', () => {
  test('a failing check keeps its stored progress and the rest still run', async () => {
    const { runChecks } = await import('./service');
    const { byKey } = await import('./templates');
    const keys = [...byKey.keys()];
    const original = [byKey.get(keys[0])!.check, byKey.get(keys[1])!.check];
    byKey.get(keys[0])!.check = async () => {
      throw new Error('boom');
    };
    byKey.get(keys[1])!.check = async () => 1;
    try {
      const tasks = [
        { template: keys[0], params: {}, progress: 2, completed_at: null },
        { template: keys[1], params: {}, progress: 0, completed_at: null }
      ];
      expect(await runChecks(tasks, { id: 1 } as never)).toEqual([2, 1]);
    } finally {
      byKey.get(keys[0])!.check = original[0];
      byKey.get(keys[1])!.check = original[1];
    }
  });
});
