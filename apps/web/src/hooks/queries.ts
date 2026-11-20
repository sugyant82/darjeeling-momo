'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchActiveOrders,
  fetchAvailableSlots,
  fetchMenu,
  fetchOrderHistory,
  fetchPickupOptions,
  fetchTodayLocations,
  fetchTodaySales,
  fetchTodaySchedule,
  fetchOrder,
} from '@darjeeling/shared';
import { getBrowserSupabase } from '@/lib/supabase/client';

export function useMenu() {
  const supabase = getBrowserSupabase();
  return useQuery({ queryKey: ['menu'], queryFn: () => fetchMenu(supabase) });
}

export function useTodaySchedule() {
  const supabase = getBrowserSupabase();
  return useQuery({
    queryKey: ['today-schedule'],
    queryFn: () => fetchTodaySchedule(supabase),
  });
}

export function useAvailableSlots() {
  const supabase = getBrowserSupabase();
  return useQuery({
    queryKey: ['slots'],
    queryFn: () => fetchAvailableSlots(supabase),
    staleTime: 15_000,
  });
}

/** Today's pickup locations (home and/or truck). */
export function useTodayLocations() {
  const supabase = getBrowserSupabase();
  return useQuery({
    queryKey: ['today-locations'],
    queryFn: () => fetchTodayLocations(supabase),
    staleTime: 15_000,
  });
}

/** Cart-aware pickup options per location: earliest achievable time + bookable slots. */
export function usePickupOptions(prepMinutes: number) {
  const supabase = getBrowserSupabase();
  return useQuery({
    queryKey: ['pickup-options', prepMinutes],
    queryFn: () => fetchPickupOptions(supabase, { prepMinutes }),
    // Keep achievable times and fullness fresh as the clock moves and the kitchen dial changes.
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useOrder(orderId: string | null) {
  const supabase = getBrowserSupabase();
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => (orderId ? fetchOrder(supabase, orderId) : null),
    enabled: Boolean(orderId),
  });
}

export function useOrderHistory(userId: string | null) {
  const supabase = getBrowserSupabase();
  return useQuery({
    queryKey: ['order-history', userId],
    queryFn: () => (userId ? fetchOrderHistory(supabase, userId) : []),
    enabled: Boolean(userId),
  });
}

export function useActiveOrders(enabled: boolean) {
  const supabase = getBrowserSupabase();
  return useQuery({
    queryKey: ['active-orders'],
    queryFn: () => fetchActiveOrders(supabase),
    enabled,
    staleTime: 0,
  });
}

export function useTodaySales(enabled: boolean) {
  const supabase = getBrowserSupabase();
  return useQuery({
    queryKey: ['today-sales'],
    queryFn: () => fetchTodaySales(supabase),
    enabled,
  });
}
