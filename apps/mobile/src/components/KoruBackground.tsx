import { Image, StyleSheet, View } from 'react-native';

/** The original koru pattern tile (same artwork as the website's watermark), pre-coloured. */
const TILES = {
  indigo: require('../../assets/patterns/koru-indigo.png'),
  cream: require('../../assets/patterns/koru-cream.png'),
} as const;

/** A faint repeating koru watermark that fills its parent. Purely decorative. */
export function KoruBackground({
  tone = 'indigo',
  opacity = 0.045,
}: {
  /** "indigo" for light surfaces, "cream" for indigo surfaces. */
  tone?: keyof typeof TILES;
  opacity?: number;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={TILES[tone]} resizeMode="repeat" style={{ width: '100%', height: '100%', opacity }} />
    </View>
  );
}
