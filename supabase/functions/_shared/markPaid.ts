// deno-lint-ignore-file no-explicit-any
// The SINGLE code path that marks an order paid. The Stripe webhook and the mock
// confirm function both call this, so behaviour is identical in both modes.
// On the FIRST paid transition it also decrements tracked stock and clears the
// customer's cart (so an abandoned/unpaid order never empties the cart).

export async function markOrderPaid(
  admin: any,
  opts: { orderId: string; provider: string; paymentIntentId?: string | null },
): Promise<void> {
  const { data, error } = await admin
    .from('orders')
    .update({
      paid_at: new Date().toISOString(),
      payment_provider: opts.provider,
      stripe_payment_intent_id: opts.paymentIntentId ?? null,
      status: 'received',
    })
    .eq('id', opts.orderId)
    .is('paid_at', null) // idempotent: only the first success sets paid_at
    .neq('status', 'cancelled') // never revive a cancelled order
    .select('id, user_id');
  if (error) throw error;

  // No row updated → already paid or cancelled; nothing more to do.
  const row = (data ?? [])[0];
  if (!row) return;

  // Decrement ready-made stock for this order (atomic; untracked items untouched).
  const { error: stockErr } = await admin.rpc('decrement_stock_for_order', {
    p_order_id: opts.orderId,
  });
  if (stockErr) console.error('decrement_stock_for_order failed', stockErr);

  // Clear the customer's cart now that payment succeeded.
  const { data: cart } = await admin
    .from('carts')
    .select('id')
    .eq('user_id', row.user_id)
    .maybeSingle();
  if (cart) await admin.from('cart_items').delete().eq('cart_id', cart.id);
}
