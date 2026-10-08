import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from 'bun:test';
import type { PlayerContext } from './context';

interface FakeTask {
  id: number;
  template: string;
  params: object;
  points: number;
  target: number;
  progress: number;
  completed_at: Date | null;
}
interface FakeDay {
  id: number;
  user_id: number;
  day: Date;
  points: number;
  claimed_tier: number;
  completed_at: Date | null;
  tasks: FakeTask[];
}

// An in-memory stand-in for the few Prisma calls todayFor makes.
let days: FakeDay[] = [];
let created: string[] = [];
const fakeDb = {
  commission_settings: { findUnique: async () => null },
  commission_days: {
    findUnique: async ({ where }: { where: { user_id_day: { user_id: number; day: Date } } }) => {
      const { user_id, day } = where.user_id_day;
      const found = days.find((d) => d.user_id === user_id && d.day.getTime() === day.getTime());
      return found ? structuredClone(found) : null;
    },
    create: async ({
      data
    }: {
      data: { user_id: number; day: Date; tasks: { create: object[] } };
    }) => {
      created.push(data.day.toISOString().slice(0, 10));
      const day: FakeDay = {
        id: days.length + 100,
        user_id: data.user_id,
        day: data.day,
        points: 0,
        claimed_tier: 0,
        completed_at: null,
        tasks: data.tasks.create.map((task, index) => ({
          ...(task as Omit<FakeTask, 'id' | 'progress' | 'completed_at'>),
          id: (days.length + 100) * 10 + index,
          progress: 0,
          completed_at: null
        }))
      };
      days.push(day);
      return structuredClone(day);
    },
    update: async ({ where, data }: { where: { id: number }; data: Partial<FakeDay> }) =>
      Object.assign(
        days.find((d) => d.id === where.id)!,
        data
      ),
    findMany: async () => []
  },
  commission_tasks: {
    update: async ({ where, data }: { where: { id: number }; data: Partial<FakeTask> }) =>
      Object.assign(
        days.flatMap((d) => d.tasks).find((t) => t.id === where.id)!,
        data
      )
  },
  $transaction: (calls: Promise<unknown>[]) => Promise.all(calls)
};
let contextsLoaded: string[] = [];
let failContextFor: string | null = null;

mock.module('$server/admin/console', () => ({ record: async () => {} }));
mock.module('$server/db', () => ({ db: fakeDb }));
const real = await import('./context');
mock.module('./context', () => ({
  ...real,
  loadContext: async (id: number, window: PlayerContext['window']) => {
    contextsLoaded.push(window.date);
    if (window.date === failContextFor) throw new Error('context failed');
    return real.fakeContext({ id, window });
  }
}));
const { applyChecks, tierReached, todayFor } = await import('./service');
const { byKey } = await import('./templates');
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

describe('todayFor', () => {
  const now = new Date('2026-10-08T12:00:00Z');
  let checkResult: () => Promise<number> = async () => 1;
  beforeAll(() => {
    byKey.set('test_task', {
      key: 'test_task',
      family: 'test',
      tier: 'easy',
      roll: () => ({}),
      target: () => 1,
      check: () => checkResult()
    });
  });
  afterAll(() => byKey.delete('test_task'));

  const task = (id: number, done = false): FakeTask => ({
    id,
    template: 'test_task',
    params: {},
    points: 100,
    target: 1,
    progress: done ? 1 : 0,
    completed_at: done ? new Date('2026-10-07T10:00:00Z') : null
  });
  const dayRow = (id: number, user: number, date: string, tasks: FakeTask[], claimed = 0) => {
    const points = tasks.filter((t) => t.completed_at).reduce((sum, t) => sum + t.points, 0);
    return {
      id,
      user_id: user,
      day: new Date(date),
      points,
      claimed_tier: claimed,
      completed_at: points >= 300 ? new Date(date) : null,
      tasks
    };
  };

  afterEach(() => {
    days = [];
    created = [];
    contextsLoaded = [];
    failContextFor = null;
    checkResult = async () => 1;
  });

  test("yesterday is checked again while it's incomplete and stays claimable", async () => {
    days = [
      dayRow(1, 10, '2026-10-08', [task(11, true)]),
      dayRow(2, 10, '2026-10-07', [task(21, true), task(22)])
    ];
    const { day, previous } = await todayFor(10, now);
    expect(day.date).toBe('2026-10-08');
    expect(previous?.date).toBe('2026-10-07');
    expect(previous?.points).toBe(200);
    expect(previous?.tasks.every((t) => t.completed)).toBe(true);
    expect(contextsLoaded).toEqual(['2026-10-07']);
    expect(days[1].points).toBe(200);
  });

  test("a failing recheck of yesterday keeps its stored row and today's page", async () => {
    days = [
      dayRow(1, 14, '2026-10-08', [task(61)]),
      dayRow(2, 14, '2026-10-07', [task(71, true), task(72)])
    ];
    failContextFor = '2026-10-07';
    const { day, previous } = await todayFor(14, now);
    expect(day.tasks[0].completed).toBe(true);
    expect(previous?.points).toBe(100);
    expect(previous?.tasks[1].completed).toBe(false);
  });

  test('a missing yesterday is never rolled', async () => {
    const { day, previous } = await todayFor(11, now);
    expect(day.date).toBe('2026-10-08');
    expect(previous).toBeNull();
    expect(created).toEqual(['2026-10-08']);
  });

  test('a finished yesterday shows only while a tier is left to claim', async () => {
    const finished = [task(31, true), task(32, true), task(33, true)];
    days = [dayRow(1, 12, '2026-10-08', [task(41, true)]), dayRow(2, 12, '2026-10-07', finished)];
    expect((await todayFor(12, now)).previous?.date).toBe('2026-10-07');
    days[1].claimed_tier = 3;
    expect((await todayFor(12, now)).previous).toBeNull();
  });

  test('a request during a running check waits for it instead of showing old progress', async () => {
    days = [dayRow(1, 13, '2026-10-08', [task(51)])];
    let release = () => {};
    checkResult = () => new Promise((resolve) => (release = () => resolve(1)));
    const first = todayFor(13, now);
    const second = todayFor(13, now);
    await Bun.sleep(10);
    release();
    const results = await Promise.all([first, second]);
    for (const { day } of results) {
      expect(day.tasks[0].completed).toBe(true);
      expect(day.points).toBe(100);
    }
  });
});
