// deno-lint-ignore-file no-explicit-any
// Stripe webhook. Verifies the signature, then marks the order paid via the SAME
// markOrderPaid path the mock confirm uses. Never trust the client for payment.
import Stripe from 'https://esm.sh/stripe@23.1.0?target=deno';
import { adminClient } from '../_shared/client.ts';
import { markOrderPaid } from '../_shared/markPaid.ts';

Deno.serve(async (req) => {
  const secret = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret || !webhookSecret) {
    return new Response('Stripe not configured', { status: 500 });
  }

  const stripe = new Stripe(secret, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: '2024-06-20',
  } as any);

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    console.error('Webhook signature verification failed', err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  try {
    const admin = adminClient();
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        await markOrderPaid(admin, {
          orderId,
          provider: 'stripe',
          paymentIntentId: intent.id,
        });
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderId = intent.metadata?.orderId;
      if (orderId) {
        await admin.from('orders').update({ status: 'cancelled' }).eq('id', orderId).is('paid_at', null);
      }
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('payment-webhook handler error', err);
    return new Response('Handler error', { status: 500 });
  }
});
