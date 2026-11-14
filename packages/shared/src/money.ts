/**
 * Money is ALWAYS integer cents (NZD). Never use floating-point currency maths.
 */
import { CURRENCY_DISPLAY } from './config';

const nzdFormatter = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  currencyDisplay: 'symbol',
});

/** Format integer cents as "$12.50". */
export function formatNZD(cents: number): string {
  if (!Number.isFinite(cents)) throw new Error(`formatNZD: expected a number, got ${cents}`);
  return nzdFormatter.format(Math.round(cents) / 100);
}

/** Format with the currency code, e.g. "$12.50 NZD" (used on receipts). */
export function formatNZDWithCode(cents: number): string {
  return `${formatNZD(cents)} ${CURRENCY_DISPLAY}`;
}

/** Parse a dollar string like "12.50" into integer cents. For admin input. */
export function dollarsToCents(input: string | number): number {
  const n = typeof input === 'number' ? input : Number.parseFloat(input);
  if (!Number.isFinite(n)) throw new Error(`dollarsToCents: invalid amount "${input}"`);
  return Math.round(n * 100);
}

export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}
