import { StyleSheet } from 'react-native';
import { colors, radii, spacing, fonts } from '@darjeeling/tokens';

export { colors, radii, spacing, fonts };

export const type = {
  display: { fontFamily: 'Baloo2_800ExtraBold', fontSize: 32, color: colors.indigo },
  h1: { fontFamily: 'Baloo2_800ExtraBold', fontSize: 26, color: colors.indigo },
  h2: { fontFamily: 'Baloo2_700Bold', fontSize: 20, color: colors.indigo },
  body: { fontFamily: 'Inter_400Regular', fontSize: 16, color: colors.indigo },
  bodyBold: { fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.indigo },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.muted },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.muted },
} as const;

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  container: { padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Buttons
  btn: {
    minHeight: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  btnPrimary: { backgroundColor: colors.indigo },
  btnAction: { backgroundColor: colors.marigold },
  btnSuccess: { backgroundColor: colors.tealeaf },
  btnDanger: { backgroundColor: colors.achar },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.border },
  btnTextLight: { fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.white },
  btnTextDark: { fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.indigo },
  // Inputs
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    color: colors.indigo,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  // Tags
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radii.pill },
  tagText: { fontFamily: 'Inter_700Bold', fontSize: 11, textTransform: 'uppercase' },
  // Banners
  banner: { borderRadius: radii.md, padding: spacing.md },
});

export const flagColors = [colors.indigo, colors.cream, colors.achar, colors.tealeaf, colors.marigold];
