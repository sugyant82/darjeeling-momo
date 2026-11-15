import { useEffect, type ComponentProps } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import type { Tabs } from 'expo-router';
import { Home, ShoppingBag, User, UtensilsCrossed, type LucideIcon } from 'lucide-react-native';
import { colors, font, shadows } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { useCart } from '@/state/cart';
import { FlagStripe } from './ui';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, LucideIcon> = {
  index: Home,
  menu: UtensilsCrossed,
  cart: ShoppingBag,
  account: User,
};

/**
 * Branded bottom tab bar: the active tab grows a marigold pill with its label; the cart shows a
 * badge that pops when the count changes. Hidden on Android while the keyboard is open.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: TabBarProps) {
  const { count } = useCart();
  const keyboardVisible = useKeyboardVisible();
  if (Platform.OS === 'android' && keyboardVisible) return null;

  return (
    <View style={{ backgroundColor: colors.indigo, ...shadows.bar }}>
      <FlagStripe height={3} />
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingHorizontal: 12,
          gap: 6,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const label = descriptors[route.key]?.options.title ?? route.name;
          const badge = route.name === 'cart' && count > 0 ? count : 0;
          return (
            <TabItem
              key={route.key}
              label={label}
              Icon={ICONS[route.name] ?? Home}
              focused={focused}
              badge={badge}
              onPress={() => {
                // Same contract as the built-in tab bar: listeners (e.g. scroll-to-top) can prevent it.
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (event.defaultPrevented) return;
                haptics.select();
                if (!focused) navigateToTab(route.key);
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  label,
  Icon,
  focused,
  badge,
  onPress,
  onLongPress,
}: {
  label: string;
  Icon: LucideIcon;
  focused: boolean;
  badge: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const active = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    active.value = withTiming(focused ? 1 : 0, { duration: 260 });
  }, [focused, active]);
  const pill = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(active.value, [0, 1], ['rgba(232,163,61,0)', colors.marigold]),
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={badge ? `${label}, ${badge} item${badge === 1 ? '' : 's'}` : label}
      hitSlop={6}
      style={{ flex: focused ? 1.7 : 1, alignItems: 'center' }}
    >
      <Animated.View
        layout={LinearTransition.springify().damping(18).stiffness(200)}
        style={[
          { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 16, borderRadius: 23 },
          pill,
        ]}
      >
        <View>
          <Icon color={focused ? colors.indigo : 'rgba(251,246,236,0.72)'} size={22} strokeWidth={focused ? 2.4 : 2} />
          {badge ? (
            <Animated.View
              key={badge}
              entering={ZoomIn.springify().damping(12)}
              style={{
                position: 'absolute',
                top: -7,
                right: -11,
                minWidth: 19,
                height: 19,
                paddingHorizontal: 5,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? colors.indigo : colors.marigold,
                borderWidth: 2,
                borderColor: focused ? colors.marigold : colors.indigo,
              }}
            >
              <Text style={{ fontFamily: font.bold, fontSize: 10, color: focused ? colors.cream : colors.indigo }}>
                {badge > 99 ? '99+' : badge}
              </Text>
            </Animated.View>
          ) : null}
        </View>
        {focused ? (
          <Animated.Text
            entering={FadeIn.duration(220)}
            numberOfLines={1}
            style={{ fontFamily: font.bold, fontSize: 14, color: colors.indigo }}
          >
            {label}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}
