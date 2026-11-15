import { StyleSheet } from 'react-native';
import { colors, radii as baseRadii, spacing, fonts } from '@darjeeling/tokens';

export { colors, spacing, fonts };

/** Corner radii. Cards 20, large surfaces 28, buttons fully rounded. */
export const radii = { ...baseRadii, xl: 28 } as const;

/** Loaded font family names (see app/_layout.tsx). */
export const font = {
  display: 'Baloo2_800ExtraBold',
  heading: 'Baloo2_700Bold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Light tints used for surfaces and text on the indigo brand colour. */
export const tint = {
  creamMuted: 'rgba(251, 246, 236, 0.78)',
  creamFaint: 'rgba(251, 246, 236, 0.12)',
  indigoFaint: 'rgba(31, 42, 68, 0.06)',
  indigoLine: 'rgba(31, 42, 68, 0.1)',
  openGreen: '#8FD4A0',
  closedRed: '#F2A493',
  selected: '#FFF8EC',
  pageEdge: '#F7EFDD',
} as const;

export const type = {
  display: { fontFamily: font.display, fontSize: 34, lineHeight: 40, color: colors.indigo },
  h1: { fontFamily: font.display, fontSize: 28, lineHeight: 34, color: colors.indigo },
  h2: { fontFamily: font.display, fontSize: 22, lineHeight: 28, color: colors.indigo },
  h3: { fontFamily: font.heading, fontSize: 18, lineHeight: 24, color: colors.indigo },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 22, color: colors.indigo },
  bodyBold: { fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: colors.indigo },
  label: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19, color: colors.muted },
  caption: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  /** Small uppercase line above a title (often te reo Māori with an English gloss). */
  kicker: {
    fontFamily: font.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.tealeaf,
  },
  price: { fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: colors.indigo },
} as const;

/** Soft layered shadows (React Native's cross-platform boxShadow). */
export const shadows = {
  card: { boxShadow: '0px 1px 2px rgba(31, 42, 68, 0.05), 0px 10px 24px -14px rgba(31, 42, 68, 0.3)' },
  lift: { boxShadow: '0px 2px 6px rgba(31, 42, 68, 0.06), 0px 18px 36px -18px rgba(31, 42, 68, 0.45)' },
  action: { boxShadow: '0px 10px 20px -10px rgba(232, 163, 61, 0.9)' },
  bar: { boxShadow: '0px -8px 24px -12px rgba(31, 42, 68, 0.35)' },
  float: { boxShadow: '0px 12px 28px -10px rgba(31, 42, 68, 0.5)' },
} as const;

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  container: { padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    color: colors.indigo,
    fontFamily: font.regular,
    fontSize: 16,
  },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.pill },
  tagText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  banner: { borderRadius: radii.md, padding: spacing.md },
});

export const flagColors = [colors.indigo, colors.cream, colors.achar, colors.tealeaf, colors.marigold];

/** Content never stretches wider than this on tablets / large phones in landscape. */
export const MAX_CONTENT_WIDTH = 640;
