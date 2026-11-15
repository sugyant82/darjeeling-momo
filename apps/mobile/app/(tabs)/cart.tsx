import { useRef, useState, type ComponentRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOutLeft, LinearTransition } from 'react-native-reanimated';
import { router, useScrollToTop } from 'expo-router';
import { ArrowRight, Minus, Plus, Trash2 } from 'lucide-react-native';
import { formatNZD } from '@darjeeling/shared';
import type { CartLine } from '@darjeeling/shared/types';
import { colors, font, radii, shadows, styles, type } from '@/lib/theme';
import { useAuth } from '@/state/auth';
import { MAX_LINE_QTY, useCart } from '@/state/cart';
import { useToast } from '@/state/toast';
import { Button, IconButton } from '@/components/Button';
import { FoodImage } from '@/components/FoodImage';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LogoMark } from '@/components/brand';
import { EmptyState, Loading } from '@/components/ui';

export default function CartScreen() {
  const cart = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef);
  const [refreshing, setRefreshing] = useState(false);

  const report = () => toast.show("Couldn't update your cart. Check your connection and try again.", 'error');

  async function onRefresh() {
    setRefreshing(true);
    await cart.reload().catch(() => {});
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        kicker={
          <>
            <Text accessibilityLanguage="mi">Tō kete</Text> · your basket
          </>
        }
        title="Your cart"
      />
      {cart.loading ? (
        <Loading label="Loading your cart…" />
      ) : cart.lines.length === 0 ? (
        <View style={{ padding: 16 }}>
          <EmptyState
            art={<LogoMark height={64} />}
            title="Your kete is empty"
            message="Add some momos to get started."
            action={
              <Button
                title="Browse the menu"
                variant="action"
                iconRight={<ArrowRight color={colors.indigo} size={18} />}
                onPress={() => router.navigate('/menu')}
              />
            }
          />
        </View>
      ) : (
        <>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
            refreshControl={
              user ? (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.marigold} colors={[colors.marigold]} />
              ) : undefined
            }
          >
            {cart.lines.map((line) => (
              <Animated.View
                key={line.id}
                entering={FadeIn.duration(250)}
                exiting={FadeOutLeft.duration(220)}
                layout={LinearTransition.springify().damping(18)}
              >
                <LineCard
                  line={line}
                  onChange={(q) => cart.updateQuantity(line.id, q).catch(report)}
                  onRemove={() => cart.removeItem(line.id).catch(report)}
                />
              </Animated.View>
            ))}

            <Animated.View layout={LinearTransition.springify().damping(18)} style={styles.card}>
              <Row label="Subtotal (excl. GST)" value={formatNZD(cart.totals.subtotalCents)} />
              <Row label="GST (15%)" value={formatNZD(cart.totals.gstCents)} />
              <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
              <View style={styles.rowBetween}>
                <Text style={type.h3}>Total</Text>
                <Text style={[type.h3, { fontFamily: font.display }]}>{formatNZD(cart.totals.totalCents)}</Text>
              </View>
              <Text style={type.caption}>Prices include GST. Pickup only.</Text>
            </Animated.View>
          </ScrollView>

          <View style={s.bar}>
            <Button
              title={`Checkout · ${formatNZD(cart.totals.totalCents)}`}
              variant="primary"
              size="lg"
              iconRight={<ArrowRight color={colors.white} size={20} />}
              onPress={() => router.push('/checkout')}
            />
          </View>
        </>
      )}
    </View>
  );
}

function LineCard({
  line,
  onChange,
  onRemove,
}: {
  line: CartLine;
  onChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const options = line.selectedOptions.map((o) => o.choiceLabel).join(' · ');
  return (
    <View style={[styles.card, { flexDirection: 'row', gap: 12, padding: 12 }]}>
      <FoodImage url={line.imageUrl} size={72} radius={14} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Text style={[type.h3, { flex: 1 }]} numberOfLines={2}>
            {line.name}
          </Text>
          <Text style={type.price}>{formatNZD(line.unitPriceCents * line.quantity)}</Text>
        </View>
        {options ? (
          <Text style={type.caption} numberOfLines={2}>
            {options}
          </Text>
        ) : null}
        <Text style={type.caption}>{formatNZD(line.unitPriceCents)} each</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          <View style={s.stepper}>
            {line.quantity > 1 ? (
              <IconButton
                icon={<Minus color={colors.indigo} size={16} />}
                onPress={() => onChange(line.quantity - 1)}
                accessibilityLabel={`Decrease ${line.name}`}
                size={36}
                variant="ghost"
              />
            ) : (
              <IconButton
                icon={<Trash2 color={colors.achar} size={16} />}
                onPress={onRemove}
                accessibilityLabel={`Remove ${line.name}`}
                size={36}
                variant="ghost"
              />
            )}
            <Animated.Text key={line.quantity} entering={FadeIn.duration(150)} style={s.qty} accessibilityLabel={`Quantity ${line.quantity}`}>
              {line.quantity}
            </Animated.Text>
            <IconButton
              icon={<Plus color={colors.indigo} size={16} />}
              onPress={() => onChange(line.quantity + 1)}
              disabled={line.quantity >= MAX_LINE_QTY}
              accessibilityLabel={`Increase ${line.name}`}
              size={36}
              variant="ghost"
            />
          </View>
          <View style={{ flex: 1 }} />
          {line.quantity > 1 ? (
            <IconButton
              icon={<Trash2 color={colors.achar} size={18} />}
              onPress={onRemove}
              accessibilityLabel={`Remove ${line.name}`}
              size={40}
              variant="ghost"
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={type.label}>{label}</Text>
      <Text style={type.body}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 2,
  },
  qty: { fontFamily: font.bold, fontSize: 16, minWidth: 26, textAlign: 'center', color: colors.indigo },
  bar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.bar,
  },
});
