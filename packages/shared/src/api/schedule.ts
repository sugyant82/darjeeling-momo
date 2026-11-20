import type { DarjeelingSupabaseClient } from '../supabase/client';
import type { LocationScheduleRow } from '../types/database';
import { earliestReadyAt } from '../pickup';
import { generateSlots, isOpenNow, zonedDateString, type PickupSlot } from '../time';

/**
 * All of today's pickup locations (home and/or truck), Pacific/Auckland business date.
 * Closed-for-the-day entries are excluded by default.
 */
export async function fetchTodayLocations(
  supabase: DarjeelingSupabaseClient,
  now: Date = new Date(),
  opts: { includeClosed?: boolean } = {},
): Promise<LocationScheduleRow[]> {
  const today = zonedDateString(now);
  let query = supabase.from('locations_schedule').select('*').eq('date', today).order('pickup_type');
  if (!opts.includeClosed) query = query.eq('is_closed', false);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Today's primary schedule (first open location), kept for the home "today" card.
 * Prefer {@link fetchTodayLocations} when you need every location.
 */
export async function fetchTodaySchedule(
  supabase: DarjeelingSupabaseClient,
  now: Date = new Date(),
): Promise<LocationScheduleRow | null> {
  const locations = await fetchTodayLocations(supabase, now);
  return locations[0] ?? null;
}

export interface SlotAvailability extends PickupSlot {
  booked: number;
  full: boolean;
}

/** One pickup location today, with its live state and bookable slots for the current cart. */
export interface PickupOption {
  schedule: LocationScheduleRow;
  /** Within opening hours right now. */
  open: boolean;
  /** Open AND the kitchen hasn't paused new orders. */
  accepting: boolean;
  /** Earliest achievable pickup (now + item prep + kitchen buffer), ISO, or null if none today. */
  earliestIso: string | null;
  /** Total lead minutes used (max item prep + buffer), for messaging. */
  leadMinutes: number;
  /** Bookable slots: in opening hours, at/after the earliest time; `full` set from live counts. */
  slots: SlotAvailability[];
}

/**
 * Pickup options for the current cart. For each open location today it computes the
 * earliest achievable pickup from the cart's prep time plus the location's live buffer,
 * and marks slots full from live order counts (via the slot_load RPC, which is RLS-safe).
 *
 * @param prepMinutes The cart's prep time (longest item). 0 for an empty/unknown cart.
 */
export async function fetchPickupOptions(
  supabase: DarjeelingSupabaseClient,
  opts: { prepMinutes?: number; now?: Date } = {},
): Promise<PickupOption[]> {
  const now = opts.now ?? new Date();
  const prepMinutes = Math.max(0, opts.prepMinutes ?? 0);
  const locations = await fetchTodayLocations(supabase, now);
  if (locations.length === 0) return [];

  const today = zonedDateString(now);
  // RLS-safe aggregate counts per (location, slot) for the whole day.
  const { data: load, error } = await supabase.rpc('slot_load', { p_date: today });
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const row of (load ?? []) as { location_id: string | null; pickup_slot: string; orders: number }[]) {
    if (!row.location_id || !row.pickup_slot) continue;
    counts.set(`${row.location_id}|${new Date(row.pickup_slot).toISOString()}`, row.orders);
  }

  return locations.map((schedule) => {
    const open = isOpenNow(
      {
        date: schedule.date,
        openTime: schedule.open_time.slice(0, 5),
        closeTime: schedule.close_time.slice(0, 5),
        isClosed: schedule.is_closed,
      },
      now,
    );
    const leadMinutes = prepMinutes + schedule.prep_buffer_minutes;
    const earliest = earliestReadyAt(now, prepMinutes, schedule.prep_buffer_minutes);
    const slots = generateSlots({
      date: schedule.date,
      openTime: schedule.open_time.slice(0, 5),
      closeTime: schedule.close_time.slice(0, 5),
      slotMinutes: schedule.slot_minutes,
      leadMinutes,
      now,
    }).map((slot) => {
      const booked = counts.get(`${schedule.id}|${slot.startIso}`) ?? 0;
      return { ...slot, booked, full: booked >= schedule.max_orders_per_slot };
    });
    const firstOpen = slots.find((s) => !s.full);
    return {
      schedule,
      open,
      accepting: open && schedule.accepting_orders,
      earliestIso: firstOpen?.startIso ?? earliest.toISOString(),
      leadMinutes,
      slots,
    };
  });
}

/**
 * Back-compat single-location slot view (first location today), cart-unaware.
 * New callers should use {@link fetchPickupOptions}.
 */
export async function fetchAvailableSlots(
  supabase: DarjeelingSupabaseClient,
  now: Date = new Date(),
): Promise<{ schedule: LocationScheduleRow | null; open: boolean; slots: SlotAvailability[] }> {
  const options = await fetchPickupOptions(supabase, { now });
  const first = options.find((o) => o.accepting) ?? options[0];
  if (!first) return { schedule: null, open: false, slots: [] };
  return { schedule: first.schedule, open: first.accepting, slots: first.slots };
}
