// deno-lint-ignore-file no-explicit-any
// Creates an order (UNPAID) with server-computed totals, then creates a payment:
// Stripe PaymentIntent when STRIPE_SECRET_KEY is set, otherwise a mock handle.
// Orders are only marked paid later, by the webhook / confirm function.
//
// Before charging, this is the AUTHORITY that enforces: the pickup location is open
// and accepting orders; the pickup time is achievable given item prep + the live
// kitchen buffer; the slot isn't full; and tracked stock covers the order.
import Stripe from 'https://esm.sh/stripe@23.1.0?target=deno';
import { adminClient, getUser, stripePublishable, stripeSecret } from '../_shared/client.ts';
import { computeTotals } from '../_shared/pricing.ts';
import { slotBoundaries, zonedDateString } from '../_shared/slots.ts';
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

/** Slot-boundary match tolerance (ms) for a client-supplied pickup time. */
const SLOT_TOLERANCE = 60_000;

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const user = await getUser(req);
    if (!user) return jsonResponse({ error: 'Not authenticated' }, 401);

    const body = (await req.json()) as Body;
    if (!body.items?.length) return jsonResponse({ error: 'Your cart is empty.' }, 400);

    const admin = adminClient();
    const now = new Date();
    const today = zonedDateString(now);

    // ---- Resolve the pickup location (must be today, open and accepting) ----
    let location: any = null;
    if (body.locationId) {
      const { data, error } = await admin
        .from('locations_schedule')
        .select('*')
        .eq('id', body.locationId)
        .maybeSingle();
      if (error) throw error;
      location = data;
    } else {
      // Back-compat: no location chosen → use today's single accepting location, if unambiguous.
      const { data, error } = await admin
        .from('locations_schedule')
        .select('*')
        .eq('date', today)
        .eq('is_closed', false)
        .eq('accepting_orders', true);
      if (error) throw error;
      if ((data ?? []).length === 1) location = data![0];
    }
    if (!location) return jsonResponse({ error: 'Please choose a pickup location.' }, 400);
    if (location.date !== today || location.is_closed) {
      return jsonResponse({ error: 'That pickup location isn’t open today.' }, 409);
    }
    if (!location.accepting_orders) {
      return jsonResponse(
        { error: 'The kitchen has paused new orders right now. Please check back soon.', paused: true },
        409,
      );
    }

    // ---- Authoritative item data (prices, availability, prep time, stock) ----
    const itemIds = [...new Set(body.items.map((i) => i.menuItemId))];
    const { data: items, error: itemErr } = await admin
      .from('menu_items')
      .select('id, name, price_cents, is_available, prep_minutes, stock_qty')
      .in('id', itemIds);
    if (itemErr) throw itemErr;
    const itemsById = new Map<string, any>((items ?? []).map((i: any) => [i.id, i]));

    // Requested quantity per item (same item can appear on multiple lines).
    const qtyByItem = new Map<string, number>();
    for (const line of body.items) {
      qtyByItem.set(line.menuItemId, (qtyByItem.get(line.menuItemId) ?? 0) + line.quantity);
    }
    // Availability + stock checks.
    for (const [itemId, qty] of qtyByItem) {
      const item = itemsById.get(itemId);
      if (!item) return jsonResponse({ error: `Unknown item ${itemId}` }, 400);
      if (!item.is_available) {
        return jsonResponse({ error: `${item.name} is sold out`, soldOut: true }, 409);
      }
      if (item.stock_qty != null && qty > item.stock_qty) {
        const left = item.stock_qty;
        return jsonResponse(
          {
            error: left <= 0 ? `${item.name} is sold out` : `Only ${left} ${item.name} left`,
            soldOut: true,
          },
          409,
        );
      }
    }

    const choiceIds = [...new Set(body.items.flatMap((l) => l.selectedOptions.map((o) => o.choiceId)))];
    const choicesById = new Map<string, any>();
    if (choiceIds.length) {
      const { data: choices, error: chErr } = await admin
        .from('option_choices')
        .select('id, label, price_delta_cents')
        .in('id', choiceIds);
      if (chErr) throw chErr;
      for (const c of choices ?? []) choicesById.set(c.id, c);
    }

    // ---- Validate / resolve the pickup time against prep + buffer + capacity ----
    const prepMinutes = body.items.reduce(
      (max, l) => Math.max(max, itemsById.get(l.menuItemId)?.prep_minutes ?? 0),
      0,
    );
    const leadMs = (prepMinutes + (location.prep_buffer_minutes ?? 0)) * 60_000;
    const earliestMs = now.getTime() + leadMs;
    const boundaries = slotBoundaries(
      location.date,
      location.open_time.slice(0, 5),
      location.close_time.slice(0, 5),
      location.slot_minutes,
    );
    const achievable = boundaries.filter((t) => t >= earliestMs - SLOT_TOLERANCE);
    if (achievable.length === 0) {
      return jsonResponse(
        { error: 'There are no pickup times left today that fit the kitchen’s current prep time.' },
        409,
      );
    }

    // Live non-cancelled counts per slot at this location.
    const dayStartIso = new Date(boundaries[0] ?? earliestMs).toISOString();
    const dayEndIso = new Date((boundaries[boundaries.length - 1] ?? earliestMs) + 60_000).toISOString();
    const { data: dayOrders, error: countErr } = await admin
      .from('orders')
      .select('pickup_slot')
      .eq('location_id', location.id)
      .neq('status', 'cancelled')
      .gte('pickup_slot', dayStartIso)
      .lte('pickup_slot', dayEndIso);
    if (countErr) throw countErr;
    const counts = new Map<number, number>();
    for (const o of dayOrders ?? []) {
      if (!o.pickup_slot) continue;
      const t = new Date(o.pickup_slot).getTime();
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const isFull = (t: number) => (counts.get(t) ?? 0) >= location.max_orders_per_slot;

    let resolvedSlotMs: number;
    if (body.pickupAsap || !body.pickupSlotIso) {
      const firstOpen = achievable.find((t) => !isFull(t));
      if (firstOpen === undefined) {
        return jsonResponse({ error: 'All pickup times are full right now. Please try again soon.' }, 409);
      }
      resolvedSlotMs = firstOpen;
    } else {
      const requested = new Date(body.pickupSlotIso).getTime();
      const match = achievable.find((t) => Math.abs(t - requested) <= SLOT_TOLERANCE);
      if (match === undefined) {
        return jsonResponse(
          { error: 'That pickup time isn’t available anymore. Please choose another.' },
          409,
        );
      }
      if (isFull(match)) {
        return jsonResponse({ error: 'That pickup time just filled up. Please choose another.' }, 409);
      }
      resolvedSlotMs = match;
    }
    const pickupSlotIso = new Date(resolvedSlotMs).toISOString();

    // ---- Build order lines with authoritative prices ----
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

    // Create the order (unpaid). Stock is decremented only when the order is paid.
    const { data: order, error: orderErr } = await admin
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'received',
        location_id: location.id,
        pickup_slot: pickupSlotIso,
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

    const secret = stripeSecret();
    if (!secret) {
      return jsonResponse({
        provider: 'mock',
        orderId: order.id,
        orderNumber: order.number,
        amountCents: totals.totalCents,
        pickupSlotIso,
      });
    }

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
      pickupSlotIso,
      clientSecret: intent.client_secret,
      publishableKey: stripePublishable() ?? '',
    });
  } catch (err) {
    console.error('create-payment error', err);
    return jsonResponse({ error: (err as Error).message ?? 'Unexpected error' }, 500);
  }
});
