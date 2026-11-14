/**
 * Pricing + GST. Menu prices are GST-INCLUSIVE at 15%. On a GST-inclusive total,
 * the GST component is total * 3/23 (because 15/115 = 3/23). All integer cents.
 */

export interface PricedLine {
  /** Unit price (base item + chosen option deltas), GST-inclusive cents. */
  unitPriceCents: number;
  quantity: number;
}

export interface OrderTotals {
  /** Net amount excluding GST (cents). */
  subtotalCents: number;
  /** GST portion included in the total (cents). */
  gstCents: number;
  /** Amount charged, GST-inclusive (cents). */
  totalCents: number;
}

/** GST component contained within a GST-inclusive amount. */
export function gstOfInclusive(inclusiveCents: number): number {
  return Math.round((inclusiveCents * 3) / 23);
}

/** Line total (unit price * quantity), GST-inclusive cents. */
export function lineTotalCents(line: PricedLine): number {
  return line.unitPriceCents * line.quantity;
}

/** Unit price = base price plus the sum of selected option price deltas. */
export function unitPriceCents(basePriceCents: number, optionDeltasCents: number[]): number {
  return optionDeltasCents.reduce((sum, d) => sum + d, basePriceCents);
}

/** Compute order totals from GST-inclusive line items. */
export function computeTotals(lines: PricedLine[]): OrderTotals {
  const totalCents = lines.reduce((sum, l) => sum + lineTotalCents(l), 0);
  const gstCents = gstOfInclusive(totalCents);
  const subtotalCents = totalCents - gstCents;
  return { subtotalCents, gstCents, totalCents };
}
