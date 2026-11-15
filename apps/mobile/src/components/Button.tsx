import type { ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, font, radii, shadows } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'action' | 'success' | 'danger' | 'outline' | 'soft' | 'glass' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, { bg: string; fg: string; border?: string; ripple: string; shadow?: object }> = {
  primary: { bg: colors.indigo, fg: colors.white, ripple: 'rgba(255,255,255,0.18)' },
  action: { bg: colors.marigold, fg: colors.indigo, ripple: 'rgba(31,42,68,0.12)', shadow: shadows.action },
  success: { bg: colors.tealeaf, fg: colors.white, ripple: 'rgba(255,255,255,0.18)' },
  danger: { bg: colors.achar, fg: colors.white, ripple: 'rgba(255,255,255,0.18)' },
  outline: { bg: colors.card, fg: colors.indigo, border: colors.border, ripple: 'rgba(31,42,68,0.08)' },
  soft: { bg: 'rgba(31,42,68,0.06)', fg: colors.indigo, border: 'rgba(31,42,68,0.08)', ripple: 'rgba(31,42,68,0.08)' },
  glass: { bg: 'rgba(255,255,255,0.12)', fg: colors.white, border: 'rgba(255,255,255,0.2)', ripple: 'rgba(255,255,255,0.15)' },
  ghost: { bg: 'transparent', fg: colors.indigo, ripple: 'rgba(31,42,68,0.08)' },
};

const SIZE: Record<Size, { minHeight: number; px: number; fontSize: number }> = {
  sm: { minHeight: 40, px: 16, fontSize: 14 },
  md: { minHeight: 50, px: 22, fontSize: 16 },
  lg: { minHeight: 56, px: 26, fontSize: 17 },
};

/** Pill button with a springy press, haptic tick and Android ripple. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  style,
  icon,
  iconRight,
  haptic = true,
  accessibilityLabel,
  accessibilityHint,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
  iconRight?: ReactNode;
  /** Set false when the action fires its own (e.g. success) haptic. */
  haptic?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const v = VARIANT[variant];
  const s = SIZE[size];
  const inactive = Boolean(disabled || loading);
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.97 : 1, { damping: 18, stiffness: 320 }) }],
  }));

  return (
    <Animated.View style={[{ borderRadius: radii.pill }, inactive ? null : v.shadow, animated, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
        disabled={inactive}
        onPressIn={() => (pressed.value = 1)}
        onPressOut={() => (pressed.value = 0)}
        onPress={() => {
          if (haptic) haptics.tap();
          onPress();
        }}
        android_ripple={{ color: v.ripple }}
        style={{
          minHeight: s.minHeight,
          paddingHorizontal: s.px,
          borderRadius: radii.pill,
          overflow: 'hidden',
          backgroundColor: v.bg,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled && !loading ? 0.45 : 1,
        }}
      >
        {loading ? (
          <Spinner size={22} strokeWidth={2.6} color={v.fg} accessibilityLabel={`${title}, in progress`} />
        ) : (
          <>
            {icon ? <View>{icon}</View> : null}
            <Text style={{ fontFamily: font.bold, fontSize: s.fontSize, color: v.fg }} numberOfLines={1}>
              {title}
            </Text>
            {iconRight ? <View>{iconRight}</View> : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Round icon-only button (close, back, steppers). Always has an accessibility label. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'soft',
  size = 44,
  disabled,
  style,
}: {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: Variant;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANT[variant];
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.9 : 1, { damping: 16, stiffness: 340 }) }],
  }));
  return (
    <Animated.View style={[{ borderRadius: size / 2 }, animated, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        hitSlop={size < 44 ? (44 - size) / 2 : 0}
        onPressIn={() => (pressed.value = 1)}
        onPressOut={() => (pressed.value = 0)}
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        android_ripple={{ color: v.ripple, borderless: true }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: v.bg,
          borderWidth: v.border ? 1.5 : 0,
          borderColor: v.border,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        {icon}
      </Pressable>
    </Animated.View>
  );
}
