import { Privilege } from '$lib/auth/privileges';
import { db } from '$server/db';
import { Prisma } from '$server/generated/client';
import { Failure } from '$server/respond';
import { checkLimit } from './limits';

const DAY = 86400;

export const LOAN = { interestPercent: 15, min: 100, max: 25_000, termDays: 7 } as const;

export interface Loan {
  id: number;
  principal: number;
  remaining: number;
  dailyPayment: number;
  interestRate: number;
  takenAt: number;
  nextPaymentIn: number;
}

type Client = Prisma.TransactionClient | typeof db;

interface LoanRow {
  id: number;
  principal: number;
  remaining: number;
  interest_rate: Prisma.Decimal | number;
  daily_payment: number;
  taken_at: number;
  last_payment_at: number;
}

const unix = (date: Date) => Math.floor(date.getTime() / 1000);

export function terms(amount: number) {
  const totalOwed = Math.ceil((amount * (100 + LOAN.interestPercent)) / 100);
  return { totalOwed, dailyPayment: Math.ceil(totalOwed / LOAN.termDays) };
}

// Mirrors the casino's processor: every payment taken moves last_payment_at to now, and a day the player
// can't cover moves it one day past the last paid one so the missed day isn't retried straight away.
export function dueSchedule(
  loan: { remaining: number; dailyPayment: number; lastPaymentAt: number },
  balance: number,
  now: number
) {
  const due = Math.floor((now - loan.lastPaymentAt) / DAY);
  const payments: number[] = [];
  let lastPaymentAt = loan.lastPaymentAt;
  let remaining = loan.remaining;

  for (let i = 0; i < due && remaining > 0; i++) {
    const pay = Math.min(loan.dailyPayment, remaining);
    if (balance < pay) {
      lastPaymentAt = loan.lastPaymentAt + (payments.length + 1) * DAY;
      break;
    }
    balance -= pay;
    remaining -= pay;
    payments.push(pay);
    lastPaymentAt = now;
  }

  return { payments, lastPaymentAt };
}

function toLoan(row: LoanRow, now = unix(new Date())): Loan {
  return {
    id: row.id,
    principal: row.principal,
    remaining: row.remaining,
    dailyPayment: row.daily_payment,
    interestRate: Number(row.interest_rate),
    takenAt: row.taken_at,
    nextPaymentIn: Math.max(0, row.last_payment_at + DAY - now)
  };
}

export async function activeLoan(userId: number, client: Client = db): Promise<Loan | null> {
  const row = await client.casino_loans.findFirst({
    where: { user_id: userId, paid_off: false },
    orderBy: { id: 'desc' }
  });
  return row ? toLoan(row) : null;
}

async function lockUser(tx: Prisma.TransactionClient, userId: number) {
  const [user] = await tx.$queryRaw<{ coins: number; privileges: bigint }[]>`
    SELECT coins, privileges FROM users WHERE id = ${userId} FOR UPDATE`;
  if (!user) throw new Failure(404, 'users.user_not_found');
  return user;
}

async function lockLoan(tx: Prisma.TransactionClient, userId: number) {
  const [row] = await tx.$queryRaw<LoanRow[]>`
    SELECT id, principal, remaining, interest_rate, daily_payment, taken_at, last_payment_at
    FROM casino_loans WHERE user_id = ${userId} AND paid_off = 0
    ORDER BY id DESC LIMIT 1 FOR UPDATE`;
  return row ?? null;
}

// Overdue days come out before anything else touches the loan, so the caller must hold both row locks.
export async function applyDue(
  tx: Prisma.TransactionClient,
  userId: number,
  user: { coins: number },
  loan: LoanRow,
  at: number
) {
  const { payments, lastPaymentAt } = dueSchedule(
    {
      remaining: loan.remaining,
      dailyPayment: loan.daily_payment,
      lastPaymentAt: loan.last_payment_at
    },
    user.coins,
    at
  );
  const paid = payments.reduce((sum, pay) => sum + pay, 0);
  const result = { coins: user.coins - paid, remaining: loan.remaining - paid };
  if (lastPaymentAt === loan.last_payment_at) return result;

  if (paid > 0) await tx.$executeRaw`UPDATE users SET coins = coins - ${paid} WHERE id = ${userId}`;
  await tx.casino_loans.update({
    where: { id: loan.id },
    data: {
      remaining: result.remaining,
      paid_off: result.remaining === 0,
      last_payment_at: lastPaymentAt
    }
  });
  return result;
}

export async function processDue(userId: number, now = new Date()) {
  await db.$transaction(async (tx) => {
    const user = await lockUser(tx, userId);
    const loan = await lockLoan(tx, userId);
    if (loan) await applyDue(tx, userId, user, loan, unix(now));
  });
}

export async function take(userId: number, amount: number): Promise<Loan> {
  await checkLimit('loan_take', userId);
  if (!Number.isInteger(amount) || amount < LOAN.min || amount > LOAN.max)
    throw new Failure(400, 'casino.invalid_amount');

  const { totalOwed, dailyPayment } = terms(amount);
  const now = unix(new Date());

  try {
    return await db.$transaction(async (tx) => {
      const user = await lockUser(tx, userId);
      if ((Number(user.privileges) & Privilege.Public) === 0)
        throw new Failure(403, 'site.forbidden');
      if (await lockLoan(tx, userId)) throw new Failure(409, 'casino.loan_active');

      // principal holds the total owed, as the casino stored it.
      const row = await tx.casino_loans.create({
        data: {
          user_id: userId,
          principal: totalOwed,
          remaining: totalOwed,
          interest_rate: LOAN.interestPercent / 100,
          daily_payment: dailyPayment,
          taken_at: now,
          last_payment_at: now
        }
      });
      await tx.$executeRaw`UPDATE users SET coins = coins + ${amount} WHERE id = ${userId}`;
      return toLoan(row, now);
    });
  } catch (error) {
    // The generated active_user_id key is the backstop for two takes racing past the check.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new Failure(409, 'casino.loan_active');
    throw error;
  }
}

export async function settleRepayment(
  tx: Prisma.TransactionClient,
  userId: number,
  amount: number,
  at: number
): Promise<{ loan: Loan | null; balance: number }> {
  const user = await lockUser(tx, userId);
  const loan = await lockLoan(tx, userId);
  if (!loan) throw new Failure(404, 'casino.no_loan');

  const due = await applyDue(tx, userId, user, loan, at);
  if (due.remaining === 0) return { loan: null, balance: due.coins };

  const pay = Math.min(amount, due.remaining);
  if (due.coins < pay) throw new Failure(402, 'casino.insufficient_coins');

  const remaining = due.remaining - pay;
  await tx.$executeRaw`UPDATE users SET coins = coins - ${pay} WHERE id = ${userId}`;
  const row = await tx.casino_loans.update({
    where: { id: loan.id },
    data: { remaining, paid_off: remaining === 0, last_payment_at: at }
  });

  return { loan: remaining === 0 ? null : toLoan(row, at), balance: due.coins - pay };
}

export async function repay(userId: number, amount: number) {
  await checkLimit('loan_repay', userId);
  if (!Number.isInteger(amount) || amount < 1) throw new Failure(400, 'casino.invalid_amount');
  const at = unix(new Date());
  return db.$transaction((tx) => settleRepayment(tx, userId, amount, at));
}

export async function status(userId: number) {
  await processDue(userId);
  return activeLoan(userId);
}
