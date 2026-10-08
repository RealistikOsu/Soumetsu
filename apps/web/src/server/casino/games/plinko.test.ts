import { describe, expect, test } from 'bun:test';
import { parsePlinkoInput, parsePlinkoOdds, plinko, plinkoInfo, plinkoMax } from './plinko';
import type { PlinkoOdds } from './plinko';

const seeded = {
  rows: [8, 12, 16],
  tables: {
    low: {
      '8': [4.0, 1.5, 0.8, 0.5, 0.3, 0.5, 0.8, 1.5, 4.0],
      '12': [7, 2.2, 1.2, 1.0, 0.7, 0.5, 0.3, 0.5, 0.7, 1.0, 1.2, 2.2, 7],
      '16': [12, 6, 1.5, 1.0, 0.8, 0.6, 0.5, 0.4, 0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.5, 6, 12]
    },
    medium: {
      '8': [9, 2, 0.8, 0.4, 0.2, 0.4, 0.8, 2, 9],
      '12': [22, 7, 2.5, 1.2, 0.6, 0.3, 0.2, 0.3, 0.6, 1.2, 2.5, 7, 22],
      '16': [55, 10, 4, 2, 1.5, 0.8, 0.4, 0.2, 0.1, 0.2, 0.4, 0.8, 1.5, 2, 4, 10, 55]
    },
    high: {
      '8': [20, 2.5, 0.8, 0.2, 0.1, 0.2, 0.8, 2.5, 20],
      '12': [90, 15, 5, 2, 0.8, 0.3, 0.1, 0.3, 0.8, 2, 5, 15, 90],
      '16': [500, 75, 15, 5, 2, 0.8, 0.3, 0.1, 0.1, 0.1, 0.3, 0.8, 2, 5, 15, 75, 500]
    }
  }
};

const odds = parsePlinkoOdds(seeded) as PlinkoOdds;

function sequence(values: number[]) {
  let i = 0;
  const rng = () => {
    if (i >= values.length) throw new Error('rng drawn too often');
    return values[i++];
  };
  return Object.assign(rng, { used: () => i });
}

const invalid = expect.objectContaining({ status: 400, code: 'site.invalid_request' });

describe('plinko', () => {
  test('each row goes left below 0.5 and right otherwise, and the bucket is the sum', () => {
    // 0.1 -> 0, 0.9 -> 1: path [0,1,1,0,1,1,1,0] lands in bucket 5, low/8 pays 0.5.
    const rng = sequence([0.1, 0.9, 0.9, 0.1, 0.9, 0.9, 0.9, 0.1]);
    expect(plinko(odds, { rows: 8, risk: 'low' }, 100, rng)).toEqual({
      result: { path: [0, 1, 1, 0, 1, 1, 1, 0], multiplier: 0.5, payout: 50 },
      multiplier: 0.5,
      payout: 50
    });
    expect(rng.used()).toBe(8);
  });

  test('0.5 goes right', () => {
    const outcome = plinko(odds, { rows: 8, risk: 'medium' }, 10, () => 0.5);
    expect(outcome.result.path).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(outcome.multiplier).toBe(9);
    expect(outcome.payout).toBe(90);
  });

  test('all the way right on 16 rows high hits the edge bucket', () => {
    const rng = sequence(Array(16).fill(0.9));
    const outcome = plinko(odds, { rows: 16, risk: 'high' }, 100, rng);
    expect(outcome.multiplier).toBe(500);
    expect(outcome.payout).toBe(50000);
    expect(rng.used()).toBe(16);
  });

  test('all the way left on 12 rows low', () => {
    expect(plinko(odds, { rows: 12, risk: 'low' }, 3, () => 0).payout).toBe(21);
  });
});

describe('parsePlinkoInput', () => {
  test('accepts a listed row count and a risk', () => {
    expect(parsePlinkoInput({ rows: 12, risk: 'high' }, odds)).toEqual({ rows: 12, risk: 'high' });
  });

  test('rejects anything else', () => {
    for (const raw of [
      null,
      {},
      { rows: '8', risk: 'low' },
      { rows: 8, risk: 'wild' },
      { rows: 10, risk: 'low' },
      { rows: 8.5, risk: 'low' },
      { rows: 8 }
    ])
      expect(() => parsePlinkoInput(raw, odds)).toThrow(invalid);
  });
});

describe('parsePlinkoOdds', () => {
  test('accepts the seeded config', () => {
    expect(odds).toEqual(seeded);
  });

  test('rejects bad shapes', () => {
    const withTables = (tables: unknown) => ({ rows: [8, 12, 16], tables });
    for (const raw of [
      null,
      [],
      { tables: seeded.tables },
      { rows: [], tables: seeded.tables },
      { rows: [8, 8], tables: seeded.tables },
      { rows: [0], tables: seeded.tables },
      { rows: ['8'], tables: seeded.tables },
      { rows: [8, 12, 16, 20], tables: seeded.tables },
      withTables(undefined),
      withTables({ low: seeded.tables.low, medium: seeded.tables.medium }),
      withTables({ ...seeded.tables, high: { '8': seeded.tables.high['8'] } }),
      withTables({ ...seeded.tables, low: { ...seeded.tables.low, '8': [1, 2, 3] } }),
      withTables({
        ...seeded.tables,
        low: { ...seeded.tables.low, '8': [-1, 1, 1, 1, 1, 1, 1, 1, 1] }
      }),
      withTables({
        ...seeded.tables,
        low: { ...seeded.tables.low, '8': [1, 1, 1, 1, '1', 1, 1, 1, 1] }
      }),
      withTables({
        ...seeded.tables,
        low: { ...seeded.tables.low, '8': [1e5, 1, 1, 1, 1, 1, 1, 1, 1] }
      })
    ])
      expect(parsePlinkoOdds(raw)).toBeNull();
  });

  test('drops tables for row counts that are not offered', () => {
    const parsed = parsePlinkoOdds({ ...seeded, rows: [8] });
    expect(Object.keys(parsed!.tables.low)).toEqual(['8']);
  });
});

describe('plinkoMax and plinkoInfo', () => {
  test('the max is the biggest bucket anywhere', () => {
    expect(plinkoMax(odds)).toBe(500);
  });

  test('info is the rows and bucket tables', () => {
    expect(plinkoInfo(odds)).toEqual({ rows: seeded.rows, tables: seeded.tables });
    expect(JSON.stringify(plinkoInfo(odds))).not.toContain('weights');
  });
});
