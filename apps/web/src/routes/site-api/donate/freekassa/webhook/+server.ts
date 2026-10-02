import { config } from '$server/config';
import { md5 } from '$server/identity';
import { dollarsFor, fulfilFreekassa } from '$server/payments';
import { redis } from '$server/redis';

const THIRTY_DAYS = 30 * 24 * 3600;
const yes = () => new Response('YES');

// Freekassa expects the word YES. The signature, the amount and the order are all checked before any credit.
export const POST = async ({ request }: { request: Request }) => {
  const { merchantId, secret2 } = config.freekassa;
  if (!merchantId || !secret2) return new Response('Freekassa not configured', { status: 500 });

  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? '');
  const amount = field('AMOUNT');
  const order = field('MERCHANT_ORDER_ID');
  if (!field('MERCHANT_ID') || !field('SIGN')) return yes();

  const expected = md5(`${merchantId}:${amount}:${secret2}:${order}`);
  if (field('SIGN').toLowerCase() !== expected)
    return new Response('Invalid signature', { status: 400 });

  const userId = Number(field('us_userid'));
  const months = Number(field('us_months'));
  // Anything without the player and months is a test ping.
  if (!Number.isInteger(userId) || userId < 1 || !Number.isInteger(months) || months < 1)
    return yes();

  if (Number(amount) < Number(dollarsFor(months)) - 0.05)
    return new Response('Invalid amount', { status: 400 });

  const first = await redis.set(`freekassa_order:${order}`, '1', 'EX', THIRTY_DAYS, 'NX');
  if (!first) return yes();
  try {
    await fulfilFreekassa(userId, months, order);
  } catch {
    await redis.del(`freekassa_order:${order}`);
    return new Response('Failed to fulfil', { status: 500 });
  }
  return yes();
};
