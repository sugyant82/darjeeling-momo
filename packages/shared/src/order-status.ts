/**
 * Order status lifecycle and the rules for moving between states.
 * Received → Preparing → Ready for pickup → Collected, plus Cancelled.
 */
import type { ColorToken } from '@darjeeling/tokens';

export const ORDER_STATUSES = [
  'received',
  'preparing',
  'ready',
  'collected',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Allowed forward transitions. Cancellation is allowed from any non-terminal state. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['collected', 'cancelled'],
  collected: [],
  cancelled: [],
};

const TERMINAL: OrderStatus[] = ['collected', 'cancelled'];

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL.includes(status);
}

export function nextStatuses(status: OrderStatus): OrderStatus[] {
  return TRANSITIONS[status];
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** The single "advance" action the staff board uses (ignores cancel). */
export function primaryNextStatus(status: OrderStatus): OrderStatus | null {
  const forward = TRANSITIONS[status].filter((s) => s !== 'cancelled');
  return forward[0] ?? null;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  received: 'Received',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  collected: 'Collected',
  cancelled: 'Cancelled',
};

/** Token name from @darjeeling/tokens for the status badge colour. */
export const STATUS_COLOR: Record<OrderStatus, ColorToken> = {
  received: 'indigo',
  preparing: 'marigold',
  ready: 'tealeaf',
  collected: 'muted',
  cancelled: 'achar',
};

/** The customer-facing step index (for a progress tracker). Cancelled = -1. */
export function statusStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'received':
      return 0;
    case 'preparing':
      return 1;
    case 'ready':
      return 2;
    case 'collected':
      return 3;
    case 'cancelled':
      return -1;
  }
}

export const CUSTOMER_STEPS: OrderStatus[] = ['received', 'preparing', 'ready', 'collected'];
