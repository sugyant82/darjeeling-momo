import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Providers } from '@/components/Providers';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import { INTRO_DELAY, Splash } from '@/components/Splash';
import { IntroProvider } from '@/state/intro';
import { colors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Fade the native splash straight into the animated intro (same indigo background).
SplashScreen.setOptions({ duration: 300, fade: true });

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  // If fonts fail to load, carry on with system fonts rather than hanging on the splash.
  const ready = fontsLoaded || Boolean(fontError);
  const [introDone, setIntroDone] = useState(false);
  const onIntroDone = useCallback(() => setIntroDone(true), []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.indigo }}>
      <SafeAreaProvider>
        <Providers>
          <IntroProvider value={introDone ? 0 : INTRO_DELAY}>
            <StatusBar style="light" />
            <OfflineBanner />
            <Stack
              screenOptions={{
                contentStyle: { backgroundColor: colors.cream },
                header: ({ options, navigation, back }) => (
                  <ScreenHeader title={options.title ?? ''} onBack={back ? navigation.goBack : undefined} />
                ),
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="item/[id]" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
              <Stack.Screen name="order/[id]" options={{ title: 'Your order' }} />
              <Stack.Screen name="signin" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
            </Stack>
            {introDone ? null : <Splash onDone={onIntroDone} />}
          </IntroProvider>
        </Providers>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
