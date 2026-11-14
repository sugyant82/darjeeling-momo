// deno-lint-ignore-file no-explicit-any
// The SINGLE code path that marks an order paid. The Stripe webhook and the mock
// confirm function both call this, so behaviour is identical in both modes.

export async function markOrderPaid(
  admin: any,
  opts: { orderId: string; provider: string; paymentIntentId?: string | null },
): Promise<void> {
  const { error } = await admin
    .from('orders')
    .update({
      paid_at: new Date().toISOString(),
      payment_provider: opts.provider,
      stripe_payment_intent_id: opts.paymentIntentId ?? null,
      status: 'received',
    })
    .eq('id', opts.orderId)
    .is('paid_at', null); // idempotent: only the first success sets paid_at
  if (error) throw error;
}
