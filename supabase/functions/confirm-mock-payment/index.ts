// deno-lint-ignore-file no-explicit-any
// MOCK ONLY. The "Test payment" sheet's Pay / Decline buttons call this. On Pay
// it uses the SAME markOrderPaid path the Stripe webhook uses. Refuses to run if
// a real Stripe key is configured (so it can never bypass real payments).
import { adminClient, getUser, stripeSecret } from '../_shared/client.ts';
import { markOrderPaid } from '../_shared/markPaid.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    if (stripeSecret()) {
      return jsonResponse({ error: 'Mock payments are disabled when Stripe is configured' }, 403);
    }
    const user = await getUser(req);
    if (!user) return jsonResponse({ error: 'Not authenticated' }, 401);

    const { orderId, decision } = (await req.json()) as {
      orderId: string;
      decision: 'pay' | 'decline';
    };
    if (!orderId) return jsonResponse({ error: 'orderId required' }, 400);

    const admin = adminClient();
    const { data: order, error } = await admin
      .from('orders')
      .select('id, user_id, status, paid_at')
      .eq('id', orderId)
      .single();
    if (error) throw error;
    if (order.user_id !== user.id) return jsonResponse({ error: 'Not your order' }, 403);

    if (decision === 'decline') {
      await admin.from('orders').update({ status: 'cancelled' }).eq('id', orderId).is('paid_at', null);
      return jsonResponse({ status: 'cancelled', paid: false });
    }

    await markOrderPaid(admin, { orderId, provider: 'mock', paymentIntentId: null });
    return jsonResponse({ status: 'received', paid: true });
  } catch (err) {
    console.error('confirm-mock-payment error', err);
    return jsonResponse({ error: (err as Error).message ?? 'Unexpected error' }, 500);
  }
});
