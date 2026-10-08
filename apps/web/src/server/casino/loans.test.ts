import { describe, expect, test } from 'bun:test';
import { dueSchedule, LOAN, terms } from './loans';

const DAY = 86400;
const last = 1_700_000_000;

describe('terms', () => {
  test('adds 15% and splits over seven days', () => {
    expect(terms(1000)).toEqual({ totalOwed: 1150, dailyPayment: 165 });
    expect(terms(25000)).toEqual({ totalOwed: 28750, dailyPayment: 4108 });
  });

  test('matches the casino rounding across the whole range', () => {
    for (let amount = LOAN.min; amount <= LOAN.max; amount++) {
      const totalOwed = Math.ceil(amount * (1 + LOAN.interest));
      expect(terms(amount)).toEqual({ totalOwed, dailyPayment: Math.ceil(totalOwed / 7) });
    }
  });
});

describe('dueSchedule', () => {
  const loan = { remaining: 1150, dailyPayment: 165, lastPaymentAt: last };

  test('nothing due within a day', () => {
    expect(dueSchedule(loan, 10_000, last + DAY - 1)).toEqual({
      payments: [],
      lastPaymentAt: last
    });
  });

  test('takes every missed day when the balance covers them', () => {
    const now = last + 3 * DAY + 50;
    expect(dueSchedule(loan, 10_000, now)).toEqual({
      payments: [165, 165, 165],
      lastPaymentAt: now
    });
  });

  test('stops at the first day it cannot cover', () => {
    expect(dueSchedule(loan, 200, last + 3 * DAY + 50)).toEqual({
      payments: [165],
      lastPaymentAt: last + 2 * DAY
    });
  });

  test('moves past an unaffordable day even with no payment', () => {
    expect(dueSchedule(loan, 0, last + 3 * DAY)).toEqual({
      payments: [],
      lastPaymentAt: last + DAY
    });
  });

  test('the last payment is the remainder', () => {
    const now = last + 5 * DAY;
    expect(dueSchedule({ ...loan, remaining: 200 }, 10_000, now)).toEqual({
      payments: [165, 35],
      lastPaymentAt: now
    });
  });
});
