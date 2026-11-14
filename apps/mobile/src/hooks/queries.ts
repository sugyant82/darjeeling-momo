import { useQuery } from '@tanstack/react-query';
import {
  fetchAvailableSlots,
  fetchMenu,
  fetchOrder,
  fetchOrderHistory,
  fetchTodaySchedule,
} from '@darjeeling/shared';
import { supabase } from '@/lib/supabase';

export function useMenu() {
  return useQuery({ queryKey: ['menu'], queryFn: () => fetchMenu(supabase) });
}
export function useTodaySchedule() {
  return useQuery({ queryKey: ['today-schedule'], queryFn: () => fetchTodaySchedule(supabase) });
}
export function useAvailableSlots() {
  return useQuery({ queryKey: ['slots'], queryFn: () => fetchAvailableSlots(supabase), staleTime: 15_000 });
}
export function useOrder(orderId: string | null) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => (orderId ? fetchOrder(supabase, orderId) : null),
    enabled: Boolean(orderId),
  });
}
export function useOrderHistory(userId: string | null) {
  return useQuery({
    queryKey: ['order-history', userId],
    queryFn: () => (userId ? fetchOrderHistory(supabase, userId) : []),
    enabled: Boolean(userId),
  });
}
