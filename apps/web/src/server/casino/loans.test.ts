import { describe, expect, test } from 'bun:test';
import type { Prisma } from '$server/generated/client';
import { Failure } from '$server/respond';
import { dueSchedule, LOAN, settleRepayment, terms } from './loans';

const DAY = 86400;
const last = 1_700_000_000;

describe('terms', () => {
  test('adds 15% and splits over seven days', () => {
    expect(terms(1000)).toEqual({ totalOwed: 1150, dailyPayment: 165 });
    expect(terms(25000)).toEqual({ totalOwed: 28750, dailyPayment: 4108 });
  });

  test('matches the casino rounding across the whole range', () => {
    for (let amount = LOAN.min; amount <= LOAN.max; amount++) {
      const totalOwed = Math.ceil(amount * 1.15);
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

// Stands in for the transaction: the two locking reads, the coin updates and the loan update.
function fakeTx(coins: number, loan: { remaining: number; last_payment_at: number }) {
  const state = {
    coins,
    loan: {
      id: 1,
      principal: 1150,
      interest_rate: 0.15,
      daily_payment: 165,
      taken_at: last,
      paid_off: false,
      ...loan
    }
  };
  const tx = {
    $queryRaw: async (sql: TemplateStringsArray) =>
      sql[0].includes('FROM users')
        ? [{ coins: state.coins, privileges: 1n }]
        : state.loan.paid_off
          ? []
          : [{ ...state.loan }],
    $executeRaw: async (sql: TemplateStringsArray, amount: number) => {
      expect(sql[0]).toContain('coins = coins -');
      state.coins -= amount;
      return 1;
    },
    casino_loans: {
      update: async ({ data }: { data: Partial<typeof state.loan> }) =>
        (state.loan = { ...state.loan, ...data })
    }
  } as unknown as Prisma.TransactionClient;
  return { tx, state };
}

describe('settleRepayment', () => {
  test('collects missed days before the repayment', async () => {
    const { tx, state } = fakeTx(1000, { remaining: 1150, last_payment_at: last });
    const now = last + 3 * DAY + 10;
    const result = await settleRepayment(tx, 7, 100, now);
    expect(state.coins).toBe(1000 - 3 * 165 - 100);
    expect(state.loan.remaining).toBe(1150 - 3 * 165 - 100);
    expect(state.loan.last_payment_at).toBe(now);
    expect(result.balance).toBe(state.coins);
    expect(result.loan?.remaining).toBe(state.loan.remaining);
  });

  test('caps the repayment at what is left after the missed days', async () => {
    const { tx, state } = fakeTx(1000, { remaining: 400, last_payment_at: last });
    const result = await settleRepayment(tx, 7, 1000, last + 2 * DAY);
    expect(result).toEqual({ loan: null, balance: 1000 - 400 });
    expect(state.loan.paid_off).toBe(true);
  });

  test('checks coins after the missed days come out', async () => {
    const { tx } = fakeTx(200, { remaining: 1150, last_payment_at: last });
    const error = await settleRepayment(tx, 7, 100, last + DAY).catch((e) => e);
    expect(error).toBeInstanceOf(Failure);
    expect((error as Failure).code).toBe('casino.insufficient_coins');
  });

  test('missed days that clear the loan are kept and nothing more is taken', async () => {
    const { tx, state } = fakeTx(1000, { remaining: 100, last_payment_at: last });
    const result = await settleRepayment(tx, 7, 50, last + DAY);
    expect(result).toEqual({ loan: null, balance: 900 });
    expect(state.coins).toBe(900);
    expect(state.loan.paid_off).toBe(true);
  });

  test('no active loan at all', async () => {
    const { tx, state } = fakeTx(1000, { remaining: 0, last_payment_at: last });
    state.loan.paid_off = true;
    const error = await settleRepayment(tx, 7, 50, last + DAY).catch((e) => e);
    expect((error as Failure).code).toBe('casino.no_loan');
  });
});
