import { describe, expect, it } from 'vitest';
import {
  canTransition,
  isTerminal,
  nextStatuses,
  primaryNextStatus,
  statusStepIndex,
} from './order-status';

describe('order-status rules', () => {
  it('allows the happy-path forward transitions', () => {
    expect(canTransition('received', 'preparing')).toBe(true);
    expect(canTransition('preparing', 'ready')).toBe(true);
    expect(canTransition('ready', 'collected')).toBe(true);
  });

  it('allows cancellation from any non-terminal state', () => {
    expect(canTransition('received', 'cancelled')).toBe(true);
    expect(canTransition('preparing', 'cancelled')).toBe(true);
    expect(canTransition('ready', 'cancelled')).toBe(true);
  });

  it('forbids skipping states and going backwards', () => {
    expect(canTransition('received', 'ready')).toBe(false);
    expect(canTransition('received', 'collected')).toBe(false);
    expect(canTransition('ready', 'preparing')).toBe(false);
  });

  it('forbids any transition out of terminal states', () => {
    expect(nextStatuses('collected')).toEqual([]);
    expect(nextStatuses('cancelled')).toEqual([]);
    expect(canTransition('collected', 'preparing')).toBe(false);
    expect(isTerminal('collected')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('received')).toBe(false);
  });

  it('gives the single advance action for the staff board', () => {
    expect(primaryNextStatus('received')).toBe('preparing');
    expect(primaryNextStatus('preparing')).toBe('ready');
    expect(primaryNextStatus('ready')).toBe('collected');
    expect(primaryNextStatus('collected')).toBeNull();
  });

  it('maps statuses to customer step indices', () => {
    expect(statusStepIndex('received')).toBe(0);
    expect(statusStepIndex('ready')).toBe(2);
    expect(statusStepIndex('collected')).toBe(3);
    expect(statusStepIndex('cancelled')).toBe(-1);
  });
});
