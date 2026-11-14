import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  CUSTOMER_STEPS,
  STATUS_LABEL,
  formatNZD,
  formatSlotTime,
  statusStepIndex,
  subscribeToOrder,
  type OrderStatus,
} from '@darjeeling/shared';
import type { OrderRow } from '@darjeeling/shared/types';
import { supabase } from '@/lib/supabase';
import { registerForPush } from '@/lib/push';
import { colors, radii, styles, type } from '@/lib/theme';
import { Loading, Banner, StatusBadge } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useToast } from '@/state/toast';
import { useOrder } from '@/hooks/queries';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const { data: order, isLoading } = useOrder(id ?? null);
  const [status, setStatus] = useState<OrderStatus | null>(null);

  useEffect(() => {
    if (user) registerForPush(user.id);
  }, [user]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribeToOrder(supabase, id, (row: OrderRow) => {
      setStatus(row.status);
      if (row.status === 'ready') toast.show('🛎 Your order is ready for pickup!', 'success');
    });
    return unsub;
  }, [id]);

  if (isLoading) return <Loading label="Loading your order…" />;
  if (!order)
    return (
      <View style={styles.container}>
        <Banner kind="error">We couldn&apos;t find that order.</Banner>
      </View>
    );

  const current = status ?? order.status;
  const stepIndex = statusStepIndex(current);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={[styles.card, { alignItems: 'center' }]}>
        <Text style={type.label}>Order</Text>
        <Text style={type.display}>{order.number}</Text>
        <StatusBadge status={current} />
        {!order.paid_at ? <Banner kind="warn">Awaiting payment confirmation…</Banner> : null}
      </View>

      {current === 'ready' ? <Banner kind="success">Your order is ready for pickup!</Banner> : null}
      {current === 'cancelled' ? <Banner kind="error">This order was cancelled.</Banner> : null}

      {current !== 'cancelled' ? (
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CUSTOMER_STEPS.map((s, i) => (
              <View
                key={s}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: radii.pill,
                  backgroundColor:
                    i < stepIndex ? colors.tealeaf : i === stepIndex ? colors.marigold : colors.border,
                }}
              />
            ))}
          </View>
          <Text style={[type.caption, { textAlign: 'center' }]}>{STATUS_LABEL[current]}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={type.h2}>Pickup</Text>
        <Text style={type.body}>
          {order.pickup_slot ? `Ready around ${formatSlotTime(order.pickup_slot)}` : 'ASAP'}
        </Text>
        {order.phone ? <Text style={type.caption}>Contact: {order.phone}</Text> : null}
        {order.notes ? <Text style={type.caption}>Notes: {order.notes}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={type.h2}>Items</Text>
        {order.items.map((it) => (
          <View key={it.id} style={styles.rowBetween}>
            <Text style={[type.body, { flex: 1 }]}>
              {it.quantity} × {it.name}
              {it.selected_options.length > 0
                ? ` (${it.selected_options.map((o) => o.choiceLabel).join(', ')})`
                : ''}
            </Text>
            <Text style={type.body}>{formatNZD(it.line_total_cents)}</Text>
          </View>
        ))}
        <View style={styles.rowBetween}>
          <Text style={type.bodyBold}>Total</Text>
          <Text style={type.bodyBold}>{formatNZD(order.total_cents)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
