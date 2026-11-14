// deno-lint-ignore-file no-explicit-any
// Creates an order (UNPAID) with server-computed totals, then creates a payment:
// Stripe PaymentIntent when STRIPE_SECRET_KEY is set, otherwise a mock handle.
// Orders are only marked paid later, by the webhook / confirm function.
import Stripe from 'https://esm.sh/stripe@23.1.0?target=deno';
import { adminClient, getUser, stripePublishable, stripeSecret } from '../_shared/client.ts';
import { computeTotals } from '../_shared/pricing.ts';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';

interface SelectedOption {
  optionId: string;
  optionName: string;
  choiceId: string;
  choiceLabel: string;
  priceDeltaCents: number;
}
interface LineInput {
  menuItemId: string;
  quantity: number;
  selectedOptions: SelectedOption[];
}
interface Body {
  items: LineInput[];
  pickupSlotIso: string | null;
  pickupAsap?: boolean;
  locationId: string | null;
  phone: string;
  notes?: string;
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const user = await getUser(req);
    if (!user) return jsonResponse({ error: 'Not authenticated' }, 401);

    const body = (await req.json()) as Body;
    if (!body.items?.length) return jsonResponse({ error: 'Cart is empty' }, 400);

    const admin = adminClient();

    // Authoritative prices from the DB.
    const itemIds = [...new Set(body.items.map((i) => i.menuItemId))];
    const { data: items, error: itemErr } = await admin
      .from('menu_items')
      .select('id, name, price_cents, is_available')
      .in('id', itemIds);
    if (itemErr) throw itemErr;

    const itemsById = new Map<string, any>((items ?? []).map((i: any) => [i.id, i]));
    const choiceIds = [
      ...new Set(body.items.flatMap((l) => l.selectedOptions.map((o) => o.choiceId))),
    ];
    const choicesById = new Map<string, any>();
    if (choiceIds.length) {
      const { data: choices, error: chErr } = await admin
        .from('option_choices')
        .select('id, label, price_delta_cents')
        .in('id', choiceIds);
      if (chErr) throw chErr;
      for (const c of choices ?? []) choicesById.set(c.id, c);
    }

    const orderLines = [] as {
      menu_item_id: string;
      name: string;
      selected_options: SelectedOption[];
      unit_price_cents: number;
      quantity: number;
      line_total_cents: number;
    }[];

    for (const line of body.items) {
      const item = itemsById.get(line.menuItemId);
      if (!item) return jsonResponse({ error: `Unknown item ${line.menuItemId}` }, 400);
      if (!item.is_available) {
        return jsonResponse({ error: `${item.name} is sold out`, soldOut: true }, 409);
      }
      // Recompute option deltas from the DB (ignore client-supplied prices).
      const verifiedOptions: SelectedOption[] = line.selectedOptions.map((o) => {
        const choice = choicesById.get(o.choiceId);
        return {
          ...o,
          choiceLabel: choice?.label ?? o.choiceLabel,
          priceDeltaCents: choice?.price_delta_cents ?? 0,
        };
      });
      const deltas = verifiedOptions.reduce((s, o) => s + o.priceDeltaCents, 0);
      const unit = item.price_cents + deltas;
      orderLines.push({
        menu_item_id: item.id,
        name: item.name,
        selected_options: verifiedOptions,
        unit_price_cents: unit,
        quantity: line.quantity,
        line_total_cents: unit * line.quantity,
      });
    }

    const totals = computeTotals(
      orderLines.map((l) => ({ unitPriceCents: l.unit_price_cents, quantity: l.quantity })),
    );

    // Create the order (unpaid).
    const { data: order, error: orderErr } = await admin
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'received',
        location_id: body.locationId,
        pickup_slot: body.pickupSlotIso,
        notes: body.notes ?? '',
        phone: body.phone,
        subtotal_cents: totals.subtotalCents,
        gst_cents: totals.gstCents,
        total_cents: totals.totalCents,
        paid_at: null,
      })
      .select('id, number')
      .single();
    if (orderErr) throw orderErr;

    const { error: linesErr } = await admin
      .from('order_items')
      .insert(orderLines.map((l) => ({ ...l, order_id: order.id })));
    if (linesErr) throw linesErr;

    // Clear the user's cart now that the order exists.
    const { data: cart } = await admin
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (cart) await admin.from('cart_items').delete().eq('cart_id', cart.id);

    const secret = stripeSecret();
    if (!secret) {
      // ---- Mock mode ----
      return jsonResponse({
        provider: 'mock',
        orderId: order.id,
        orderNumber: order.number,
        amountCents: totals.totalCents,
      });
    }

    // ---- Stripe mode ----
    const stripe = new Stripe(secret, {
      httpClient: Stripe.createFetchHttpClient(),
      apiVersion: '2024-06-20',
    } as any);
    const intent = await stripe.paymentIntents.create({
      amount: totals.totalCents,
      currency: 'nzd',
      automatic_payment_methods: { enabled: true },
      metadata: { orderId: order.id, orderNumber: order.number, userId: user.id },
    });
    await admin
      .from('orders')
      .update({ stripe_payment_intent_id: intent.id, payment_provider: 'stripe' })
      .eq('id', order.id);

    return jsonResponse({
      provider: 'stripe',
      orderId: order.id,
      orderNumber: order.number,
      amountCents: totals.totalCents,
      clientSecret: intent.client_secret,
      publishableKey: stripePublishable() ?? '',
    });
  } catch (err) {
    console.error('create-payment error', err);
    return jsonResponse({ error: (err as Error).message ?? 'Unexpected error' }, 500);
  }
});
