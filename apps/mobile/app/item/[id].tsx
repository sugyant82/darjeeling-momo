import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fetchMenuItem, formatNZD, unitPriceCents } from '@darjeeling/shared';
import type { ItemOption, MenuItem, SelectedOption } from '@darjeeling/shared/types';
import { supabase } from '@/lib/supabase';
import { colors, radii, styles, type } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Loading } from '@/components/ui';
import { FoodImage } from '@/components/FoodImage';
import { useCart } from '@/state/cart';
import { useToast } from '@/state/toast';

type Selection = Record<string, string[]>;

function defaultSelection(options: ItemOption[]): Selection {
  const sel: Selection = {};
  for (const opt of options) {
    const def = opt.choices.filter((c) => c.is_default).map((c) => c.id);
    sel[opt.id] = def.length ? def : opt.required && opt.choices[0] ? [opt.choices[0].id] : [];
  }
  return sel;
}

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cart = useCart();
  const toast = useToast();
  const [item, setItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection>({});
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchMenuItem(supabase, id).then((it) => {
      setItem(it);
      if (it) setSelection(defaultSelection(it.options));
      setLoading(false);
    });
  }, [id]);

  const selectedOptions = useMemo<SelectedOption[]>(() => {
    if (!item) return [];
    const out: SelectedOption[] = [];
    for (const opt of item.options) {
      for (const choiceId of selection[opt.id] ?? []) {
        const choice = opt.choices.find((c) => c.id === choiceId);
        if (choice)
          out.push({
            optionId: opt.id,
            optionName: opt.name,
            choiceId: choice.id,
            choiceLabel: choice.label,
            priceDeltaCents: choice.price_delta_cents,
          });
      }
    }
    return out;
  }, [item, selection]);

  if (loading) return <Loading />;
  if (!item)
    return (
      <View style={styles.container}>
        <Text style={type.body}>Item not found.</Text>
      </View>
    );

  const unit = unitPriceCents(item.price_cents, selectedOptions.map((o) => o.priceDeltaCents));
  const missingRequired = item.options.filter(
    (o) => o.required && (selection[o.id]?.length ?? 0) < Math.max(1, o.min_select),
  );

  function toggle(opt: ItemOption, choiceId: string) {
    setSelection((prev) => {
      const current = prev[opt.id] ?? [];
      if (opt.max_select <= 1) return { ...prev, [opt.id]: [choiceId] };
      if (current.includes(choiceId)) return { ...prev, [opt.id]: current.filter((c) => c !== choiceId) };
      if (current.length >= opt.max_select) return prev;
      return { ...prev, [opt.id]: [...current, choiceId] };
    });
  }

  async function add() {
    if (!item || missingRequired.length) return;
    setAdding(true);
    try {
      await cart.addItem(item, selectedOptions, quantity);
      toast.show(`${quantity} × ${item.name} added`, 'success');
      router.back();
    } catch {
      toast.show('Could not add to cart.', 'error');
    } finally {
      setAdding(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <FoodImage url={item.image_url} size={{ width: '100%', height: 180 }} radius={radii.card} label="SAMPLE" />
        <Text style={type.h1}>{item.name}</Text>
        {item.description ? <Text style={type.body}>{item.description}</Text> : null}

        {item.options.map((opt) => (
          <View key={opt.id} style={{ gap: 8 }}>
            <Text style={type.bodyBold}>
              {opt.name}
              {opt.required ? <Text style={type.caption}> · required</Text> : null}
            </Text>
            {opt.choices.map((choice) => {
              const checked = (selection[opt.id] ?? []).includes(choice.id);
              return (
                <Pressable
                  key={choice.id}
                  accessibilityRole={opt.max_select <= 1 ? 'radio' : 'checkbox'}
                  accessibilityState={{ checked }}
                  onPress={() => toggle(opt, choice.id)}
                  style={[
                    styles.card,
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderColor: checked ? colors.marigold : colors.border,
                      borderWidth: checked ? 2 : 1,
                    },
                  ]}
                >
                  <Text style={type.body}>{choice.label}</Text>
                  {choice.price_delta_cents !== 0 ? (
                    <Text style={type.label}>
                      {choice.price_delta_cents > 0 ? '+' : ''}
                      {formatNZD(choice.price_delta_cents)}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}

        <View style={styles.rowBetween}>
          <Text style={type.bodyBold}>Quantity</Text>
          <View style={[styles.row, { gap: 16 }]}>
            <Button title="–" variant="outline" onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={{ paddingHorizontal: 18 }} />
            <Text style={type.h2}>{quantity}</Text>
            <Button title="+" variant="outline" onPress={() => setQuantity((q) => Math.min(50, q + 1))} style={{ paddingHorizontal: 18 }} />
          </View>
        </View>
      </ScrollView>

      <View style={{ padding: 16 }}>
        <Button
          title={adding ? 'Adding…' : `Add ${quantity} · ${formatNZD(unit * quantity)}`}
          variant="action"
          disabled={missingRequired.length > 0 || adding}
          onPress={add}
        />
      </View>
    </View>
  );
}
