import type { ReactNode } from 'react';
import { Platform, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, X } from 'lucide-react-native';
import { colors, font, type } from '@/lib/theme';
import { IconButton } from './Button';
import { KoruBackground } from './KoruBackground';
import { FlagStripe } from './ui';

/**
 * Indigo screen header: optional te reo kicker over a Baloo title, faint koru texture and the
 * prayer-flag stripe. `modal` adjusts the top padding for iOS page sheets (which start below
 * the status bar).
 */
export function ScreenHeader({
  title,
  kicker,
  onBack,
  onClose,
  right,
  modal = false,
}: {
  title: string;
  kicker?: ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  right?: ReactNode;
  modal?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const top = modal && Platform.OS === 'ios' ? 14 : insets.top + 8;
  return (
    <View style={{ backgroundColor: colors.indigo, overflow: 'hidden' }}>
      <KoruBackground tone="cream" opacity={0.05} />
      <View
        style={{
          paddingTop: top,
          paddingBottom: 14,
          paddingLeft: onBack ? 12 : 20,
          paddingRight: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {onBack ? (
          <IconButton
            icon={<ChevronLeft color={colors.white} size={24} />}
            variant="glass"
            size={40}
            onPress={onBack}
            accessibilityLabel="Back"
          />
        ) : null}
        <View style={{ flex: 1 }}>
          {kicker ? <Text style={[type.kicker, { color: colors.marigold }]}>{kicker}</Text> : null}
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={{ fontFamily: font.display, fontSize: 28, lineHeight: 36, color: colors.white }}
          >
            {title}
          </Text>
        </View>
        {right}
        {onClose ? (
          <IconButton
            icon={<X color={colors.white} size={22} />}
            variant="glass"
            size={40}
            onPress={onClose}
            accessibilityLabel="Close"
          />
        ) : null}
      </View>
      <FlagStripe />
    </View>
  );
}
