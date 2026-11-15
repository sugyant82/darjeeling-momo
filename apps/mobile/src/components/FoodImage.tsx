import { View, type DimensionValue } from 'react-native';
import { Image } from 'expo-image';
import { colors, radii } from '@/lib/theme';
import { resolveImageUrl } from '@/lib/env';
import { LogoMark } from './brand';

/**
 * A menu photo with caching and a soft fade-in (expo-image). React Native can't render SVG
 * images and the SAMPLE seed uses .svg placeholders, so those (and missing images) get a
 * branded placeholder instead.
 */
export function FoodImage({
  url,
  size,
  radius = radii.md,
}: {
  url: string | null | undefined;
  size: number | { width: DimensionValue; height: number };
  radius?: number;
}) {
  const resolved = resolveImageUrl(url);
  const isRenderable = resolved.startsWith('http') && !resolved.toLowerCase().endsWith('.svg');
  const dims = typeof size === 'number' ? { width: size, height: size } : size;
  const markHeight = Math.min(dims.height * 0.5, 72);

  return (
    <View
      style={{ ...dims, borderRadius: radius, overflow: 'hidden', backgroundColor: '#F3ECDC' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {isRenderable ? (
        <Image
          source={{ uri: resolved }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
          recyclingKey={resolved}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6EEDD' }}>
          <View style={{ opacity: 0.9 }}>
            <LogoMark variant="light" height={markHeight} />
          </View>
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 4,
              flexDirection: 'row',
              opacity: 0.85,
            }}
          >
            {[colors.indigo, colors.cream, colors.achar, colors.tealeaf, colors.marigold].map((c, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: c }} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
