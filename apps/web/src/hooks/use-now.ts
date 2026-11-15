'use client';

import { useSyncExternalStore } from 'react';

/**
 * Current time in ms, refreshed every 30s while anything is subscribed. Lets
 * time-dependent labels ("Open now") update live without reading the clock in render.
 */
const TICK_MS = 30_000;
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      now = Date.now();
      for (const notify of listeners) notify();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  // Refresh a stale value (e.g. first subscriber after a long idle) before the next tick.
  const t = Date.now();
  if (t - now >= TICK_MS) now = t;
  return now;
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
