import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAvailableSlots,
  fetchMenu,
  fetchMenuItem,
  fetchOrder,
  fetchOrderHistory,
  fetchTodaySchedule,
} from '@darjeeling/shared';
import type { Menu } from '@darjeeling/shared/types';
import { supabase } from '@/lib/supabase';

export function useMenu() {
  return useQuery({ queryKey: ['menu'], queryFn: () => fetchMenu(supabase) });
}

/** One menu item. Shows instantly from the cached menu, then refreshes in the background. */
export function useMenuItem(id: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['menu-item', id],
    queryFn: () => fetchMenuItem(supabase, id as string),
    enabled: Boolean(id),
    initialData: () =>
      queryClient
        .getQueryData<Menu>(['menu'])
        ?.flatMap((c) => c.items)
        .find((i) => i.id === id),
    initialDataUpdatedAt: () => queryClient.getQueryState(['menu'])?.dataUpdatedAt,
  });
}

export function useTodaySchedule() {
  return useQuery({ queryKey: ['today-schedule'], queryFn: () => fetchTodaySchedule(supabase) });
}
export function useAvailableSlots(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['slots'],
    queryFn: () => fetchAvailableSlots(supabase),
    staleTime: 15_000,
    refetchInterval: options?.refetchInterval,
  });
}

const FINISHED = new Set(['collected', 'cancelled']);

/** An order; polls every 30s until it's collected or cancelled (backs up the realtime feed). */
export function useOrder(orderId: string | null) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => (orderId ? fetchOrder(supabase, orderId) : null),
    enabled: Boolean(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && FINISHED.has(status) ? false : 30_000;
    },
  });
}
export function useOrderHistory(userId: string | null) {
  return useQuery({
    queryKey: ['order-history', userId],
    queryFn: () => (userId ? fetchOrderHistory(supabase, userId) : []),
    enabled: Boolean(userId),
  });
}
