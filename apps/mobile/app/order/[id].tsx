import { useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Check, ChefHat, CircleCheckBig, Clock, Lock, ReceiptText, ShoppingBag } from 'lucide-react-native';
import {
  CUSTOMER_STEPS,
  STATUS_LABEL,
  formatNZD,
  formatSlotTime,
  statusStepIndex,
  subscribeToOrder,
  type OrderStatus,
} from '@darjeeling/shared';
import type { Order, OrderRow } from '@darjeeling/shared/types';
import { supabase } from '@/lib/supabase';
import { registerForPush } from '@/lib/push';
import { colors, font, radii, styles, type } from '@/lib/theme';
import { useOrder } from '@/hooks/queries';
import { useAuth } from '@/state/auth';
import { useToast } from '@/state/toast';
import { Button } from '@/components/Button';
import { KoruBackground } from '@/components/KoruBackground';
import { Banner, EmptyState, ErrorState, LoadingScreen, StatusBadge } from '@/components/ui';

const STEP_ICON: Record<string, typeof Check> = {
  received: ReceiptText,
  preparing: ChefHat,
  ready: Bell,
  collected: CircleCheckBig,
};

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = id ?? null;
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: order, isLoading, isError, refetch, isRefetching } = useOrder(orderId);
  const previousStatus = useRef<OrderStatus | null>(null);

  useEffect(() => {
    if (user) void registerForPush(user.id);
  }, [user]);

  // Live updates: write realtime rows into the cached order; refetch whenever the channel (re)connects.
  useEffect(() => {
    if (!orderId) return;
    return subscribeToOrder(
      supabase,
      orderId,
      (row: OrderRow) => {
        queryClient.setQueryData<Order | null>(['order', orderId], (prev) => (prev ? { ...prev, ...row } : prev));
      },
      (status) => {
        if (status === 'SUBSCRIBED') void refetch();
      },
    );
  }, [orderId, queryClient, refetch]);

  // Celebrate the moment the order becomes ready (not when opening an already-ready order).
  useEffect(() => {
    const status = order?.status ?? null;
    if (status && previousStatus.current && previousStatus.current !== status && status === 'ready') {
      toast.show('Your order is ready for pickup! 🛎', 'success');
    }
    previousStatus.current = status;
  }, [order?.status, toast]);

  if (!authLoading && !user) {
    return (
      <View style={[styles.screen, { padding: 16 }]}>
        <EmptyState
          art={<Lock color={colors.marigold} size={40} />}
          title="Sign in to see this order"
          message="Orders are private to the account that placed them."
          action={
            <Button
              title="Sign in"
              variant="primary"
              onPress={() => router.push({ pathname: '/signin', params: { next: `/order/${orderId ?? ''}` } })}
            />
          }
        />
      </View>
    );
  }
  if (isLoading || authLoading) return <LoadingScreen label="Loading your order…" />;
  if (isError && !order) {
    return (
      <View style={[styles.screen, { padding: 16 }]}>
        <ErrorState message="We couldn't load your order." onRetry={() => refetch()} />
      </View>
    );
  }
  if (!order) {
    return (
      <View style={[styles.screen, { padding: 16 }]}>
        <EmptyState
          title="Order not found"
          message="We couldn't find that order on your account."
          action={<Button title="Back to the menu" variant="action" onPress={() => router.navigate('/menu')} />}
        />
      </View>
    );
  }

  return (
    <OrderDetails
      order={order}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
    />
  );
}

function OrderDetails({ order, refreshing, onRefresh }: { order: Order; refreshing: boolean; onRefresh: () => void }) {
  const status = order.status;
  const paid = Boolean(order.paid_at);
  const cancelled = status === 'cancelled';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.marigold} colors={[colors.marigold]} />
      }
    >
      <Animated.View entering={FadeInDown.duration(400)} style={s.hero}>
        <KoruBackground tone="cream" opacity={0.06} />
        {paid && !cancelled ? (
          <Animated.View entering={ZoomIn.delay(150).springify().damping(12)} style={s.check}>
            <Check color={colors.indigo} size={30} strokeWidth={3} />
          </Animated.View>
        ) : null}
        <Text style={[type.kicker, { color: colors.marigold, textAlign: 'center' }]}>
          <Text accessibilityLanguage="mi">Ngā mihi</Text> · thanks for your order
        </Text>
        <Text style={s.number} accessibilityRole="header">
          {order.number}
        </Text>
        <StatusBadge status={status} />
      </Animated.View>

      {cancelled ? (
        <Banner kind="error">This order was cancelled.</Banner>
      ) : !paid ? (
        <Banner kind="warn">Payment not confirmed yet. If you didn&apos;t finish paying, this order won&apos;t be made.</Banner>
      ) : status === 'ready' ? (
        <Animated.View entering={ZoomIn.springify().damping(14)}>
          <Banner kind="success">Your order is ready — come grab it from the truck!</Banner>
        </Animated.View>
      ) : null}

      {paid && !cancelled ? <Progress status={status} /> : null}

      <View style={styles.card}>
        <Text style={type.h2}>Pickup</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Clock color={colors.marigold} size={18} />
          <Text style={type.body}>
            {order.pickup_slot ? `Ready around ${formatSlotTime(order.pickup_slot)}` : 'As soon as possible'}
          </Text>
        </View>
        {order.phone ? <Text style={type.caption}>Contact: {order.phone}</Text> : null}
        {order.notes ? <Text style={type.caption}>Notes: {order.notes}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={type.h2}>Items</Text>
        {order.items.map((it) => (
          <View key={it.id} style={{ flexDirection: 'row', gap: 10 }}>
            <Text style={[type.body, { flex: 1 }]}>
              <Text style={type.bodyBold}>{it.quantity} × </Text>
              {it.name}
              {it.selected_options.length > 0 ? (
                <Text style={type.caption}> · {it.selected_options.map((o) => o.choiceLabel).join(', ')}</Text>
              ) : null}
            </Text>
            <Text style={type.body}>{formatNZD(it.line_total_cents)}</Text>
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
        <View style={styles.rowBetween}>
          <Text style={type.h3}>Total</Text>
          <Text style={[type.h3, { fontFamily: font.display }]}>{formatNZD(order.total_cents)}</Text>
        </View>
      </View>

      <Button
        title="Order more momos"
        variant="outline"
        icon={<ShoppingBag color={colors.indigo} size={18} />}
        onPress={() => router.navigate('/menu')}
      />
    </ScrollView>
  );
}

/** Four-step tracker with an animated fill. */
function Progress({ status }: { status: OrderStatus }) {
  const index = statusStepIndex(status);
  const [trackWidth, setTrackWidth] = useState(0);
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(index / (CUSTOMER_STEPS.length - 1), { duration: 700 });
  }, [index, fill]);
  const bar = useAnimatedStyle(() => ({ width: fill.value * trackWidth }));

  return (
    <View style={[styles.card, { paddingVertical: 18 }]} accessible accessibilityLabel={`Order status: ${STATUS_LABEL[status]}`}>
      {/* The line runs between the first and last dot centres (36pt in from each edge), behind the dots. */}
      <View
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        style={{ position: 'absolute', top: 18 + 15, left: 16 + 36, right: 16 + 36, height: 6, borderRadius: 3, backgroundColor: colors.border }}
      >
        <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: colors.tealeaf }, bar]} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {CUSTOMER_STEPS.map((step, i) => {
          const done = i < index;
          const current = i === index;
          const Icon = STEP_ICON[step] ?? Check;
          return (
            <View key={step} style={{ alignItems: 'center', width: 72, gap: 6 }}>
              <View
                style={[
                  s.stepDot,
                  done && { backgroundColor: colors.tealeaf, borderColor: colors.tealeaf },
                  current && { backgroundColor: colors.marigold, borderColor: colors.marigold },
                ]}
              >
                <Icon color={done ? colors.white : current ? colors.indigo : colors.muted} size={16} />
              </View>
              <Text
                style={[type.caption, { textAlign: 'center', fontFamily: current ? font.bold : font.regular, color: current ? colors.indigo : colors.muted }]}
                numberOfLines={2}
              >
                {STATUS_LABEL[step]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: colors.indigo,
    borderRadius: radii.xl,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  check: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.marigold,
    marginBottom: 6,
  },
  number: { fontFamily: font.display, fontSize: 40, lineHeight: 48, color: colors.white },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
});
