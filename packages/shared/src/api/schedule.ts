import type { DarjeelingSupabaseClient } from '../supabase/client';
import type { LocationScheduleRow } from '../types/database';
import { generateSlots, isOpenNow, zonedDateString, type PickupSlot } from '../time';

/** Today's schedule (Pacific/Auckland business date), or null if none set. */
export async function fetchTodaySchedule(
  supabase: DarjeelingSupabaseClient,
  now: Date = new Date(),
): Promise<LocationScheduleRow | null> {
  const today = zonedDateString(now);
  const { data, error } = await supabase
    .from('locations_schedule')
    .select('*')
    .eq('date', today)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface SlotAvailability extends PickupSlot {
  booked: number;
  full: boolean;
}

/**
 * Bookable slots for today with fullness computed from existing (non-cancelled)
 * orders in each slot vs max_orders_per_slot.
 */
export async function fetchAvailableSlots(
  supabase: DarjeelingSupabaseClient,
  now: Date = new Date(),
): Promise<{ schedule: LocationScheduleRow | null; open: boolean; slots: SlotAvailability[] }> {
  const schedule = await fetchTodaySchedule(supabase, now);
  if (!schedule || schedule.is_closed) {
    return { schedule, open: false, slots: [] };
  }

  const open = isOpenNow(
    {
      date: schedule.date,
      openTime: schedule.open_time.slice(0, 5),
      closeTime: schedule.close_time.slice(0, 5),
      isClosed: schedule.is_closed,
    },
    now,
  );

  const slots = generateSlots({
    date: schedule.date,
    openTime: schedule.open_time.slice(0, 5),
    closeTime: schedule.close_time.slice(0, 5),
    slotMinutes: schedule.slot_minutes,
    now,
  });

  // Count non-cancelled orders per slot for today.
  const dayStart = new Date(`${schedule.date}T00:00:00Z`);
  const dayEnd = new Date(dayStart.getTime() + 36 * 3600_000);
  const { data: orders, error } = await supabase
    .from('orders')
    .select('pickup_slot, status')
    .gte('pickup_slot', dayStart.toISOString())
    .lte('pickup_slot', dayEnd.toISOString())
    .neq('status', 'cancelled');
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const o of orders ?? []) {
    if (!o.pickup_slot) continue;
    const key = new Date(o.pickup_slot).toISOString();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const withAvailability: SlotAvailability[] = slots.map((slot) => {
    const booked = counts.get(slot.startIso) ?? 0;
    return { ...slot, booked, full: booked >= schedule.max_orders_per_slot };
  });

  return { schedule, open, slots: withAvailability };
}
