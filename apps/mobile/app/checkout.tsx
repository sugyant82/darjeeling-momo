import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  confirmMockPayment,
  createOrderInputSchema,
  createPayment,
  fetchProfile,
  formatNZD,
  formatSlotTime,
  type CreatePaymentResponse,
} from '@darjeeling/shared';
import { supabase } from '@/lib/supabase';
import { payWithStripe } from '@/lib/stripe-pay';
import { colors, radii, styles, type } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Banner, Loading } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useCart } from '@/state/cart';
import { useToast } from '@/state/toast';
import { useAvailableSlots } from '@/hooks/queries';

export default function CheckoutScreen() {
  const { user, loading } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const { data: slotData, isLoading: slotsLoading } = useAvailableSlots();

  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'asap' | 'scheduled'>('asap');
  const [slotIso, setSlotIso] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState<CreatePaymentResponse | null>(null);

  useEffect(() => {
    if (user) fetchProfile(supabase, user.id).then((p) => p?.phone && setPhone(p.phone));
  }, [user]);

  if (loading || slotsLoading) return <Loading />;

  if (!user) {
    return (
      <View style={styles.container}>
        <Banner kind="info">Please sign in to place your order.</Banner>
        <Button
          title="Sign in"
          variant="primary"
          onPress={() => router.push({ pathname: '/signin', params: { next: '/checkout' } })}
        />
      </View>
    );
  }

  const availableSlots = (slotData?.slots ?? []).filter((s) => !s.full);
  const open = slotData?.open ?? false;
  const canOrder = open && availableSlots.length > 0;

  async function submit() {
    const pickup =
      mode === 'asap'
        ? { pickupSlotIso: availableSlots[0]?.startIso ?? null, pickupAsap: true }
        : { pickupSlotIso: slotIso || null, pickupAsap: false };

    const parsed = createOrderInputSchema.safeParse({
      items: cart.lines.map((l) => ({
        menuItemId: l.menuItemId,
        quantity: l.quantity,
        selectedOptions: l.selectedOptions,
      })),
      pickupSlotIso: pickup.pickupSlotIso,
      pickupAsap: pickup.pickupAsap,
      locationId: slotData?.schedule?.id ?? null,
      phone,
      notes,
    });
    if (!parsed.success) {
      toast.show(parsed.error.issues[0]?.message ?? 'Check your details.', 'error');
      return;
    }
    if (mode === 'scheduled' && !slotIso) {
      toast.show('Choose a pickup time.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createPayment(supabase, parsed.data);
      if (res.provider === 'stripe') {
        const result = await payWithStripe(res.clientSecret, res.publishableKey);
        if (result.ok) {
          await finish(res.orderId);
        } else {
          toast.show(result.error ?? 'Payment failed.', 'error');
        }
      } else {
        setPayment(res); // show mock sheet
      }
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Could not start checkout.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function finish(orderId: string) {
    await cart.clear();
    setPayment(null);
    router.replace(`/order/${orderId}`);
  }

  async function mockDecide(decision: 'pay' | 'decline') {
    if (!payment) return;
    try {
      const res = await confirmMockPayment(supabase, payment.orderId, decision);
      if (res.paid) await finish(payment.orderId);
      else {
        toast.show('Payment declined — order cancelled.', 'error');
        setPayment(null);
      }
    } catch {
      toast.show('Payment could not be processed.', 'error');
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {!open ? (
          <Banner kind="warn">The truck is closed right now — checkout is paused.</Banner>
        ) : availableSlots.length === 0 ? (
          <Banner kind="warn">All pickup slots are full today. Please try later.</Banner>
        ) : null}

        <View style={styles.card}>
          <Text style={type.h2}>Pickup</Text>
          <Text style={type.bodyBold}>{slotData?.schedule?.place ?? 'Truck'}</Text>
          <Text style={type.caption}>{slotData?.schedule?.address}</Text>
          <RadioRow label="ASAP" selected={mode === 'asap'} onPress={() => setMode('asap')} disabled={!canOrder} />
          <RadioRow
            label="Schedule a time"
            selected={mode === 'scheduled'}
            onPress={() => setMode('scheduled')}
            disabled={!canOrder}
          />
          {mode === 'scheduled' ? (
            <View style={{ gap: 8 }}>
              {availableSlots.map((s) => (
                <RadioRow
                  key={s.startIso}
                  label={formatSlotTime(s.startIso)}
                  selected={slotIso === s.startIso}
                  onPress={() => setSlotIso(s.startIso)}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={type.h2}>Contact</Text>
          <Text style={type.label}>Phone number</Text>
          <TextInput style={styles.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="021 123 4567" />
          <Text style={type.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="Allergies, extra achar…"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={type.label}>GST (15% incl.)</Text>
            <Text style={type.body}>{formatNZD(cart.totals.gstCents)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={type.bodyBold}>Total</Text>
            <Text style={type.bodyBold}>{formatNZD(cart.totals.totalCents)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={{ padding: 16 }}>
        <Button
          title={submitting ? 'Starting payment…' : `Pay ${formatNZD(cart.totals.totalCents)}`}
          variant="primary"
          disabled={!canOrder || submitting || !phone}
          onPress={submit}
        />
      </View>

      <Modal visible={payment?.provider === 'mock'} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,42,68,0.5)' }}>
          <View style={{ backgroundColor: colors.cream, padding: 24, borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, gap: 14 }}>
            <Banner kind="warn">Test payment — no real money. Uses the same server path as Stripe.</Banner>
            <Text style={type.h2}>Pay {formatNZD(payment?.amountCents ?? 0)}</Text>
            <Button title="Pay" variant="success" onPress={() => mockDecide('pay')} />
            <Button title="Decline" variant="danger" onPress={() => mockDecide('decline')} />
            <Button title="Cancel" variant="outline" onPress={() => setPayment(null)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RadioRow({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.card,
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          opacity: disabled ? 0.5 : 1,
          borderColor: selected ? colors.marigold : colors.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selected ? colors.marigold : colors.muted,
          backgroundColor: selected ? colors.marigold : 'transparent',
        }}
      />
      <Text style={type.body}>{label}</Text>
    </Pressable>
  );
}
