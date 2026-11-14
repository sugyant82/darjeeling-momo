// Mirror of packages/shared pricing. Kept inline because Edge Functions run on
// Deno and cannot easily import the workspace package. Keep in sync.

export function gstOfInclusive(inclusiveCents: number): number {
  return Math.round((inclusiveCents * 3) / 23);
}

export interface Line {
  unitPriceCents: number;
  quantity: number;
}

export function computeTotals(lines: Line[]) {
  const totalCents = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const gstCents = gstOfInclusive(totalCents);
  return { subtotalCents: totalCents - gstCents, gstCents, totalCents };
}
