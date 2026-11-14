import { describe, expect, it } from 'vitest';
import { generateSlots, isOpenNow, zonedDateString } from './time';

describe('pickup slots (Pacific/Auckland)', () => {
  it('generates slots across the open window and excludes past ones', () => {
    // NZDT (summer): Auckland is UTC+13 in January.
    const now = new Date('2026-01-15T00:00:00Z'); // 1:00 pm NZDT
    const slots = generateSlots({
      date: '2026-01-15',
      openTime: '11:00',
      closeTime: '14:00',
      slotMinutes: 30,
      leadMinutes: 10,
      now,
    });
    // First slot must be at/after 1:10 pm -> 1:30 pm NZDT.
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]?.label).toBe('1:30 pm');
    // No slot should start before now.
    for (const s of slots) {
      expect(new Date(s.startIso).getTime()).toBeGreaterThanOrEqual(now.getTime());
    }
  });

  it('returns no slots when the day is over', () => {
    const now = new Date('2026-01-15T05:00:00Z'); // 6:00 pm NZDT
    const slots = generateSlots({
      date: '2026-01-15',
      openTime: '11:00',
      closeTime: '14:00',
      slotMinutes: 30,
      now,
    });
    expect(slots).toEqual([]);
  });

  it('knows when the truck is open', () => {
    const open = new Date('2026-01-15T00:00:00Z'); // 1pm NZDT, within 11-14
    const closed = new Date('2026-01-15T05:00:00Z'); // 6pm NZDT, after close
    const sched = { date: '2026-01-15', openTime: '11:00', closeTime: '14:00' };
    expect(isOpenNow(sched, open)).toBe(true);
    expect(isOpenNow(sched, closed)).toBe(false);
    expect(isOpenNow({ ...sched, isClosed: true }, open)).toBe(false);
  });

  it('computes the Auckland business date across the UTC day boundary', () => {
    // 2026-06-30 14:00 UTC is 2026-07-01 02:00 NZST (UTC+12 in winter).
    expect(zonedDateString(new Date('2026-06-30T14:00:00Z'))).toBe('2026-07-01');
  });
});
