import Stripe from 'stripe';
import { requireCaller } from '$server/auth';
import { config } from '$server/config';
import { priceFor, targetUser } from '$server/payments';
import { Failure, handle, ok } from '$server/respond';

// Starts a Stripe checkout for a number of months, for the player or as a gift, and returns where to send them.
export const POST = handle(async ({ request }) => {
  await requireCaller(request);
  if (!config.stripe.key) throw new Failure(503, 'site.payments_unavailable');

  const body = (await request.json().catch(() => null)) as {
    user_id?: number;
    months?: number;
  } | null;
  const months = Number(body?.months);
  if (!Number.isInteger(months) || months < 1) throw new Failure(400, 'site.invalid_request');
  const target = await targetUser(Number(body?.user_id));
  if (!target) throw new Failure(404, 'users.user_not_found');

  const stripe = new Stripe(config.stripe.key);
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: Math.round(priceFor(months) * 100),
          product_data: { name: `${months} Month(s) RealistikOsu Supporter for ${target.username}` }
        }
      }
    ],
    // The ID, not the name, so a rename can't redirect the credit.
    client_reference_id: String(target.id),
    metadata: { months: String(months) },
    success_url: `${config.appBaseUrl}/donate?payment=success`,
    cancel_url: `${config.appBaseUrl}/donate?payment=cancel`
  });
  return ok(session.url);
});
