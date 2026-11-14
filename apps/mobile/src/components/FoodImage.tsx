import { Image, Text, View, type DimensionValue } from 'react-native';
import { colors, radii } from '@/lib/theme';
import { resolveImageUrl } from '@/lib/env';

/**
 * Renders a menu photo. React Native's <Image> can't render SVGs, and the SAMPLE
 * seed uses .svg placeholders, so we show a styled placeholder for those (and for
 * missing images). Real uploaded photos (png/jpg/webp from Supabase Storage) render.
 */
export function FoodImage({
  url,
  size,
  radius = radii.md,
  label,
}: {
  url: string | null | undefined;
  size: number | { width: DimensionValue; height: number };
  radius?: number;
  label?: string;
}) {
  const resolved = resolveImageUrl(url);
  const isRenderable = resolved.startsWith('http') && !resolved.endsWith('.svg');
  const dims =
    typeof size === 'number' ? { width: size, height: size } : { width: size.width, height: size.height };

  if (isRenderable) {
    return (
      <Image
        source={{ uri: resolved }}
        style={{ ...dims, borderRadius: radius, backgroundColor: colors.cream }}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={{
        ...dims,
        borderRadius: radius,
        backgroundColor: colors.cream,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityElementsHidden
    >
      <View style={{ width: '40%', aspectRatio: 1, borderRadius: 999, backgroundColor: colors.marigold }} />
      {label ? (
        <Text style={{ marginTop: 4, color: colors.muted, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}
