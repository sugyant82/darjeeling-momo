'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useAuth } from './auth-context';

const GUEST_KEY = 'dm_guest_cart_v1';

interface CartState {
  lines: CartLine[];
  count: number;
  totals: { subtotalCents: number; gstCents: number; totalCents: number };
  loading: boolean;
  addItem: (item: MenuItem, selectedOptions: SelectedOption[], quantity: number) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartState | null>(null);

function readGuest(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}
function writeGuest(lines: CartLine[]) {
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable (private mode) — cart is in-memory for this session */
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const supabase = getBrowserSupabase();
  const { user, loading: authLoading } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const prevUserId = useRef<string | null>(null);

  // Load and keep the cart in sync with auth state (+ guest->account merge).
  useEffect(() => {
    if (authLoading) return;
    let active = true;

    (async () => {
      setLoading(true);
      if (user) {
        // Merge guest cart on fresh sign-in.
        if (prevUserId.current === null) {
          const guest = readGuest();
          if (guest.length > 0) {
            try {
              await mergeGuestCart(supabase, user.id, { lines: guest });
              writeGuest([]);
            } catch {
              /* ignore merge failure; guest cart remains */
            }
          }
        }
        try {
          const cart = await fetchCart(supabase, user.id);
          if (active) setLines(cart.lines);
        } catch {
          if (active) setLines([]);
        }
      } else {
        setLines(readGuest());
      }
      prevUserId.current = user?.id ?? null;
      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const reload = async () => {
    if (user) {
      const cart = await fetchCart(supabase, user.id);
      setLines(cart.lines);
    }
  };

  const api = useMemo<CartState>(() => {
    return {
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      totals: computeTotals(
        lines.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
      ),
      loading,
      async addItem(item, selectedOptions, quantity) {
        const unit = unitPriceCents(
          item.price_cents,
          selectedOptions.map((o) => o.priceDeltaCents),
        );
        if (user) {
          await addCartItem(supabase, user.id, {
            menuItemId: item.id,
            quantity,
            selectedOptions,
          });
          await reload();
        } else {
          const line: CartLine = {
            id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            menuItemId: item.id,
            name: item.name,
            imageUrl: item.image_url,
            basePriceCents: item.price_cents,
            quantity,
            selectedOptions,
            unitPriceCents: unit,
          };
          setLines((prev) => {
            const next = [...prev, line];
            writeGuest(next);
            return next;
          });
        }
      },
      async updateQuantity(lineId, quantity) {
        if (user) {
          await updateCartItemQuantity(supabase, lineId, quantity);
          await reload();
        } else {
          setLines((prev) => {
            const next =
              quantity <= 0
                ? prev.filter((l) => l.id !== lineId)
                : prev.map((l) => (l.id === lineId ? { ...l, quantity } : l));
            writeGuest(next);
            return next;
          });
        }
      },
      async removeItem(lineId) {
        if (user) {
          await removeCartItem(supabase, lineId);
          await reload();
        } else {
          setLines((prev) => {
            const next = prev.filter((l) => l.id !== lineId);
            writeGuest(next);
            return next;
          });
        }
      },
      async clear() {
        if (user) {
          await clearDbCart(supabase, user.id);
          setLines([]);
        } else {
          setLines([]);
          writeGuest([]);
        }
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, loading, user]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
