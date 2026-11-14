import type { DarjeelingSupabaseClient } from '../supabase/client';
import type { MenuItemRow, OrderRow } from '../types/database';
import type { CategoryInput, MenuItemInput, ScheduleInput } from '../schemas';
import { zonedDateString } from '../time';

/** Admin: upsert a menu item. Staff/admin only (enforced by RLS). */
export async function upsertMenuItem(
  supabase: DarjeelingSupabaseClient,
  input: MenuItemInput,
): Promise<MenuItemRow> {
  const row = {
    ...(input.id ? { id: input.id } : {}),
    category_id: input.categoryId,
    name: input.name,
    description: input.description,
    price_cents: input.priceCents,
    tags: input.tags,
    is_available: input.isAvailable,
    image_url: input.imageUrl ?? null,
    sort: input.sort,
    is_sample: false,
  };
  const { data, error } = await supabase
    .from('menu_items')
    .upsert(row)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function setItemAvailability(
  supabase: DarjeelingSupabaseClient,
  itemId: string,
  isAvailable: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: isAvailable })
    .eq('id', itemId);
  if (error) throw error;
}

export async function deleteMenuItem(
  supabase: DarjeelingSupabaseClient,
  itemId: string,
): Promise<void> {
  const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function upsertCategory(
  supabase: DarjeelingSupabaseClient,
  input: CategoryInput,
): Promise<void> {
  const { error } = await supabase.from('categories').upsert({
    ...(input.id ? { id: input.id } : {}),
    name: input.name,
    sort: input.sort,
    is_active: input.isActive,
  });
  if (error) throw error;
}

export async function upsertSchedule(
  supabase: DarjeelingSupabaseClient,
  input: ScheduleInput,
): Promise<void> {
  const { error } = await supabase.from('locations_schedule').upsert(
    {
      ...(input.id ? { id: input.id } : {}),
      date: input.date,
      place: input.place,
      address: input.address,
      map_link: input.mapLink ?? null,
      open_time: `${input.openTime}:00`,
      close_time: `${input.closeTime}:00`,
      slot_minutes: input.slotMinutes,
      max_orders_per_slot: input.maxOrdersPerSlot,
      is_closed: input.isClosed,
    },
    { onConflict: 'date' },
  );
  if (error) throw error;
}

export async function fetchSchedules(
  supabase: DarjeelingSupabaseClient,
  fromDate?: string,
): Promise<import('../types/database').LocationScheduleRow[]> {
  let query = supabase.from('locations_schedule').select('*').order('date', { ascending: true });
  if (fromDate) query = query.gte('date', fromDate);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export interface SalesSummary {
  date: string;
  orderCount: number;
  revenueCents: number;
  topItems: { name: string; quantity: number }[];
}

/** Simple sales view: today's paid orders, revenue and top items. */
export async function fetchTodaySales(
  supabase: DarjeelingSupabaseClient,
  now: Date = new Date(),
): Promise<SalesSummary> {
  const date = zonedDateString(now);
  const dayStart = new Date(`${date}T00:00:00Z`);
  const dayEnd = new Date(dayStart.getTime() + 36 * 3600_000);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total_cents, created_at, status')
    .gte('created_at', dayStart.toISOString())
    .lte('created_at', dayEnd.toISOString())
    .not('paid_at', 'is', null)
    .neq('status', 'cancelled');
  if (error) throw error;

  const paidOrders = (orders ?? []) as Pick<OrderRow, 'id' | 'total_cents'>[];
  const revenueCents = paidOrders.reduce((sum, o) => sum + o.total_cents, 0);

  let topItems: { name: string; quantity: number }[] = [];
  if (paidOrders.length > 0) {
    const { data: items, error: iErr } = await supabase
      .from('order_items')
      .select('name, quantity, order_id')
      .in(
        'order_id',
        paidOrders.map((o) => o.id),
      );
    if (iErr) throw iErr;
    const byName = new Map<string, number>();
    for (const it of items ?? []) {
      byName.set(it.name, (byName.get(it.name) ?? 0) + it.quantity);
    }
    topItems = Array.from(byName.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }

  return { date, orderCount: paidOrders.length, revenueCents, topItems };
}
