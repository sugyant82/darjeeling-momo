import type { DarjeelingSupabaseClient } from '../supabase/client';
import type { Order, OrderSummary } from '../types/domain';
import type { OrderItemRow, OrderRow } from '../types/database';
import {
  createOrderInputSchema,
  createPaymentResponseSchema,
  type CreateOrderInput,
  type CreatePaymentResponse,
} from '../schemas';
import { canTransition, type OrderStatus } from '../order-status';

/**
 * Create an order and a payment (mock or Stripe) via the create-payment Edge
 * Function. The server computes totals, creates the order as unpaid, and returns
 * either a mock handle or a Stripe client secret. Orders are only marked paid by
 * the webhook / confirm function — never the client.
 */
export async function createPayment(
  supabase: DarjeelingSupabaseClient,
  input: CreateOrderInput,
): Promise<CreatePaymentResponse> {
  const payload = createOrderInputSchema.parse(input);
  const { data, error } = await supabase.functions.invoke('create-payment', { body: payload });
  if (error) throw await functionError(error, 'Could not start checkout. Please try again.');
  return createPaymentResponseSchema.parse(data);
}

/** Mock-only: the "Pay" button on the test sheet. Server marks the order paid. */
export async function confirmMockPayment(
  supabase: DarjeelingSupabaseClient,
  orderId: string,
  decision: 'pay' | 'decline',
): Promise<{ status: OrderStatus; paid: boolean }> {
  const { data, error } = await supabase.functions.invoke('confirm-mock-payment', {
    body: { orderId, decision },
  });
  if (error) throw await functionError(error, 'Payment could not be processed. Please try again.');
  return data as { status: OrderStatus; paid: boolean };
}

/** An Edge Function failure with the server's own message (e.g. "X is sold out"). */
export type FunctionError = Error & { soldOut?: boolean };

/**
 * supabase-js reports any non-2xx response as "Edge Function returned a non-2xx status code";
 * the useful message is in the response body. Network failures get a plain-language message.
 */
async function functionError(error: unknown, fallback: string): Promise<FunctionError> {
  const name = (error as { name?: string } | null)?.name;
  if (name === 'FunctionsFetchError') {
    return new Error("Couldn't reach the server. Check your connection and try again.");
  }
  const context = (error as { context?: unknown } | null)?.context;
  if (context && typeof (context as Response).json === 'function') {
    try {
      const body = (await (context as Response).clone().json()) as { error?: unknown; soldOut?: unknown };
      if (typeof body?.error === 'string' && body.error.trim()) {
        return Object.assign(new Error(body.error), { soldOut: body.soldOut === true });
      }
    } catch {
      /* body was not JSON */
    }
  }
  return new Error(fallback);
}

export async function fetchOrder(
  supabase: DarjeelingSupabaseClient,
  orderId: string,
): Promise<Order | null> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;

  const { data: items, error: iErr } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);
  if (iErr) throw iErr;

  let location = null;
  if (order.location_id) {
    const { data: loc } = await supabase
      .from('locations_schedule')
      .select('*')
      .eq('id', order.location_id)
      .maybeSingle();
    location = loc ?? null;
  }
  return { ...(order as OrderRow), items: (items ?? []) as OrderItemRow[], location };
}

export async function fetchOrderByNumber(
  supabase: DarjeelingSupabaseClient,
  orderNumber: string,
): Promise<Order | null> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('number', orderNumber)
    .maybeSingle();
  if (error) throw error;
  if (!order) return null;
  return fetchOrder(supabase, order.id);
}

/** Current user's order history, newest first. */
export async function fetchOrderHistory(
  supabase: DarjeelingSupabaseClient,
  userId: string,
): Promise<OrderSummary[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const counts = row.order_items as { count: number }[] | undefined;
    const order = { ...row };
    delete order.order_items;
    return { ...(order as unknown as OrderRow), item_count: counts?.[0]?.count ?? 0 };
  });
}

export type OrderChangeHandler = (order: OrderRow) => void;

/**
 * Subscribe to realtime changes for a single order (customer tracking).
 * Returns an unsubscribe function. `onStatus` receives channel states ("SUBSCRIBED",
 * "CHANNEL_ERROR", …) so callers can refetch after (re)connecting.
 */
export function subscribeToOrder(
  supabase: DarjeelingSupabaseClient,
  orderId: string,
  onChange: OrderChangeHandler,
  onStatus?: (status: string) => void,
): () => void {
  // A unique name per subscription: realtime-js reuses channels by name, so re-opening the same
  // order while the previous channel is still closing would otherwise get no updates (or throw).
  const channel = supabase
    .channel(`order:${orderId}:${Math.random().toString(36).slice(2, 10)}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
      (payload) => onChange(payload.new as OrderRow),
    )
    .subscribe((status) => onStatus?.(status));
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Staff orders board: all active orders, plus realtime inserts/updates. */
export async function fetchActiveOrders(supabase: DarjeelingSupabaseClient): Promise<Order[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .not('paid_at', 'is', null)
    .in('status', ['received', 'preparing', 'ready'])
    .order('pickup_slot', { ascending: true, nullsFirst: true });
  if (error) throw error;

  const ids = (orders ?? []).map((o) => o.id);
  if (ids.length === 0) return [];
  const { data: items, error: iErr } = await supabase
    .from('order_items')
    .select('*')
    .in('order_id', ids);
  if (iErr) throw iErr;

  const byOrder = new Map<string, OrderItemRow[]>();
  for (const it of (items ?? []) as OrderItemRow[]) {
    const arr = byOrder.get(it.order_id);
    if (arr) arr.push(it);
    else byOrder.set(it.order_id, [it]);
  }
  return (orders ?? []).map((o) => ({ ...(o as OrderRow), items: byOrder.get(o.id) ?? [] }));
}

export function subscribeToActiveOrders(
  supabase: DarjeelingSupabaseClient,
  onChange: () => void,
): () => void {
  const channel = supabase
    .channel('orders:board')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => onChange())
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Staff: advance an order's status (RLS restricts this to staff/admin). */
export async function updateOrderStatus(
  supabase: DarjeelingSupabaseClient,
  orderId: string,
  current: OrderStatus,
  next: OrderStatus,
): Promise<void> {
  if (!canTransition(current, next)) {
    throw new Error(`Cannot move order from ${current} to ${next}`);
  }
  const { error } = await supabase
    .from('orders')
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}
