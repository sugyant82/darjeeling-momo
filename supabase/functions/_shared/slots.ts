// Pickup-slot time maths for the Edge Functions (Pacific/Auckland wall time → UTC).
// Mirrors packages/shared/src/time.ts so the server validates exactly what the
// client offered. Money/fullness/stock checks live in create-payment.
const TZ = 'Pacific/Auckland';

function tzOffsetMs(instant: Date, timeZone = TZ): number {
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
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUTC - instant.getTime();
}

/** Wall-clock (YYYY-MM-DD + HH:MM) in Pacific/Auckland → UTC Date. */
export function zonedWallTimeToUtc(dateStr: string, timeStr: string, timeZone = TZ): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const guess = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  return new Date(guess - tzOffsetMs(new Date(guess), timeZone));
}

/** Today's business date (YYYY-MM-DD) in Pacific/Auckland. */
export function zonedDateString(instant = new Date(), timeZone = TZ): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** UTC ms of every slot boundary for a day: [open, close) stepped by slotMinutes. */
export function slotBoundaries(
  date: string,
  openTime: string,
  closeTime: string,
  slotMinutes: number,
): number[] {
  if (slotMinutes <= 0) return [];
  const open = zonedWallTimeToUtc(date, openTime).getTime();
  const close = zonedWallTimeToUtc(date, closeTime).getTime();
  const step = slotMinutes * 60_000;
  const out: number[] = [];
  for (let t = open; t + step <= close; t += step) out.push(t);
  return out;
}
