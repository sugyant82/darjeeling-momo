import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

async function readGuest(): Promise<CartLine[]> {
  try {
    const raw = await AsyncStorage.getItem(GUEST_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    (async () => {
      setLoading(true);
      if (user) {
        if (prevUserId.current === null) {
          const guest = await readGuest();
          if (guest.length > 0) {
            try {
              await mergeGuestCart(supabase, user.id, { lines: guest });
              await writeGuest([]);
            } catch {
              /* ignore */
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
        setLines(await readGuest());
      }
      prevUserId.current = user?.id ?? null;
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const reload = async () => {
    if (user) setLines((await fetchCart(supabase, user.id)).lines);
  };

  const api = useMemo<CartState>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      totals: computeTotals(lines.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity }))),
      loading,
      async addItem(item, selectedOptions, quantity) {
        const unit = unitPriceCents(item.price_cents, selectedOptions.map((o) => o.priceDeltaCents));
        if (user) {
          await addCartItem(supabase, user.id, { menuItemId: item.id, quantity, selectedOptions });
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
            void writeGuest(next);
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
            void writeGuest(next);
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
            void writeGuest(next);
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
          await writeGuest([]);
        }
      },
    }),
    [lines, loading, user],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
