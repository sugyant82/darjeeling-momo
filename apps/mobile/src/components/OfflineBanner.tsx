import { useNetInfo } from '@react-native-community/netinfo';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/theme';

/** Shows a thin banner when the device is offline. */
export function OfflineBanner() {
  const net = useNetInfo();
  const insets = useSafeAreaInsets();
  const offline = net.isConnected === false;
  if (!offline) return null;
  return (
    <View style={{ backgroundColor: colors.achar, paddingTop: insets.top }}>
      <Text
        style={{
          color: colors.white,
          fontFamily: 'Inter_600SemiBold',
          textAlign: 'center',
          paddingVertical: 6,
        }}
      >
        You&apos;re offline — some things may not work.
      </Text>
    </View>
  );
}
