/**
 * Pickup-location, prep-time and stock logic, shared by web, mobile and the
 * create-payment Edge Function so the customer sees exactly what the server enforces.
 */
import type { PickupType } from './types/database';

export const PICKUP_TYPE_LABEL: Record<PickupType, string> = {
  home: 'Home kitchen',
  truck: 'Food truck',
};

/** Short verb for the customer, e.g. "Collect from the home kitchen". */
export const PICKUP_TYPE_SHORT: Record<PickupType, string> = {
  home: 'home kitchen',
  truck: 'truck',
};

/** Minimal shape needed to reason about an item's availability and prep time. */
export interface StockItem {
  is_available: boolean;
  stock_qty: number | null;
  prep_minutes: number;
}

/** Ready-made stock left, or null when the item is untracked (effectively unlimited). */
export function stockRemaining(item: Pick<StockItem, 'stock_qty'>): number | null {
  return item.stock_qty;
}

/** Can this item be ordered at all right now? (manual switch AND, if tracked, stock > 0) */
export function isItemAvailable(item: Pick<StockItem, 'is_available' | 'stock_qty'>): boolean {
  if (!item.is_available) return false;
  return item.stock_qty == null || item.stock_qty > 0;
}

/** The most of this item a customer may add now, given tracked stock (null = no limit). */
export function orderableQuantity(item: Pick<StockItem, 'is_available' | 'stock_qty'>): number | null {
  if (!item.is_available) return 0;
  return item.stock_qty;
}

/**
 * Minutes to prepare an order: the single longest item prep time in the cart
 * (items cook in parallel), 0 for an empty cart. The live kitchen buffer is added
 * on top of this by the caller.
 */
export function orderPrepMinutes(lines: { prepMinutes: number }[]): number {
  return lines.reduce((max, l) => Math.max(max, l.prepMinutes), 0);
}

/** Earliest instant an order could be ready: now + item prep + the kitchen's live buffer. */
export function earliestReadyAt(
  now: Date,
  prepMinutes: number,
  bufferMinutes: number,
): Date {
  return new Date(now.getTime() + (prepMinutes + bufferMinutes) * 60_000);
}

/** A human estimate of how long an order will take, e.g. "about 25 min" / "about 1 hr 10 min". */
export function formatWait(totalMinutes: number): string {
  if (totalMinutes <= 0) return 'a few minutes';
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `about ${mins} min`;
  if (mins === 0) return `about ${hrs} hr`;
  return `about ${hrs} hr ${mins} min`;
}
