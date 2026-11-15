import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Minus, Plus, X } from 'lucide-react-native';
import { formatNZD, unitPriceCents } from '@darjeeling/shared';
import type { ItemOption, MenuItem, SelectedOption } from '@darjeeling/shared/types';
import { colors, font, radii, shadows, styles, tint, type } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import { useMenuItem } from '@/hooks/queries';
import { MAX_LINE_QTY, useCart } from '@/state/cart';
import { useToast } from '@/state/toast';
import { Button, IconButton } from '@/components/Button';
import { FoodImage } from '@/components/FoodImage';
import { Banner, EmptyState, ErrorState, Loading, TagBadge } from '@/components/ui';

type Selection = Record<string, string[]>;

function defaultSelection(options: ItemOption[]): Selection {
  const sel: Selection = {};
  for (const opt of options) {
    const def = opt.choices.filter((c) => c.is_default).map((c) => c.id);
    sel[opt.id] = def.length ? def.slice(0, Math.max(1, opt.max_select)) : opt.required && opt.choices[0] ? [opt.choices[0].id] : [];
  }
  return sel;
}

/** Why an option's current selection isn't acceptable yet (null when it is). */
function optionProblem(opt: ItemOption, count: number): string | null {
  const min = Math.max(opt.required ? 1 : 0, opt.min_select);
  if (opt.required && count < min) return opt.name;
  if (!opt.required && count > 0 && count < min) return `${opt.name} (at least ${min})`;
  return null;
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/menu');
}

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item, isLoading, isError, refetch } = useMenuItem(id);

  if (item) return <ItemDetails key={item.id} item={item} />;
  return (
    <View style={[styles.screen, { paddingTop: 12 }]}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 16 }}>
        <IconButton icon={<X color={colors.indigo} size={22} />} onPress={close} accessibilityLabel="Close" />
      </View>
      <View style={{ padding: 16 }}>
        {isLoading ? (
          <Loading label="Loading…" />
        ) : isError ? (
          <ErrorState message="We couldn't load this item." onRetry={() => refetch()} />
        ) : (
          <EmptyState
            title="Item not found"
            message="It may have been taken off the menu."
            action={<Button title="Back to the menu" variant="action" onPress={close} />}
          />
        )}
      </View>
    </View>
  );
}

function ItemDetails({ item }: { item: MenuItem }) {
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const toast = useToast();
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(item.options));
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const soldOut = !item.is_available;

  useEffect(() => setError(null), [selection, quantity]);

  const selectedOptions = useMemo<SelectedOption[]>(() => {
    const out: SelectedOption[] = [];
    for (const opt of item.options) {
      for (const choiceId of selection[opt.id] ?? []) {
        const choice = opt.choices.find((c) => c.id === choiceId);
        if (choice) {
          out.push({
            optionId: opt.id,
            optionName: opt.name,
            choiceId: choice.id,
            choiceLabel: choice.label,
            priceDeltaCents: choice.price_delta_cents,
          });
        }
      }
    }
    return out;
  }, [item.options, selection]);

  const unit = unitPriceCents(item.price_cents, selectedOptions.map((o) => o.priceDeltaCents));
  const problems = item.options
    .map((o) => optionProblem(o, selection[o.id]?.length ?? 0))
    .filter((p): p is string => p !== null);

  function toggle(opt: ItemOption, choiceId: string) {
    haptics.select();
    setSelection((prev) => {
      const current = prev[opt.id] ?? [];
      const has = current.includes(choiceId);
      if (opt.max_select <= 1) {
        // Optional single-choice options can be cleared by tapping the selected choice again.
        if (has && !opt.required) return { ...prev, [opt.id]: [] };
        return { ...prev, [opt.id]: [choiceId] };
      }
      if (has) return { ...prev, [opt.id]: current.filter((c) => c !== choiceId) };
      if (current.length >= opt.max_select) {
        haptics.warning();
        return prev;
      }
      return { ...prev, [opt.id]: [...current, choiceId] };
    });
  }

  async function add() {
    if (soldOut || problems.length > 0) return;
    setAdding(true);
    setError(null);
    try {
      await cart.addItem(item, selectedOptions, quantity);
      toast.show(`Ka pai! ${quantity} × ${item.name} added`, 'success');
      close();
    } catch {
      // Shown inline: a toast would be hidden behind this modal on iOS.
      setError("Couldn't add that to your cart. Check your connection and try again.");
      haptics.error();
    } finally {
      setAdding(false);
    }
  }

  const closeTop = Platform.OS === 'ios' ? 14 : insets.top + 10;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View>
          <FoodImage url={item.image_url} size={{ width: '100%', height: 260 }} radius={0} />
          <View style={{ position: 'absolute', top: closeTop, right: 16 }}>
            <IconButton
              icon={<X color={colors.indigo} size={22} />}
              variant="outline"
              onPress={close}
              accessibilityLabel="Close"
              style={shadows.float}
            />
          </View>
        </View>

        <View style={s.sheet}>
          <Animated.View entering={FadeInDown.duration(350)} style={{ gap: 8 }}>
            <Text style={type.h1}>{item.name}</Text>
            <Text style={[type.bodyBold, { fontSize: 18 }]}>{formatNZD(item.price_cents)}</Text>
            {item.description ? <Text style={[type.body, { color: colors.muted }]}>{item.description}</Text> : null}
            {item.tags.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                {item.tags.map((t) => (
                  <TagBadge key={t} tag={t} />
                ))}
              </View>
            ) : null}
          </Animated.View>

          {soldOut ? <Banner kind="warn">Sold out right now — check back soon.</Banner> : null}

          {item.options.map((opt, i) => (
            <Animated.View key={opt.id} entering={FadeInDown.delay(80 + i * 60).duration(350)} style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[type.h3, { flex: 1 }]}>{opt.name}</Text>
                <View style={[s.pill, opt.required ? s.pillRequired : s.pillOptional]}>
                  <Text style={[s.pillText, { color: opt.required ? colors.achar : colors.muted }]}>
                    {opt.required ? 'Required' : 'Optional'}
                  </Text>
                </View>
              </View>
              <Text style={[type.caption, { marginTop: -6 }]}>
                {opt.max_select > 1 ? `Choose up to ${opt.max_select}` : opt.required ? 'Choose 1' : 'Choose 1 (optional)'}
              </Text>
              {opt.choices.map((choice) => {
                const checked = (selection[opt.id] ?? []).includes(choice.id);
                const multi = opt.max_select > 1;
                return (
                  <Pressable
                    key={choice.id}
                    disabled={soldOut}
                    accessibilityRole={multi ? 'checkbox' : 'radio'}
                    accessibilityState={{ checked, disabled: soldOut }}
                    accessibilityLabel={`${choice.label}${choice.price_delta_cents ? `, plus ${formatNZD(choice.price_delta_cents)}` : ''}`}
                    onPress={() => toggle(opt, choice.id)}
                    android_ripple={{ color: tint.indigoFaint }}
                    style={[s.choice, checked && s.choiceOn]}
                  >
                    <View style={[multi ? s.box : s.radio, checked && s.indicatorOn]}>
                      {checked ? (
                        <Animated.View entering={ZoomIn.springify().damping(14)}>
                          {multi ? (
                            <Check color={colors.indigo} size={14} strokeWidth={3} />
                          ) : (
                            <View style={s.radioDot} />
                          )}
                        </Animated.View>
                      ) : null}
                    </View>
                    <Text style={[type.body, { flex: 1 }]}>{choice.label}</Text>
                    {choice.price_delta_cents !== 0 ? (
                      <Text style={type.label}>
                        {choice.price_delta_cents > 0 ? '+' : ''}
                        {formatNZD(choice.price_delta_cents)}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </Animated.View>
          ))}

          <View style={[styles.rowBetween, { marginTop: 4 }]}>
            <Text style={type.h3}>Quantity</Text>
            <Stepper value={quantity} onChange={setQuantity} disabled={soldOut} />
          </View>
        </View>
      </ScrollView>

      <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {error ? (
          <Animated.View entering={FadeIn.duration(200)}>
            <Banner kind="error">{error}</Banner>
          </Animated.View>
        ) : problems.length > 0 && !soldOut ? (
          <Text style={[type.label, { textAlign: 'center' }]}>Please choose: {problems.join(', ')}</Text>
        ) : null}
        <Button
          title={soldOut ? 'Sold out' : `Add ${quantity} to order · ${formatNZD(unit * quantity)}`}
          variant="action"
          size="lg"
          loading={adding}
          disabled={soldOut || problems.length > 0}
          haptic={false}
          onPress={add}
        />
      </View>
    </View>
  );
}

function Stepper({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <View style={s.stepper}>
      <IconButton
        icon={<Minus color={colors.indigo} size={18} />}
        onPress={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        accessibilityLabel="Decrease quantity"
        size={40}
        variant="outline"
      />
      <Animated.Text key={value} entering={FadeIn.duration(160)} style={s.stepperValue} accessibilityLiveRegion="polite">
        {value}
      </Animated.Text>
      <IconButton
        icon={<Plus color={colors.indigo} size={18} />}
        onPress={() => onChange(Math.min(MAX_LINE_QTY, value + 1))}
        disabled={disabled || value >= MAX_LINE_QTY}
        accessibilityLabel="Increase quantity"
        size={40}
        variant="outline"
      />
    </View>
  );
}

const s = StyleSheet.create({
  sheet: {
    marginTop: -24,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.cream,
    padding: 20,
    gap: 22,
  },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.pill },
  pillRequired: { backgroundColor: '#F7E0DC' },
  pillOptional: { backgroundColor: tint.indigoFaint },
  pillText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  choiceOn: { borderColor: colors.marigold, backgroundColor: tint.selected },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorOn: { borderColor: colors.marigold, backgroundColor: colors.marigold },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.indigo },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepperValue: { fontFamily: font.display, fontSize: 22, minWidth: 28, textAlign: 'center', color: colors.indigo },
  bar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.bar,
  },
});
