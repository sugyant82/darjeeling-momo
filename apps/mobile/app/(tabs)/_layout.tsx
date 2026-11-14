import { Tabs } from 'expo-router';
import { Home, UtensilsCrossed, ShoppingBag, User } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { useCart } from '@/state/cart';
import { FlagStripe } from '@/components/ui';
import { View } from 'react-native';

export default function TabsLayout() {
  const { count } = useCart();
  return (
    <>
      <View style={{ height: 0 }} />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.indigo },
          headerTintColor: colors.white,
          headerTitleStyle: { fontFamily: 'Baloo2_800ExtraBold' },
          tabBarActiveTintColor: colors.indigo,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
          tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
          header: ({ options }) => <Header title={options.title ?? ''} />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: 'Menu',
            tabBarIcon: ({ color, size }) => <UtensilsCrossed color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'Cart',
            tabBarBadge: count > 0 ? count : undefined,
            tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="account"
          options={{ title: 'Account', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
        />
      </Tabs>
    </>
  );
}

import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Header({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: colors.indigo, paddingTop: insets.top }}>
      <View style={{ height: 52, justifyContent: 'center', paddingHorizontal: 16 }}>
        <Text style={{ color: colors.white, fontFamily: 'Baloo2_800ExtraBold', fontSize: 20 }}>
          {title}
        </Text>
      </View>
      <FlagStripe />
    </View>
  );
}
