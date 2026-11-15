import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addCartItem,
  clearCart as clearDbCart,
  computeTotals,
  fetchCart,
  mergeGuestCart,
  removeCartItem,
  unitPriceCents,
  updateCartItemQuantity,
} from '@darjeeling/shared';
import type { CartLine, MenuItem, SelectedOption } from '@darjeeling/shared/types';
import { supabase } from '@/lib/supabase';
import { useAuth } from './auth';

const GUEST_KEY = 'dm_guest_cart_v1';
/** Matches the server's per-line limit (createOrderInputSchema). */
export const MAX_LINE_QTY = 50;

interface CartState {
  lines: CartLine[];
  count: number;
  totals: { subtotalCents: number; gstCents: number; totalCents: number };
  loading: boolean;
  addItem: (item: MenuItem, selectedOptions: SelectedOption[], quantity: number) => Promise<void>;
  /** Optimistic: the UI updates immediately; rejects (after re-syncing) if the server refuses. */
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  clear: () => Promise<void>;
  /** Re-read the signed-in cart from the server (e.g. after adding lines elsewhere). */
  reload: () => Promise<void>;
  /** Put lines back if a cancelled/failed checkout left the cart empty. */
  restore: (lines: CartLine[]) => Promise<void>;
}

const CartContext = createContext<CartState | null>(null);

const clampQty = (q: number) => Math.min(MAX_LINE_QTY, Math.max(0, Math.round(q)));

function isCartLine(x: unknown): x is CartLine {
  const l = x as Partial<CartLine> | null;
  return (
    !!l &&
    typeof l.id === 'string' &&
    typeof l.menuItemId === 'string' &&
    typeof l.name === 'string' &&
    Number.isFinite(l.unitPriceCents) &&
    Number.isInteger(l.quantity) &&
    (l.quantity ?? 0) > 0 &&
    Array.isArray(l.selectedOptions)
  );
}

/** Saved guest cart, validated (old or corrupt data must never crash the Cart tab). */
async function readGuest(): Promise<CartLine[]> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartLine).map((l) => ({ ...l, quantity: clampQty(l.quantity) || 1 }));
  } catch {
    return [];
  }
}
async function writeGuest(lines: CartLine[]) {
  try {
    await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(lines));
  } catch {
    /* ignore */
  }
}

/** Merge the guest cart into the account cart; falls back to line by line so one bad line can't sink the rest. */
async function mergeGuestLines(userId: string, guest: CartLine[]): Promise<{ failed: number }> {
  try {
    await mergeGuestCart(supabase, userId, { lines: guest });
    return { failed: 0 };
  } catch {
    let failed = 0;
    for (const line of guest) {
      try {
        await addCartItem(supabase, userId, {
          menuItemId: line.menuItemId,
          quantity: line.quantity,
          selectedOptions: line.selectedOptions,
        });
      } catch {
        failed += 1; // e.g. the item was removed from the menu
      }
    }
    return { failed };
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  /** Per-line queues so rapid taps reach the server in order (last tap wins). */
  const queues = useRef(new Map<string, Promise<unknown>>());

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    (async () => {
      setLoading(true);
      if (userId) {
        const guest = await readGuest();
        if (guest.length > 0) {
          const { failed } = await mergeGuestLines(userId, guest);
          // Keep the guest cart if nothing could be merged (likely offline); otherwise it's done.
          if (failed < guest.length) await writeGuest([]);
        }
        try {
          const cart = await fetchCart(supabase, userId);
          if (active) setLines(cart.lines);
        } catch {
          if (active) setLines([]);
        }
      } else {
        const guest = await readGuest();
        if (active) setLines(guest);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId, authLoading]);

  // Guests' carts live on the device.
  useEffect(() => {
    if (!userId && !loading) void writeGuest(lines);
  }, [lines, userId, loading]);

  const reload = useCallback(async () => {
    if (!userId) return;
    const cart = await fetchCart(supabase, userId);
    setLines(cart.lines);
  }, [userId]);

  const enqueue = useCallback((key: string, task: () => Promise<void>): Promise<void> => {
    const previous = queues.current.get(key) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(task);
    queues.current.set(key, next);
    next
      .finally(() => {
        if (queues.current.get(key) === next) queues.current.delete(key);
      })
      .catch(() => {});
    return next;
  }, []);

  /** Run a server write; on failure re-sync from the server and rethrow for the caller to report. */
  const syncOrRevert = useCallback(
    async (write: () => Promise<void>) => {
      try {
        await write();
      } catch (err) {
        await reload().catch(() => {});
        throw err;
      }
    },
    [reload],
  );

  const removeItem = useCallback(
    async (lineId: string) => {
      setLines((prev) => prev.filter((l) => l.id !== lineId));
      if (!userId) return;
      await enqueue(lineId, () => syncOrRevert(() => removeCartItem(supabase, lineId)));
    },
    [userId, enqueue, syncOrRevert],
  );

  const api = useMemo<CartState>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      totals: computeTotals(lines.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity }))),
      loading,
      reload,
      removeItem,
      async addItem(item, selectedOptions, quantity) {
        const qty = clampQty(quantity) || 1;
        if (userId) {
          await addCartItem(supabase, userId, { menuItemId: item.id, quantity: qty, selectedOptions });
          await reload();
          return;
        }
        const line: CartLine = {
          id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          menuItemId: item.id,
          name: item.name,
          imageUrl: item.image_url,
          basePriceCents: item.price_cents,
          quantity: qty,
          selectedOptions,
          unitPriceCents: unitPriceCents(item.price_cents, selectedOptions.map((o) => o.priceDeltaCents)),
        };
        setLines((prev) => [...prev, line]);
      },
      async updateQuantity(lineId, quantity) {
        const qty = clampQty(quantity);
        if (qty === 0) return removeItem(lineId);
        setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, quantity: qty } : l)));
        if (!userId) return;
        await enqueue(lineId, () => syncOrRevert(() => updateCartItemQuantity(supabase, lineId, qty)));
      },
      async clear() {
        setLines([]);
        if (userId) await clearDbCart(supabase, userId);
      },
      async restore(snapshot) {
        if (snapshot.length === 0) return;
        if (!userId) {
          setLines(snapshot);
          return;
        }
        const current = await fetchCart(supabase, userId).catch(() => null);
        if (current && current.lines.length === 0) {
          for (const line of snapshot) {
            await addCartItem(supabase, userId, {
              menuItemId: line.menuItemId,
              quantity: line.quantity,
              selectedOptions: line.selectedOptions,
            }).catch(() => {});
          }
        }
        await reload().catch(() => {});
      },
    }),
    [lines, loading, userId, reload, removeItem, enqueue, syncOrRevert],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
