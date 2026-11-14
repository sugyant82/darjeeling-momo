/**
 * Time + pickup slots, all in Pacific/Auckland. We store instants as UTC ISO
 * strings but reason about wall-clock time in the truck's zone.
 */
import { TIME_ZONE } from './config';

/** Offset (zone local minus UTC) in ms for an instant, in the given zone. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUTC - instant.getTime();
}

/** Convert a wall-clock time (YYYY-MM-DD + HH:MM) in Pacific/Auckland to a UTC Date. */
export function zonedWallTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string = TIME_ZONE,
): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const guess = Date.UTC(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  const offset = tzOffsetMs(new Date(guess), timeZone);
  return new Date(guess - offset);
}

/** "YYYY-MM-DD" for an instant in Pacific/Auckland (today's business date). */
export function zonedDateString(instant: Date = new Date(), timeZone: string = TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Format an instant as a pickup time label, e.g. "12:30 pm". */
export function formatSlotTime(instant: Date | string, timeZone: string = TIME_ZONE): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant;
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

export interface PickupSlot {
  /** UTC ISO start of the slot. */
  startIso: string;
  /** Human label, e.g. "12:30 pm". */
  label: string;
}

export interface SlotScheduleInput {
  date: string; // YYYY-MM-DD (Pacific/Auckland business date)
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
  slotMinutes: number;
  /** How far ahead the first ASAP-ish slot may be (lead time). */
  leadMinutes?: number;
  now?: Date;
  timeZone?: string;
}

/**
 * Generate bookable pickup slots for a day. Past slots (and those inside the
 * lead time) are excluded. Slot fullness (max per slot) is enforced separately
 * against live order counts.
 */
export function generateSlots(input: SlotScheduleInput): PickupSlot[] {
  const {
    date,
    openTime,
    closeTime,
    slotMinutes,
    leadMinutes = 10,
    now = new Date(),
    timeZone = TIME_ZONE,
  } = input;
  if (slotMinutes <= 0) return [];

  const open = zonedWallTimeToUtc(date, openTime, timeZone);
  const close = zonedWallTimeToUtc(date, closeTime, timeZone);
  const earliest = new Date(now.getTime() + leadMinutes * 60_000);

  const slots: PickupSlot[] = [];
  const stepMs = slotMinutes * 60_000;
  for (let t = open.getTime(); t + stepMs <= close.getTime(); t += stepMs) {
    if (t < earliest.getTime()) continue;
    const start = new Date(t);
    slots.push({ startIso: start.toISOString(), label: formatSlotTime(start, timeZone) });
  }
  return slots;
}

/** Is the truck open right now, per a day's schedule? */
export function isOpenNow(
  input: { date: string; openTime: string; closeTime: string; isClosed?: boolean },
  now: Date = new Date(),
  timeZone: string = TIME_ZONE,
): boolean {
  if (input.isClosed) return false;
  const open = zonedWallTimeToUtc(input.date, input.openTime, timeZone);
  const close = zonedWallTimeToUtc(input.date, input.closeTime, timeZone);
  return now >= open && now <= close;
}
