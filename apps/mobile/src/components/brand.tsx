import { useEffect } from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { appName } from '@/lib/env';
import { colors, font } from '@/lib/theme';

/**
 * Vector brand pieces, drawn from the logo's own geometry (brand/app-icon-rounded.svg) so they
 * stay crisp at any size and can be animated part by part (splash, home hero). Mirrors
 * apps/web/src/components/brand.tsx.
 */

export type BrandVariant = 'light' | 'navy';

/** Lighter indigo used for the peaks on the navy logo. */
const PEAK_ON_NAVY = '#3A4A6E';
const MARK_VIEWBOX = '4 52 192 140';
/** Width / height of the mark. */
export const MARK_RATIO = 192 / 140;
const MOMO_PATH = 'M40 150C40 118 70 100 100 100C130 100 160 118 160 150C160 166 140 172 100 172C60 172 40 166 40 150Z';

export type MarkPart = 'peaks' | 'steam' | 'momo';

function markPart(part: MarkPart, navy: boolean) {
  switch (part) {
    case 'peaks':
      return (
        <G>
          <Path d="M8 150 62 60 96 104 140 74 192 150Z" fill={navy ? PEAK_ON_NAVY : colors.indigo} />
          <Path d="M62 60 52 76 59 72 64 78 69 72 74 76Z" fill={colors.cream} />
          <Path d="M140 74 122 86 131 83 137 88 143 83 148 86Z" fill={colors.cream} />
        </G>
      );
    case 'steam':
      return (
        <G fill="none" stroke={navy ? colors.cream : colors.marigold} strokeWidth={7} strokeLinecap="round">
          <Path d="M94 88C88 80 100 74 94 64" />
          <Path d="M108 86C102 78 114 72 108 62" />
        </G>
      );
    case 'momo':
      return (
        <G>
          {navy ? null : <Ellipse cx={100} cy={184} rx={69} ry={3.8} fill={colors.achar} />}
          {/* Halo: the light logo separates the momo from the peaks with a cream ring. */}
          <Path d={MOMO_PATH} fill="none" stroke={navy ? colors.indigo : colors.cream} strokeWidth={navy ? 12 : 14} />
          <Path d={MOMO_PATH} fill={colors.marigold} />
          <Path d="M91 103C91 92 109 92 109 103Z" fill={colors.marigold} stroke={colors.indigo} strokeWidth={6} strokeLinejoin="round" />
          <G fill="none" stroke={colors.indigo} strokeWidth={6} strokeLinecap="round">
            <Path d="M95 105C78 112 62 126 56 148" />
            <Path d="M105 105C122 112 138 126 144 148" />
            <Path d="M98 106C90 118 84 132 82 154" />
            <Path d="M102 106C110 118 116 132 118 154" />
          </G>
        </G>
      );
  }
}

/** The mark: a marigold momo in front of snow-capped peaks, with steam. */
export function LogoMark({ variant = 'light', height }: { variant?: BrandVariant; height: number }) {
  const navy = variant === 'navy';
  return (
    <Svg width={height * MARK_RATIO} height={height} viewBox={MARK_VIEWBOX}>
      {markPart('peaks', navy)}
      {markPart('steam', navy)}
      {markPart('momo', navy)}
    </Svg>
  );
}

/** One layer of the mark at the same size/viewBox, so layers stack exactly (used by the splash). */
export function MarkLayer({ part, variant = 'light', height }: { part: MarkPart; variant?: BrandVariant; height: number }) {
  return (
    <Svg width={height * MARK_RATIO} height={height} viewBox={MARK_VIEWBOX}>
      {markPart(part, variant === 'navy')}
    </Svg>
  );
}

/**
 * Mark + two-line wordmark ("DARJEELING" over "momo"), built from the configured app name
 * so a rename flows through. `size` is the font size of the bottom word.
 */
export function BrandLockup({
  variant = 'light',
  size,
  compact = false,
  style,
}: {
  variant?: BrandVariant;
  size: number;
  /** Header size: the mark spans both lines and the small top line is set larger to stay legible. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { top, bottom } = splitName(appName);
  const l = lockupStyles(size, variant, compact);
  return (
    <View style={[l.row, style]} accessible accessibilityRole="image" accessibilityLabel={appName}>
      <LogoMark variant={variant} height={l.markHeight} />
      <View>
        {top ? <Text style={l.top}>{top}</Text> : null}
        <Text style={l.bottom}>{bottom.toLowerCase()}</Text>
      </View>
    </View>
  );
}

/** Proportions of the lockup, shared with the animated splash so both match exactly. */
export function lockupStyles(size: number, variant: BrandVariant, compact = false) {
  const navy = variant === 'navy';
  return {
    markHeight: size * (compact ? 1.5 : 0.92),
    row: {
      flexDirection: 'row',
      alignItems: compact ? 'center' : 'flex-end',
      gap: size * (compact ? 0.3 : 0.14),
    } satisfies ViewStyle,
    top: {
      fontFamily: font.display,
      fontSize: size * (compact ? 0.34 : 0.21),
      lineHeight: size * (compact ? 0.42 : 0.28),
      letterSpacing: size * (compact ? 0.07 : 0.055),
      color: navy ? colors.marigold : colors.achar,
      textTransform: 'uppercase',
      marginLeft: size * 0.03,
    } satisfies TextStyle,
    bottom: {
      fontFamily: font.display,
      fontSize: size,
      lineHeight: size * 1.02,
      letterSpacing: -size * 0.02,
      color: navy ? colors.cream : colors.indigo,
      marginBottom: compact ? 0 : -size * 0.16,
    } satisfies TextStyle,
  };
}

export function splitName(name: string): { top: string; bottom: string } {
  const words = name.trim().split(/\s+/);
  const bottom = words.pop() ?? name;
  return { top: words.join(' '), bottom };
}

/** The tagline, allowed to wrap only at its " · " separators (never mid-phrase). */
export function Tagline({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const parts = text.split(' · ');
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      {parts.map((part, i) => (
        <Text key={i} style={style}>
          {i > 0 ? ' · ' : ''}
          {part}
        </Text>
      ))}
    </View>
  );
}

/** A single koru: a fern frond unfurling into a spiral. Original line drawing, used as an ornament. */
const KORU_PATH =
  'M-8 34C-8 18.7-26 18.7-26 0L-24.9-4.5-23-8.6-20.5-12.2-17.5-15.2-14.1-17.6-10.5-19.2-6.7-20.2-2.9-20.5.7-20.1 4.2-19.1 7.3-17.5 10-15.5 12.2-13.1 14-10.4 15.1-7.6 15.8-4.6 15.9-1.7 15.5 1.1 14.6 3.7 13.4 6.1 11.7 8.1 9.8 9.8 7.7 11.1 5.4 11.9 3.1 12.3.9 12.3-1.3 12-3.3 11.2-5.1 10.2-6.6 8.8-7.9 7.3-8.8 5.6-9.4 3.9-9.6 2.1-9.6.3-9.2-1.3-8.6-2.9-7.7-4.2-6.6-5.4-5.4-6.3-4.1-6.9-2.7-7.3-1.4-7.5 0-7.4';

export function Koru({ color, size, strokeWidth = 3.4 }: { color: string; size: number; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size * (63 / 51)} viewBox="-31 -25 51 63">
      <Path d={KORU_PATH} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={0} cy={-7.4} r={4.4} fill={color} />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Prayer flags (string + nine flags), animatable per flag.
// ---------------------------------------------------------------------------

type Flag = { fill: string; outline?: string };

const FLAGS: Record<BrandVariant, Flag[]> = {
  light: [
    { fill: colors.indigo },
    { fill: colors.cream, outline: colors.indigo },
    { fill: colors.achar },
    { fill: colors.tealeaf },
    { fill: colors.marigold },
    { fill: colors.indigo },
    { fill: colors.cream, outline: colors.indigo },
    { fill: colors.achar },
    { fill: colors.tealeaf },
  ],
  navy: [
    { fill: colors.indigo, outline: colors.cream },
    { fill: colors.cream },
    { fill: colors.achar },
    { fill: colors.tealeaf },
    { fill: colors.marigold },
    { fill: colors.indigo, outline: colors.cream },
    { fill: colors.cream },
    { fill: colors.achar },
    { fill: colors.tealeaf },
  ],
};

/** y of the sagging string (a quadratic from (0,78) via (720,222) to (1440,78)) at x. */
function stringY(x: number): number {
  const t = x / 1440;
  return 78 * (1 - t) ** 2 + 444 * t * (1 - t) + 78 * t ** 2;
}

/** Length of the string path in viewBox units (for the draw-on animation). */
const STRING_LENGTH = (() => {
  let len = 0;
  let prev = { x: 0, y: stringY(0) };
  for (let i = 1; i <= 200; i++) {
    const x = (1440 * i) / 200;
    const p = { x, y: stringY(x) };
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return Math.ceil(len);
})();

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * The string of prayer flags from the logo. `mode`:
 *  - "drop": the string draws on and the flags drop in one by one (splash)
 *  - "sway": flags sway gently in a wave (home hero)
 *  - "static"
 */
export function PrayerFlags({
  variant = 'light',
  width,
  mode = 'static',
  delay = 0,
}: {
  variant?: BrandVariant;
  width: number;
  mode?: 'drop' | 'sway' | 'static';
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const effectiveMode = reduced ? 'static' : mode;
  const k = width / 1440;
  const height = 220 * k;

  const draw = useSharedValue(effectiveMode === 'drop' ? 0 : 1);
  useEffect(() => {
    if (effectiveMode === 'drop') {
      draw.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
    }
  }, [effectiveMode, delay, draw]);
  const stringProps = useAnimatedProps(() => ({ strokeDashoffset: STRING_LENGTH * (1 - draw.value) }));

  return (
    <View style={{ width, height }} pointerEvents="none">
      {FLAGS[variant].map((flag, i) => {
        const cx = 144 + 144 * i;
        return (
          <FlagView
            key={i}
            index={i}
            mode={effectiveMode}
            delay={delay}
            style={{
              position: 'absolute',
              left: (cx - 46) * k,
              top: (stringY(cx) - 60) * k,
              width: 92 * k,
              height: 116 * k,
              backgroundColor: flag.fill,
              borderWidth: flag.outline ? Math.max(1, 4 * k) : 0,
              borderColor: flag.outline,
            }}
          />
        );
      })}
      <Svg width={width} height={height} viewBox="0 60 1440 220" style={{ position: 'absolute', left: 0, top: 0 }}>
        <AnimatedPath
          d="M0 78Q720 222 1440 78"
          fill="none"
          stroke={variant === 'navy' ? colors.cream : colors.indigo}
          strokeWidth={5}
          strokeDasharray={[STRING_LENGTH, STRING_LENGTH]}
          animatedProps={stringProps}
        />
      </Svg>
    </View>
  );
}

function FlagView({
  index,
  mode,
  delay,
  style,
}: {
  index: number;
  mode: 'drop' | 'sway' | 'static';
  delay: number;
  style: ViewStyle;
}) {
  const drop = useSharedValue(mode === 'drop' ? 0 : 1);
  const sway = useSharedValue(0.5);

  useEffect(() => {
    if (mode === 'drop') {
      drop.value = withDelay(delay + 180 + index * 55, withSpring(1, { damping: 11, stiffness: 150, mass: 0.8 }));
    } else if (mode === 'sway') {
      sway.value = withDelay(
        index * 160,
        withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
    }
  }, [mode, delay, index, drop, sway]);

  const animated = useAnimatedStyle(() => ({
    opacity: interpolate(drop.value, [0, 0.35], [0, 1], 'clamp'),
    transform: [
      { translateY: (1 - drop.value) * -26 },
      { rotate: `${(1 - drop.value) * -12 + (sway.value - 0.5) * 6}deg` },
    ],
  }));

  return <Animated.View style={[style, { transformOrigin: 'top' }, animated]} />;
}
