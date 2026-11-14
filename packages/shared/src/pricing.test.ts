import { describe, expect, it } from 'vitest';
import { computeTotals, gstOfInclusive, lineTotalCents, unitPriceCents } from './pricing';
import { formatNZD, dollarsToCents } from './money';

describe('money', () => {
  it('formats integer cents as NZD', () => {
    expect(formatNZD(1250)).toBe('$12.50');
    expect(formatNZD(0)).toBe('$0.00');
    expect(formatNZD(900)).toBe('$9.00');
    expect(formatNZD(99)).toBe('$0.99');
  });

  it('converts dollar input to cents without float drift', () => {
    expect(dollarsToCents('12.50')).toBe(1250);
    expect(dollarsToCents('0.1')).toBe(10);
    expect(dollarsToCents(19.99)).toBe(1999);
  });
});

describe('gst (15% inclusive)', () => {
  it('extracts the GST component of an inclusive amount (3/23)', () => {
    // $11.50 incl GST -> GST = $1.50
    expect(gstOfInclusive(1150)).toBe(150);
    // $115.00 incl -> $15.00
    expect(gstOfInclusive(11500)).toBe(1500);
  });

  it('rounds to the nearest cent', () => {
    expect(gstOfInclusive(1000)).toBe(130); // 1000*3/23 = 130.43 -> 130
  });
});

describe('pricing', () => {
  it('computes a unit price from base + option deltas', () => {
    expect(unitPriceCents(1200, [])).toBe(1200);
    expect(unitPriceCents(1200, [0, 300, -100])).toBe(1400);
  });

  it('computes a line total', () => {
    expect(lineTotalCents({ unitPriceCents: 1200, quantity: 3 })).toBe(3600);
  });

  it('computes order totals so subtotal + gst = total', () => {
    const totals = computeTotals([
      { unitPriceCents: 1200, quantity: 2 }, // 2400
      { unitPriceCents: 650, quantity: 1 }, // 650
    ]);
    expect(totals.totalCents).toBe(3050);
    expect(totals.gstCents).toBe(gstOfInclusive(3050));
    expect(totals.subtotalCents + totals.gstCents).toBe(totals.totalCents);
  });

  it('handles an empty cart', () => {
    expect(computeTotals([])).toEqual({ subtotalCents: 0, gstCents: 0, totalCents: 0 });
  });
});
