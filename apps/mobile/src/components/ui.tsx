import { ActivityIndicator, Text, View } from 'react-native';
import { STATUS_COLOR, STATUS_LABEL, type OrderStatus } from '@darjeeling/shared';
import type { Tag } from '@darjeeling/shared/types';
import { colors, flagColors, styles, type } from '@/lib/theme';

export function FlagStripe() {
  return (
    <View style={{ flexDirection: 'row', height: 4 }} accessibilityElementsHidden>
      {flagColors.map((c, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </View>
  );
}

const TAG_BG: Record<string, string> = {
  veg: colors.tealeaf,
  spicy: colors.achar,
  bestseller: colors.marigold,
};

export function TagBadge({ tag }: { tag: Tag | string }) {
  const bg = TAG_BG[tag] ?? colors.muted;
  const textColor = tag === 'bestseller' ? colors.indigo : colors.white;
  const label = tag === 'veg' ? 'Veg' : tag === 'spicy' ? 'Spicy' : 'Bestseller';
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const STATUS_HEX: Record<string, string> = {
  indigo: colors.indigo,
  marigold: colors.marigold,
  achar: colors.achar,
  tealeaf: colors.tealeaf,
  muted: colors.muted,
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const token = STATUS_COLOR[status];
  const bg = STATUS_HEX[token] ?? colors.indigo;
  const textColor = token === 'marigold' ? colors.indigo : colors.white;
  return (
    <View style={[styles.tag, { backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 5 }]}>
      <Text style={{ color: textColor, fontFamily: 'Inter_700Bold', fontSize: 13 }}>
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator color={colors.indigo} />
      <Text style={type.caption}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View style={[styles.card, { alignItems: 'center' }]}>
      <Text style={type.h2}>{title}</Text>
      {message ? <Text style={[type.body, { textAlign: 'center' }]}>{message}</Text> : null}
    </View>
  );
}

export function Banner({
  kind = 'info',
  children,
}: {
  kind?: 'info' | 'warn' | 'error' | 'success';
  children: React.ReactNode;
}) {
  const bg =
    kind === 'warn' ? '#FCEFD6' : kind === 'error' ? '#F7E0DC' : kind === 'success' ? '#E2EFE6' : '#EEF1F6';
  const fg = kind === 'error' ? colors.achar : kind === 'success' ? colors.tealeaf : colors.indigo;
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontFamily: 'Inter_600SemiBold' }}>{children}</Text>
    </View>
  );
}
