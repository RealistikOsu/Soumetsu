import { describe, expect, test } from 'bun:test';
import { fakeContext } from './context';
import { rollDay, rollReplacement } from './roll';
import { DEFAULT_SETTINGS } from './settings';
import { template, type Template } from './templates/types';

const fake = (
  key: string,
  family: string,
  tier: 'easy' | 'medium' | 'hard',
  rollable = true
): Template =>
  template({
    key,
    family,
    tier,
    roll: () => (rollable ? { key } : null),
    target: () => 1,
    check: async () => 0
  });

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('rollDay', () => {
  const pool = [
    fake('a1', 'a', 'easy'),
    fake('a2', 'a', 'hard'),
    fake('b1', 'b', 'medium'),
    fake('c1', 'c', 'hard'),
    fake('d1', 'd', 'easy'),
    fake('e1', 'e', 'medium'),
    fake('f1', 'f', 'hard'),
    fake('g1', 'g', 'easy'),
    fake('h1', 'h', 'medium'),
    fake('x', 'x', 'hard', false)
  ];

  test('rolls tasksPerDay tasks from distinct families', () => {
    const rolled = rollDay(pool, fakeContext({}), DEFAULT_SETTINGS, seeded(1));
    expect(rolled).toHaveLength(6);
    expect(
      new Set(rolled.map((task) => pool.find((t) => t.key === task.template)!.family)).size
    ).toBe(6);
  });

  test('reaches minDayPoints when the pool allows', () => {
    const rolled = rollDay(pool, fakeContext({}), DEFAULT_SETTINGS, seeded(2));
    expect(rolled.reduce((sum, task) => sum + task.points, 0)).toBeGreaterThanOrEqual(300);
  });

  test('never picks a template whose roll returns null', () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(
        rollDay(pool, fakeContext({}), DEFAULT_SETTINGS, seeded(seed)).some(
          (task) => task.template === 'x'
        )
      ).toBe(false);
    }
  });

  test('rolls a full day for a player with nothing to scale against', () => {
    const easyOnly = [
      fake('a1', 'a', 'easy'),
      fake('b1', 'b', 'easy'),
      fake('c1', 'c', 'easy'),
      fake('d1', 'd', 'easy'),
      fake('e1', 'e', 'easy'),
      fake('f1', 'f', 'easy'),
      fake('g1', 'g', 'easy')
    ];
    const rolled = rollDay(easyOnly, fakeContext({}), DEFAULT_SETTINGS, seeded(3));
    expect(rolled).toHaveLength(6);
    expect(rolled.reduce((sum, task) => sum + task.points, 0)).toBe(180);
  });

  test('a zero weight removes a template', () => {
    const settings = { ...DEFAULT_SETTINGS, weights: { a1: 0, a2: 0 } };
    for (let seed = 0; seed < 20; seed++) {
      const keys = rollDay(pool, fakeContext({}), settings, seeded(seed)).map(
        (task) => task.template
      );
      expect(keys.some((key) => key.startsWith('a'))).toBe(false);
    }
  });
});

describe('rollReplacement', () => {
  const pool = [
    fake('a1', 'a', 'easy'),
    fake('b1', 'b', 'hard'),
    fake('c1', 'c', 'hard'),
    fake('d1', 'd', 'easy', false)
  ];

  test('prefers the same tier and an unused family', () => {
    const rolled = rollReplacement(pool, fakeContext({}), DEFAULT_SETTINGS, 'hard', new Set(['b']));
    expect(rolled?.template).toBe('c1');
  });

  test('falls back to another tier when the tier has nothing left', () => {
    const rolled = rollReplacement(
      pool,
      fakeContext({}),
      DEFAULT_SETTINGS,
      'hard',
      new Set(['b', 'c'])
    );
    expect(rolled?.template).toBe('a1');
  });

  test('never picks a switched-off template', () => {
    const settings = { ...DEFAULT_SETTINGS, weights: { c1: 0 } };
    const rolled = rollReplacement(pool, fakeContext({}), settings, 'hard', new Set(['b', 'a']));
    expect(rolled).toBeNull();
  });
});

describe('lazer commissions off', () => {
  const lazerOnly = { ...fake('l1', 'l', 'easy'), lazer: () => true };
  const pool = [lazerOnly, fake('m1', 'm', 'easy'), fake('n1', 'n', 'medium')];
  const off = { ...DEFAULT_SETTINGS, tasksPerDay: 3, minDayPoints: 0, lazerTasks: false };

  test('never rolls a task that needs lazer', () => {
    for (let seed = 1; seed < 30; seed++) {
      const keys = rollDay(pool, fakeContext({}), off, seeded(seed)).map((task) => task.template);
      expect(keys).not.toContain('l1');
    }
  });

  test('never replaces with a task that needs lazer', () => {
    const rolled = rollReplacement(pool, fakeContext({}), off, 'easy', new Set(['m', 'n']));
    expect(rolled).toBeNull();
  });
});
