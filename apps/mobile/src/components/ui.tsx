import type { ReactNode } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react-native';
import { STATUS_COLOR, STATUS_LABEL, type OrderStatus } from '@darjeeling/shared';
import type { Tag } from '@darjeeling/shared/types';
import { colors, flagColors, font, radii, styles, type } from '@/lib/theme';
import { Button } from './Button';
import { Koru } from './brand';
import { Spinner } from './Spinner';

/** The five prayer-flag colours as a thin divider. */
export function FlagStripe({ height = 4 }: { height?: number }) {
  return (
    <View style={{ flexDirection: 'row', height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
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
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: bg,
        borderRadius: radii.pill,
        paddingHorizontal: 12,
        paddingVertical: 5,
      }}
    >
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: textColor, opacity: 0.85 }} />
      <Text style={{ color: textColor, fontFamily: font.bold, fontSize: 13 }}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

/** Centered Google-style spinner with a label. Fades in after a beat so fast loads don't flash. */
export function Loading({ label = 'Loading…', style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View
      entering={FadeIn.delay(150).duration(250)}
      style={[{ paddingVertical: 48, alignItems: 'center', justifyContent: 'center', gap: 14 }, style]}
    >
      <Spinner size={40} accessibilityLabel={label} />
      <Text style={type.label}>{label}</Text>
    </Animated.View>
  );
}

/** Full-screen loading state. */
export function LoadingScreen({ label }: { label?: string }) {
  return (
    <View style={[styles.screen, { justifyContent: 'center' }]}>
      <Loading label={label} />
    </View>
  );
}

export function EmptyState({
  title,
  message,
  action,
  art,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
  art?: ReactNode;
}) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.card, { alignItems: 'center', paddingVertical: 32, gap: 10 }]}>
      {art ?? <Koru color={colors.marigold} size={44} />}
      <Text style={[type.h2, { textAlign: 'center' }]}>{title}</Text>
      {message ? <Text style={[type.body, { textAlign: 'center', color: colors.muted }]}>{message}</Text> : null}
      {action ? <View style={{ marginTop: 8, alignSelf: 'stretch' }}>{action}</View> : null}
    </Animated.View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(250)} style={[styles.card, { alignItems: 'center', paddingVertical: 28, gap: 12 }]}>
      <AlertCircle color={colors.achar} size={32} />
      <Text style={[type.bodyBold, { textAlign: 'center' }]}>{message}</Text>
      {onRetry ? <Button title="Try again" variant="outline" onPress={onRetry} style={{ alignSelf: 'stretch' }} /> : null}
    </Animated.View>
  );
}

const BANNER = {
  info: { bg: '#EEF1F6', fg: colors.indigo, Icon: Info },
  warn: { bg: '#FCEFD6', fg: colors.indigo, Icon: TriangleAlert },
  error: { bg: '#F7E0DC', fg: colors.achar, Icon: AlertCircle },
  success: { bg: '#E2EFE6', fg: colors.tealeaf, Icon: CheckCircle2 },
} as const;

export function Banner({
  kind = 'info',
  children,
  style,
}: {
  kind?: keyof typeof BANNER;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { bg, fg, Icon } = BANNER[kind];
  return (
    <View style={[styles.banner, { backgroundColor: bg, flexDirection: 'row', gap: 10, alignItems: 'center' }, style]}>
      <Icon color={fg} size={18} />
      <Text style={{ flex: 1, color: fg, fontFamily: font.semibold, fontSize: 14, lineHeight: 19 }}>{children}</Text>
    </View>
  );
}

/** Kicker + title pair used for sections inside screens. */
export function SectionTitle({ kicker, title, right }: { kicker?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        {kicker ? <Text style={type.kicker}>{kicker}</Text> : null}
        <Text style={type.h2}>{title}</Text>
      </View>
      {right}
    </View>
  );
}
