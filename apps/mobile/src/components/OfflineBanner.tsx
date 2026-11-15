import { useNetInfo } from '@react-native-community/netinfo';
import { Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { colors, font } from '@/lib/theme';

/** Slides in under the status bar while the device is offline. */
export function OfflineBanner() {
  const net = useNetInfo();
  const insets = useSafeAreaInsets();
  if (net.isConnected !== false) return null;
  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      exiting={FadeOutUp.duration(200)}
      accessibilityRole="alert"
      style={{
        backgroundColor: colors.achar,
        paddingTop: insets.top + 6,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <WifiOff color={colors.white} size={16} />
      <Text style={{ color: colors.white, fontFamily: font.semibold, fontSize: 14 }}>
        You&apos;re offline — some things may not work.
      </Text>
    </Animated.View>
  );
}
