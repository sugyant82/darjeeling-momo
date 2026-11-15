import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarClock, Lock, MapPin, Phone, Zap, type LucideIcon } from 'lucide-react-native';
import {
  confirmMockPayment,
  createOrderInputSchema,
  createPayment,
  fetchProfile,
  formatNZD,
  formatSlotTime,
  type CreatePaymentResponse,
  type FunctionError,
} from '@darjeeling/shared';
import type { CartLine } from '@darjeeling/shared/types';
import { supabase } from '@/lib/supabase';
import { payWithStripe } from '@/lib/stripe-pay';
import { colors, font, radii, shadows, styles, tint, type } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import { useAvailableSlots } from '@/hooks/queries';
import { useAuth } from '@/state/auth';
import { useCart } from '@/state/cart';
import { useToast } from '@/state/toast';
import { Button } from '@/components/Button';
import { Banner, EmptyState, ErrorState, LoadingScreen } from '@/components/ui';

const DONE_ACCESSORY = 'checkout-done';
type PickupMode = 'asap' | 'scheduled';

/** Plain-language versions of the order validation errors. */
function friendlyIssue(path: PropertyKey | undefined): string {
  switch (path) {
    case 'phone':
      return 'Enter a valid phone number (at least 6 digits) so we can reach you.';
    case 'items':
      return 'Your cart is empty.';
    case 'notes':
      return 'Notes can be up to 500 characters.';
    case 'pickupSlotIso':
      return 'Choose a pickup time.';
    default:
      return 'Please check your details and try again.';
  }
}

export default function CheckoutScreen() {
  const { user, loading: authLoading } = useAuth();
  const cart = useCart();
  const slots = useAvailableSlots({ refetchInterval: 60_000 });

  if (authLoading || cart.loading) return <LoadingScreen label="Getting checkout ready…" />;

  if (!user) {
    return (
      <View style={[styles.screen, { padding: 16 }]}>
        <EmptyState
          art={<Lock color={colors.marigold} size={40} />}
          title="Sign in to order"
          message="Browse freely — you only need an account to place your order."
          action={
            <Button
              title="Sign in"
              variant="primary"
              onPress={() => router.push({ pathname: '/signin', params: { next: '/checkout' } })}
            />
          }
        />
      </View>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <View style={[styles.screen, { padding: 16 }]}>
        <EmptyState
          title="Nothing to check out"
          message="Your kete is empty. Add some momos first."
          action={<Button title="Browse the menu" variant="action" onPress={() => router.navigate('/menu')} />}
        />
      </View>
    );
  }

  if (slots.isLoading) return <LoadingScreen label="Checking pickup times…" />;
  if (slots.isError || !slots.data) {
    return (
      <View style={[styles.screen, { padding: 16 }]}>
        <ErrorState message="We couldn't load pickup times." onRetry={() => slots.refetch()} />
      </View>
    );
  }

  return <CheckoutForm userId={user.id} slotData={slots.data} />;
}

type SlotData = NonNullable<ReturnType<typeof useAvailableSlots>['data']>;

function CheckoutForm({ userId, slotData }: { userId: string; slotData: SlotData }) {
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<PickupMode>('asap');
  const [slotIso, setSlotIso] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [payment, setPayment] = useState<CreatePaymentResponse | null>(null);
  /** Cart lines at checkout time, to put back if payment is cancelled or fails. */
  const snapshot = useRef<CartLine[]>([]);

  // Prefill the phone once from the profile, without overwriting anything typed.
  useEffect(() => {
    let active = true;
    fetchProfile(supabase, userId)
      .then((p) => {
        if (active && p?.phone) setPhone((prev) => prev || (p.phone ?? ''));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId]);

  const availableSlots = slotData.slots.filter((s) => !s.full);
  const open = slotData.open;
  const canOrder = open && availableSlots.length > 0;
  // A chosen slot that has since filled up or passed simply stops counting as chosen.
  const chosenSlot = availableSlots.some((s) => s.startIso === slotIso) ? slotIso : '';
  const firstSlot = availableSlots[0]?.startIso;

  const blockedReason = !open
    ? "The truck is closed right now — checkout opens when we're trading."
    : availableSlots.length === 0
      ? 'All pickup times are full today. Please try again later.'
      : !phone.trim()
        ? 'Add a phone number so we can reach you.'
        : mode === 'scheduled' && !chosenSlot
          ? 'Choose a pickup time.'
          : null;

  function finish(orderId: string) {
    setPayment(null);
    router.replace(`/order/${orderId}`);
    haptics.success();
    // The server has already emptied the cart; clear locally and refresh lists in the background.
    void cart.clear().catch(() => {});
    void queryClient.invalidateQueries({ queryKey: ['order-history'] });
    void queryClient.invalidateQueries({ queryKey: ['slots'] });
  }

  async function submit() {
    Keyboard.dismiss();
    setFormError(null);
    const pickup =
      mode === 'asap'
        ? { pickupSlotIso: firstSlot ?? null, pickupAsap: true }
        : { pickupSlotIso: chosenSlot || null, pickupAsap: false };
    if (mode === 'scheduled' && !chosenSlot) {
      setFormError('Choose a pickup time.');
      haptics.error();
      return;
    }
    const parsed = createOrderInputSchema.safeParse({
      items: cart.lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, selectedOptions: l.selectedOptions })),
      ...pickup,
      locationId: slotData.schedule?.id ?? null,
      phone,
      notes,
    });
    if (!parsed.success) {
      setFormError(friendlyIssue(parsed.error.issues[0]?.path[0]));
      haptics.error();
      return;
    }

    snapshot.current = cart.lines;
    setSubmitting(true);
    try {
      const res = await createPayment(supabase, parsed.data);
      if (res.provider === 'stripe') {
        const result = await payWithStripe(res.clientSecret, res.publishableKey);
        if (result.ok) finish(res.orderId);
        else {
          await cart.restore(snapshot.current).catch(() => {});
          setFormError(result.error ?? 'Payment failed. Your cart is still here.');
        }
      } else {
        setPayment(res);
      }
    } catch (err) {
      const e = err as FunctionError;
      setFormError(e.message || 'Could not start checkout. Please try again.');
      haptics.error();
      if (e.soldOut) {
        void queryClient.invalidateQueries({ queryKey: ['menu'] });
        void cart.reload().catch(() => {});
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function abandon(orderId: string, message: string, kind: 'info' | 'error') {
    setPayment(null);
    // Cancel the unpaid order so it doesn't linger as "Received", and keep the customer's cart.
    await confirmMockPayment(supabase, orderId, 'decline').catch(() => {});
    await cart.restore(snapshot.current).catch(() => {});
    toast.show(message, kind);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        {!open ? (
          <Banner kind="warn">The truck is closed right now — checkout is paused.</Banner>
        ) : availableSlots.length === 0 ? (
          <Banner kind="warn">All pickup times are full today. Please try later.</Banner>
        ) : null}

        <Section title="Pickup" Icon={MapPin}>
          <View style={{ gap: 2 }}>
            <Text style={type.bodyBold}>{slotData.schedule?.place ?? 'The truck'}</Text>
            {slotData.schedule?.address ? <Text style={type.caption}>{slotData.schedule.address}</Text> : null}
          </View>
          <Segmented value={mode} onChange={setMode} disabled={!canOrder} />
          {mode === 'asap' ? (
            <Text style={type.label}>
              {firstSlot ? `Ready around ${formatSlotTime(firstSlot)}` : 'No pickup times available right now.'}
            </Text>
          ) : (
            <Animated.View entering={FadeIn.duration(200)} style={s.slotGrid}>
              {availableSlots.map((slot) => {
                const selected = chosenSlot === slot.startIso;
                return (
                  <Pressable
                    key={slot.startIso}
                    onPress={() => {
                      haptics.select();
                      setSlotIso(slot.startIso);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`Pickup at ${formatSlotTime(slot.startIso)}`}
                    style={[s.slot, selected && s.slotOn]}
                  >
                    <Text style={[s.slotText, selected && { color: colors.indigo }]}>{formatSlotTime(slot.startIso)}</Text>
                  </Pressable>
                );
              })}
            </Animated.View>
          )}
        </Section>

        <Section title="Contact" Icon={Phone}>
          <Field label="Phone number">
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              value={phone}
              onChangeText={setPhone}
              placeholder="021 123 4567"
              placeholderTextColor={colors.disabled}
              maxLength={20}
              inputAccessoryViewID={DONE_ACCESSORY}
              accessibilityLabel="Phone number"
            />
          </Field>
          <Field label="Notes (optional)" hint={`${notes.length}/500`}>
            <TextInput
              style={[styles.input, { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' }]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Allergies, extra achar…"
              placeholderTextColor={colors.disabled}
              maxLength={500}
              inputAccessoryViewID={DONE_ACCESSORY}
              accessibilityLabel="Order notes"
            />
          </Field>
        </Section>

        <Section title="Your order" Icon={Zap}>
          {cart.lines.map((l) => (
            <View key={l.id} style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={[type.body, { flex: 1 }]}>
                <Text style={type.bodyBold}>{l.quantity} × </Text>
                {l.name}
                {l.selectedOptions.length > 0 ? (
                  <Text style={type.caption}> · {l.selectedOptions.map((o) => o.choiceLabel).join(', ')}</Text>
                ) : null}
              </Text>
              <Text style={type.body}>{formatNZD(l.unitPriceCents * l.quantity)}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
          <View style={styles.rowBetween}>
            <Text style={type.label}>GST (15% incl.)</Text>
            <Text style={type.body}>{formatNZD(cart.totals.gstCents)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={type.h3}>Total</Text>
            <Text style={[type.h3, { fontFamily: font.display }]}>{formatNZD(cart.totals.totalCents)}</Text>
          </View>
        </Section>
      </ScrollView>

      <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {formError ? (
          <Animated.View entering={FadeIn.duration(200)}>
            <Banner kind="error">{formError}</Banner>
          </Animated.View>
        ) : blockedReason ? (
          <Text style={[type.label, { textAlign: 'center' }]}>{blockedReason}</Text>
        ) : null}
        <Button
          title={`Pay ${formatNZD(cart.totals.totalCents)}`}
          variant="primary"
          size="lg"
          icon={<Lock color={colors.white} size={18} />}
          loading={submitting}
          disabled={Boolean(blockedReason) || submitting}
          onPress={submit}
        />
      </View>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={DONE_ACCESSORY}>
          <View style={s.accessory}>
            <Button title="Done" variant="ghost" size="sm" onPress={Keyboard.dismiss} />
          </View>
        </InputAccessoryView>
      ) : null}

      {payment?.provider === 'mock' ? (
        <MockPaymentSheet
          payment={payment}
          onPaid={() => finish(payment.orderId)}
          onDeclined={() =>
            abandon(payment.orderId, 'Payment declined — that order was cancelled. Your cart is still here.', 'error')
          }
          onCancel={() => abandon(payment.orderId, 'Payment cancelled — your cart is still here.', 'info')}
        />
      ) : null}
    </View>
  );
}

/** The test-mode payment sheet. Errors show inside it (a toast would be hidden behind the modal). */
function MockPaymentSheet({
  payment,
  onPaid,
  onDeclined,
  onCancel,
}: {
  payment: CreatePaymentResponse;
  onPaid: () => void;
  onDeclined: () => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<'pay' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy('pay');
    setError(null);
    try {
      const res = await confirmMockPayment(supabase, payment.orderId, 'pay');
      if (res.paid) onPaid();
      else setError("The payment didn't go through. Try again or cancel.");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment could not be processed.');
      haptics.error();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!busy) onCancel(); }}>
      <View style={s.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => !busy && onCancel()}
          accessibilityRole="button"
          accessibilityLabel="Cancel payment"
        />
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(180)}
          style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}
        >
          <View style={s.handle} />
          <Banner kind="warn">Test payment — no real money. Uses the same server path as Stripe.</Banner>
          <View style={{ alignItems: 'center', gap: 2, marginVertical: 6 }}>
            <Text style={type.label}>Order {payment.orderNumber}</Text>
            <Text style={[type.display, { fontSize: 40, lineHeight: 46 }]}>{formatNZD(payment.amountCents)}</Text>
          </View>
          {error ? <Banner kind="error">{error}</Banner> : null}
          <Button
            title={`Pay ${formatNZD(payment.amountCents)}`}
            variant="success"
            size="lg"
            loading={busy === 'pay'}
            disabled={busy !== null}
            haptic={false}
            onPress={pay}
          />
          <Button
            title="Decline"
            variant="danger"
            loading={busy === 'decline'}
            disabled={busy !== null}
            onPress={() => {
              setBusy('decline');
              onDeclined();
            }}
          />
          <Button title="Cancel" variant="ghost" disabled={busy !== null} onPress={onCancel} />
        </Animated.View>
      </View>
    </Modal>
  );
}

function Section({ title, Icon, children }: { title: string; Icon: LucideIcon; children: ReactNode }) {
  return (
    <View style={[styles.card, { gap: 12, padding: 18 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={s.sectionIcon}>
          <Icon color={colors.marigold} size={18} />
        </View>
        <Text style={type.h2} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.rowBetween}>
        <Text style={type.label}>{label}</Text>
        {hint ? <Text style={type.caption}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** ASAP / Schedule toggle with a sliding thumb. */
function Segmented({
  value,
  onChange,
  disabled,
}: {
  value: PickupMode;
  onChange: (mode: PickupMode) => void;
  disabled?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(value === 'asap' ? 0 : 1);
  useEffect(() => {
    x.value = withSpring(value === 'asap' ? 0 : 1, { damping: 18, stiffness: 220 });
  }, [value, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * (width / 2) }] }));
  const options: { key: PickupMode; label: string; Icon: LucideIcon }[] = [
    { key: 'asap', label: 'ASAP', Icon: Zap },
    { key: 'scheduled', label: 'Schedule', Icon: CalendarClock },
  ];
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[s.segTrack, disabled && { opacity: 0.5 }]}
      accessibilityRole="radiogroup"
    >
      {width ? <Animated.View style={[s.segThumb, { width: width / 2 - 4 }, thumb]} /> : null}
      {options.map(({ key, label, Icon }) => {
        const selected = value === key;
        return (
          <Pressable
            key={key}
            disabled={disabled}
            onPress={() => {
              haptics.select();
              onChange(key);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            style={s.segOption}
          >
            <Icon color={selected ? colors.indigo : colors.muted} size={16} />
            <Text style={[s.segText, selected && { color: colors.indigo }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.indigo,
  },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minWidth: 88,
    alignItems: 'center',
  },
  slotOn: { borderColor: colors.marigold, backgroundColor: tint.selected },
  slotText: { fontFamily: font.bold, fontSize: 14, color: colors.muted },
  segTrack: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.pill,
    backgroundColor: tint.indigoFaint,
  },
  segThumb: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    ...shadows.card,
  },
  segOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
  },
  segText: { fontFamily: font.bold, fontSize: 15, color: colors.muted },
  bar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.bar,
  },
  accessory: {
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F1EADB',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,42,68,0.55)' },
  sheet: {
    backgroundColor: colors.cream,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: 6,
  },
});
