import { ActivityIndicator, Pressable, Text, type ViewStyle } from 'react-native';
import { colors, styles } from '@/lib/theme';

type Variant = 'primary' | 'action' | 'success' | 'danger' | 'outline';

const BG: Record<Variant, object> = {
  primary: styles.btnPrimary,
  action: styles.btnAction,
  success: styles.btnSuccess,
  danger: styles.btnDanger,
  outline: styles.btnOutline,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}) {
  const dark = variant === 'action' || variant === 'outline';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, BG[variant], { opacity: disabled || loading ? 0.5 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={dark ? colors.indigo : colors.white} />
      ) : (
        <>
          {icon}
          <Text style={dark ? styles.btnTextDark : styles.btnTextLight}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
