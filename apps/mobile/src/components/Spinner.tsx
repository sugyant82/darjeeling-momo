import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** One grow-and-shrink cycle, as in the Material Design indeterminate spinner. */
const CYCLE_MS = 1400;
/** Google's spinner cycles four colours; ours cycles the four brand flag colours (and back to the first). */
const BRAND_CYCLE: string[] = [colors.indigo, colors.achar, colors.marigold, colors.tealeaf, colors.indigo];
const HUE_STOPS = [0, 1, 2, 3, 4];

/**
 * Material-style indeterminate circular progress indicator. The arc grows to 3/4 of the circle
 * and shrinks again while the whole ring rotates; runs entirely on the UI thread.
 * Pass `color` for a single colour (e.g. inside a button); omit it to cycle the brand colours.
 */
export function Spinner({
  size = 36,
  strokeWidth,
  color,
  accessibilityLabel = 'Loading',
}: {
  size?: number;
  strokeWidth?: number;
  color?: string;
  accessibilityLabel?: string;
}) {
  const stroke = strokeWidth ?? Math.max(2.5, size / 10);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  const hue = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }), -1, false);
    hue.value = withRepeat(withTiming(4, { duration: CYCLE_MS * 4, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(progress);
      cancelAnimation(hue);
    };
  }, [progress, hue]);

  const ringStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const half = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const eased = half < 0.5 ? 4 * half ** 3 : 1 - (-2 * half + 2) ** 3 / 2;
    // Container turns 270° per cycle; the arc adds 135° growing and 315° shrinking (720° total = seamless loop).
    const arcTurn = t < 0.5 ? 135 * eased : 135 + 315 * eased;
    return { transform: [{ rotate: `${270 * t + arcTurn}deg` }] };
  });

  const arcProps = useAnimatedProps(() => {
    const t = progress.value;
    const half = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const eased = half < 0.5 ? 4 * half ** 3 : 1 - (-2 * half + 2) ** 3 / 2;
    const visible = t < 0.5 ? 0.75 * eased : 0.75 * (1 - eased);
    return {
      strokeDashoffset: circumference * (1 - Math.max(visible, 0.03)),
      stroke: color ?? interpolateColor(hue.value, HUE_STOPS, BRAND_CYCLE),
    };
  });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size }}
    >
      <Animated.View style={[{ width: size, height: size }, ringStyle]}>
        <Svg width={size} height={size}>
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={[circumference, circumference]}
            animatedProps={arcProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
