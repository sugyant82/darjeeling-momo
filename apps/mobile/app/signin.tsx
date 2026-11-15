import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { LogIn, Mail } from 'lucide-react-native';
import { devMagicLink, devSignIn, signInWithGoogle } from '@darjeeling/shared';
import { supabase } from '@/lib/supabase';
import { devPassword, integrations, MOBILE_DEV_USERS } from '@/lib/env';
import { colors, radii, styles, type } from '@/lib/theme';
import { useToast } from '@/state/toast';
import { BrandLockup } from '@/components/brand';
import { Button } from '@/components/Button';
import { KoruBackground } from '@/components/KoruBackground';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Banner } from '@/components/ui';

type Notice = { kind: 'error' | 'success' | 'info'; text: string };

/** Only in-app paths are accepted as a destination after signing in. */
function safeNext(next: string | undefined): string | undefined {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : undefined;
}

export default function SignInScreen() {
  const toast = useToast();
  const params = useLocalSearchParams<{ next?: string }>();
  const next = safeNext(params.next);
  const googleReal = integrations.googleAuth.connected;
  const appleAvailable = integrations.appleAuth.available;
  const [showDev, setShowDev] = useState(!googleReal);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  // Shown inline: toasts sit behind this modal on iOS.
  const [notice, setNotice] = useState<Notice | null>(null);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  function done() {
    toast.show("Kia ora! You're signed in.", 'success');
    // Back to wherever sign-in was opened from (e.g. checkout); a fresh destination only for deep links.
    if (router.canGoBack()) router.back();
    else router.replace((next ?? '/') as never);
  }

  async function oauth(provider: 'google' | 'apple') {
    setBusy(provider);
    setNotice(null);
    try {
      const redirectTo = Linking.createURL('/auth/callback');
      const url =
        provider === 'google'
          ? (await signInWithGoogle(supabase, redirectTo)).url
          : (
              await supabase.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo, skipBrowserRedirect: true } })
            ).data.url;
      if (!url) throw new Error('No sign-in URL');
      const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
      if (result.type !== 'success') return;
      const code = new URL(result.url).searchParams.get('code');
      if (!code) throw new Error('No code');
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      done();
    } catch {
      setNotice({ kind: 'error', text: `${provider === 'google' ? 'Google' : 'Apple'} sign-in didn't work. Please try again.` });
    } finally {
      setBusy(null);
    }
  }

  async function handleDevUser(userEmail: string) {
    setBusy(userEmail);
    setNotice(null);
    try {
      await devSignIn(supabase, userEmail, devPassword);
      done();
    } catch {
      setNotice({
        kind: 'error',
        text: 'Test sign-in failed. Check that EXPO_PUBLIC_DEV_PASSWORD matches the seeded accounts.',
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleMagic() {
    const address = email.trim();
    if (!address || busy) return;
    setBusy('magic');
    setNotice(null);
    try {
      const redirectTo = Linking.createURL('/auth/callback', next ? { queryParams: { next } } : undefined);
      await devMagicLink(supabase, address, redirectTo);
      setNotice({ kind: 'success', text: `Check ${address} for your sign-in link.` });
    } catch {
      setNotice({ kind: 'error', text: "Couldn't send the link. Check the address and try again." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader kicker="Kia ora" title="Sign in" modal onClose={close} />
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Animated.View entering={FadeInDown.duration(400)} style={s.brand}>
          <KoruBackground tone="cream" opacity={0.06} />
          <BrandLockup variant="navy" size={46} />
          <Text style={s.brandText}>Browse freely — you only need to sign in to place an order.</Text>
        </Animated.View>

        {notice ? (
          <Animated.View entering={FadeIn.duration(200)}>
            <Banner kind={notice.kind}>{notice.text}</Banner>
          </Animated.View>
        ) : null}

        <Button
          title="Continue with Google"
          variant="primary"
          size="lg"
          icon={<LogIn color={colors.white} size={18} />}
          loading={busy === 'google'}
          disabled={busy !== null}
          onPress={() => (googleReal ? oauth('google') : setShowDev(true))}
        />
        {appleAvailable ? (
          <Button
            title="Continue with Apple"
            variant="outline"
            size="lg"
            loading={busy === 'apple'}
            disabled={busy !== null}
            onPress={() => oauth('apple')}
          />
        ) : null}

        {showDev && !googleReal ? (
          <Animated.View entering={FadeInDown.delay(100).duration(350)} style={[styles.card, { gap: 12, padding: 18 }]}>
            <Text style={type.kicker}>Testing</Text>
            <Text style={[type.h3, { marginTop: -6 }]}>Test sign-in</Text>
            <Text style={type.caption}>
              Google sign-in isn&apos;t set up yet. Use the test customer account, or get a sign-in link by email.
            </Text>
            {MOBILE_DEV_USERS.map((u) => (
              <Button
                key={u.role}
                title={`Sign in as ${u.label}`}
                variant="outline"
                loading={busy === u.email}
                disabled={busy !== null}
                onPress={() => handleDevUser(u.email)}
              />
            ))}
            <Text style={[type.label, { marginTop: 4 }]}>Or email me a sign-in link</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.disabled}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="send"
              value={email}
              onChangeText={setEmail}
              onSubmitEditing={handleMagic}
              accessibilityLabel="Email address"
            />
            <Button
              title="Send sign-in link"
              variant="action"
              icon={<Mail color={colors.indigo} size={18} />}
              loading={busy === 'magic'}
              disabled={!email.trim() || busy !== null}
              onPress={handleMagic}
            />
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  brand: {
    backgroundColor: colors.indigo,
    borderRadius: radii.xl,
    padding: 22,
    gap: 16,
    overflow: 'hidden',
    alignItems: 'center',
  },
  brandText: { ...type.body, color: 'rgba(251,246,236,0.85)', textAlign: 'center' },
});
