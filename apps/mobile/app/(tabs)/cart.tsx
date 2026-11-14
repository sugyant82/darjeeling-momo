import { ScrollView, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { formatNZD } from '@darjeeling/shared';
import { colors, styles, type } from '@/lib/theme';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/ui';
import { useCart } from '@/state/cart';

export default function CartScreen() {
  const { lines, totals, updateQuantity, removeItem, loading } = useCart();

  if (!loading && lines.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState title="Your cart is empty" message="Add some momos to get started." />
        <Button title="Browse the menu" variant="action" onPress={() => router.push('/menu')} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {lines.map((line) => (
          <View key={line.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={type.bodyBold}>{line.name}</Text>
              <Text style={type.bodyBold}>{formatNZD(line.unitPriceCents * line.quantity)}</Text>
            </View>
            {line.selectedOptions.length > 0 ? (
              <Text style={type.caption}>{line.selectedOptions.map((o) => o.choiceLabel).join(', ')}</Text>
            ) : null}
            <View style={[styles.row, { gap: 16, marginTop: 6 }]}>
              <Pressable
                accessibilityLabel={`Decrease ${line.name}`}
                onPress={() => updateQuantity(line.id, line.quantity - 1)}
              >
                <Minus color={colors.indigo} />
              </Pressable>
              <Text style={type.body}>{line.quantity}</Text>
              <Pressable
                accessibilityLabel={`Increase ${line.name}`}
                onPress={() => updateQuantity(line.id, line.quantity + 1)}
              >
                <Plus color={colors.indigo} />
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable accessibilityLabel={`Remove ${line.name}`} onPress={() => removeItem(line.id)}>
                <Trash2 color={colors.achar} />
              </Pressable>
            </View>
          </View>
        ))}

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={type.label}>Subtotal (excl. GST)</Text>
            <Text style={type.body}>{formatNZD(totals.subtotalCents)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={type.label}>GST (15%)</Text>
            <Text style={type.body}>{formatNZD(totals.gstCents)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={type.bodyBold}>Total</Text>
            <Text style={type.bodyBold}>{formatNZD(totals.totalCents)}</Text>
          </View>
        </View>
      </ScrollView>
      <View style={{ padding: 16 }}>
        <Button title="Go to checkout" variant="primary" onPress={() => router.push('/checkout')} />
      </View>
    </View>
  );
}
