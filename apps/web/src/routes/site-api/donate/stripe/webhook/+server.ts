import Stripe from 'stripe';
import { config } from '$server/config';
import { fulfilStripe } from '$server/payments';
import { redis } from '$server/redis';

const THIRTY_DAYS = 30 * 24 * 3600;

// Stripe retries deliveries, so each event is credited once, and replies in plain text as Stripe expects.
export const POST = async ({ request }: { request: Request }) => {
  const payload = await request.text();
  const signature = request.headers.get('Stripe-Signature') ?? '';
  const stripe = new Stripe(config.stripe.key || 'unconfigured');

  let event: Stripe.Event;
  try {
    // Without a webhook secret the body is trusted as it is, which only suits local testing.
    event = config.stripe.webhookSecret
      ? stripe.webhooks.constructEvent(payload, signature, config.stripe.webhookSecret)
      : (JSON.parse(payload) as Stripe.Event);
  } catch {
    return new Response('Invalid payload', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = Number(session.client_reference_id);
    const months = Number(session.metadata?.months);
    if (Number.isInteger(userId) && userId > 0 && months > 0) {
      const first = await redis.set(`stripe_event:${event.id}`, '1', 'EX', THIRTY_DAYS, 'NX');
      if (first) await fulfilStripe(userId, months);
    }
  }
  return new Response(null, { status: 200 });
};
