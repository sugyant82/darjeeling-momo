import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';

/** A pressable surface (cards, tiles) that eases down slightly while pressed. */
export function PressableScale({
  children,
  style,
  scaleTo = 0.975,
  haptic = 'select',
  onPress,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'select' | 'tap' | false;
}) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? scaleTo : 1, { damping: 18, stiffness: 300 }) }],
  }));
  return (
    <Animated.View style={[animated, style]}>
      <Pressable
        {...rest}
        onPressIn={(e) => {
          pressed.value = 1;
          rest.onPressIn?.(e);
        }}
        onPressOut={(e) => {
          pressed.value = 0;
          rest.onPressOut?.(e);
        }}
        onPress={(e) => {
          if (haptic === 'select') haptics.select();
          else if (haptic === 'tap') haptics.tap();
          onPress?.(e);
        }}
        style={{ flexGrow: 1 }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
