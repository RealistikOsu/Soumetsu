import { db } from './db';

const DONOR = 4;
const MONTH_SECONDS = 30 * 24 * 3600;

// Pounds for a number of months, as on Hanayo.
export const priceFor = (months: number) => Number(Math.pow(months * 3, 0.84).toFixed(2));

// Freekassa takes dollars, at 1.34 to the pound.
export const dollarsFor = (months: number) => (priceFor(months) * 1.34).toFixed(2);

export async function targetUser(id: number) {
  return db.users.findUnique({ where: { id }, select: { id: true, username: true } });
}

// Supporter time stacks onto whatever is left, or starts now if it has run out.
async function extend(userId: number, seconds: number) {
  await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ donor_expire: number; privileges: bigint }[]>`
      SELECT donor_expire, privileges FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = rows[0];
    if (!user) return;

    const now = Math.floor(Date.now() / 1000);
    const expire = Math.max(user.donor_expire, now) + seconds;
    await tx.$executeRaw`
      UPDATE users SET donor_expire = ${expire}, privileges = ${Number(user.privileges) | DONOR}
      WHERE id = ${userId}`;
  });
}

// Stripe pays 10% extra time, which the site advertises.
export const fulfilStripe = (userId: number, months: number) =>
  extend(userId, Math.round(months * MONTH_SECONDS * 1.1));

// A retried webhook must not pay out twice, so the order is recorded first and the credit follows in the same
// transaction.
export async function fulfilFreekassa(userId: number, months: number, orderId: string) {
  await db.$transaction(async (tx) => {
    const recorded =
      await tx.$executeRaw`INSERT IGNORE INTO freekassa_payments (order_id) VALUES (${orderId})`;
    if (recorded === 0) return;

    const rows = await tx.$queryRaw<{ donor_expire: number; privileges: bigint }[]>`
      SELECT donor_expire, privileges FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = rows[0];
    if (!user) return;

    const expire =
      Math.max(user.donor_expire, Math.floor(Date.now() / 1000)) + months * MONTH_SECONDS;
    await tx.$executeRaw`
      UPDATE users SET donor_expire = ${expire}, privileges = ${Number(user.privileges) | DONOR}
      WHERE id = ${userId}`;
  });
}
