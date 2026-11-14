/**
 * Darjeeling Momo design tokens — the single source of truth for brand colour,
 * type, spacing and shape. Consumed by apps/web (via CSS variables) and
 * apps/mobile (via StyleSheet objects). Values come from resources/brand-guidelines.md.
 *
 * Accessibility: every foreground/background pairing noted below meets WCAG AA
 * (>= 4.5:1 for body text). See each colour's `on` note.
 */

export const colors = {
  /** Primary. Headers, nav, body text, Checkout button, tab bar. White text on it. */
  indigo: '#1F2A44',
  /** Action. Add to cart, cart badge, highlights. Text on it is ALWAYS indigo. */
  marigold: '#E8A33D',
  /** Spicy tag, offers, errors. White text on it. */
  achar: '#C2412D',
  /** Veg tag, success / order-ready states. White text on it. */
  tealeaf: '#3E6B48',
  /** Page / screen background. */
  cream: '#FBF6EC',
  /** Menu cards, sheets. */
  card: '#FFFFFF',
  /** Dividers, card borders. */
  border: '#E4DCCB',
  /** Secondary text. */
  muted: '#4A5168',
  /** Pure white, used for text on dark/colour fills. */
  white: '#FFFFFF',
  /** Disabled / sold-out overlay base. */
  disabled: '#C9C2B2',
} as const;

/** Foreground colour to use on top of each fill (AA-safe). */
export const onColor = {
  indigo: colors.white,
  marigold: colors.indigo,
  achar: colors.white,
  tealeaf: colors.white,
  cream: colors.indigo,
  card: colors.indigo,
} as const;

/** The five prayer-flag colours, left to right, for the header divider stripe. */
export const flagStripe = [
  colors.indigo,
  colors.cream,
  colors.achar,
  colors.tealeaf,
  colors.marigold,
] as const;

/** 4px base spacing scale. */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

/** Corner radii. Cards 16px; buttons fully rounded (pill). */
export const radii = {
  sm: 8,
  md: 12,
  card: 16,
  lg: 20,
  pill: 999,
} as const;

export const fonts = {
  /** Headings and wordmark. Baloo 2 ExtraBold (800). */
  heading: 'Baloo 2',
  /** Body and UI. Inter 400–700. */
  body: 'Inter',
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

/** Type scale (px). Mobile-first sizes; scale up with layout where needed. */
export const typeScale = {
  display: 32,
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  label: 14,
  caption: 12,
} as const;

export const lineHeights = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.5,
} as const;

/** Minimum interactive target height (accessibility). */
export const minTouchTarget = 44;

export type Colors = typeof colors;
export type ColorToken = keyof Colors;

export const tokens = {
  colors,
  onColor,
  flagStripe,
  spacing,
  radii,
  fonts,
  fontWeights,
  typeScale,
  lineHeights,
  minTouchTarget,
} as const;

export default tokens;
