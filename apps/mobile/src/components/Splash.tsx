import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { appName } from '@/lib/env';
import { colors, font } from '@/lib/theme';
import { KoruBackground } from './KoruBackground';
import { lockupStyles, MARK_RATIO, MarkLayer, PrayerFlags, splitName } from './brand';

/** When the splash starts fading into the app (ms after mount). Keep in sync with INTRO_DELAY. */
const EXIT_AT = 1900;
/** How long screens mounted at launch hold their entrance animations (see state/intro). */
export const INTRO_DELAY = EXIT_AT;

/**
 * Logo reveal shown once per app launch over the first screen: the prayer flags drop onto their
 * string, the peaks rise, the momo lands with a squash, the wordmark appears and "Kia ora" fades
 * in, then it all fades into the app. Tap to skip. Skipped entirely when Reduce Motion is on.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const flagsWidth = Math.min(width * 0.84, 420);
  const size = Math.min(flagsWidth / 4.4, 92);
  const l = lockupStyles(size, 'navy');
  const { top, bottom } = splitName(appName);

  const fade = useSharedValue(1);
  const fall = useSharedValue(0);
  const squash = useSharedValue(1);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  const leave = useCallback(
    (delay: number) => {
      fade.value = withDelay(
        delay,
        withTiming(0, { duration: 450, easing: Easing.inOut(Easing.cubic) }, (done) => {
          if (done) scheduleOnRN(finish);
        }),
      );
    },
    [fade, finish],
  );

  useEffect(() => {
    if (reduced) {
      finish();
      return;
    }
    fall.value = withDelay(480, withTiming(1, { duration: 420, easing: Easing.in(Easing.quad) }));
    squash.value = withDelay(
      900,
      withSequence(withTiming(0.84, { duration: 110 }), withSpring(1, { damping: 7, stiffness: 240 })),
    );
    leave(EXIT_AT);
  }, [reduced, fall, squash, leave, finish]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ scale: interpolate(fade.value, [0, 1], [1.06, 1]) }],
  }));
  const momoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(fall.value, [0, 0.25], [0, 1], 'clamp'),
    transform: [
      { translateY: (1 - fall.value) * -size * 0.9 },
      { scaleY: squash.value },
      { scaleX: 2 - squash.value },
    ],
  }));

  if (reduced) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, s.overlay, overlayStyle]}
      accessibilityLabel={`${appName}. Kia ora`}
    >
      <KoruBackground tone="cream" opacity={0.05} />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => leave(0)}
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
      />
      <View pointerEvents="none" style={{ width: flagsWidth, alignItems: 'center', gap: size * 0.45 }}>
        <PrayerFlags variant="navy" width={flagsWidth} mode="drop" delay={60} />
        <View style={l.row}>
          <View style={{ width: l.markHeight * MARK_RATIO, height: l.markHeight }}>
            <Animated.View entering={FadeInUp.delay(320).duration(600)} style={StyleSheet.absoluteFill}>
              <MarkLayer part="peaks" variant="navy" height={l.markHeight} />
            </Animated.View>
            <Animated.View entering={FadeIn.delay(1050).duration(500)} style={StyleSheet.absoluteFill}>
              <MarkLayer part="steam" variant="navy" height={l.markHeight} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: 'bottom' }, momoStyle]}>
              <MarkLayer part="momo" variant="navy" height={l.markHeight} />
            </Animated.View>
          </View>
          <View>
            {top ? (
              <Animated.Text entering={FadeIn.delay(640).duration(700)} style={l.top}>
                {top}
              </Animated.Text>
            ) : null}
            <Animated.Text entering={FadeInUp.delay(700).duration(650)} style={l.bottom}>
              {bottom.toLowerCase()}
            </Animated.Text>
          </View>
        </View>
        <Animated.Text entering={FadeInUp.delay(1100).duration(600)} style={s.greeting}>
          Kia ora
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: {
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: colors.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    marginTop: 6,
    fontFamily: font.heading,
    fontSize: 22,
    letterSpacing: 1.5,
    color: 'rgba(251, 246, 236, 0.88)',
  },
});
