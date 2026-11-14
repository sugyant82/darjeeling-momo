import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { DEV_USERS, devSignIn, devMagicLink, signInWithGoogle } from '@darjeeling/shared';
import { supabase } from '@/lib/supabase';
import { devPassword, integrations } from '@/lib/env';
import { styles, type } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Banner } from '@/components/ui';
import { useToast } from '@/state/toast';

export default function SignInScreen() {
  const toast = useToast();
  const params = useLocalSearchParams<{ next?: string }>();
  const googleReal = integrations.googleAuth.connected;
  const appleAvailable = integrations.appleAuth.available;
  const [showDev, setShowDev] = useState(!googleReal);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  function done() {
    if (params.next) router.replace(params.next as never);
    else router.back();
  }

  async function handleGoogle() {
    if (!googleReal) {
      setShowDev(true);
      return;
    }
    setBusy(true);
    try {
      const redirectTo = Linking.createURL('/auth/callback');
      const { url } = await signInWithGoogle(supabase, redirectTo);
      if (!url) throw new Error('No auth URL');
      const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
      if (result.type === 'success') {
        const code = new URL(result.url).searchParams.get('code');
        if (code) await supabase.auth.exchangeCodeForSession(code);
        done();
      }
    } catch {
      toast.show('Google sign-in failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleDevUser(userEmail: string) {
    setBusy(true);
    try {
      await devSignIn(supabase, userEmail, devPassword);
      toast.show('Signed in (dev).', 'success');
      done();
    } catch {
      toast.show('Dev sign-in failed. Did the seed run?', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleMagic() {
    if (!email) return;
    setBusy(true);
    try {
      await devMagicLink(supabase, email, Linking.createURL('/auth/callback'));
      toast.show('Magic link sent — check the local mailbox (:54324).', 'success');
    } catch {
      toast.show('Could not send magic link.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={type.h1}>Sign in</Text>
      <Text style={type.body}>Browse freely — you only need to sign in to place an order.</Text>

      <Button title="Continue with Google" variant="primary" onPress={handleGoogle} loading={busy} />

      {appleAvailable ? (
        <Button
          title="Continue with Apple"
          variant="outline"
          onPress={async () => {
            setBusy(true);
            try {
              const redirectTo = Linking.createURL('/auth/callback');
              const { url } = await supabase.auth
                .signInWithOAuth({ provider: 'apple', options: { redirectTo, skipBrowserRedirect: true } })
                .then((r) => r.data);
              if (url) {
                const result = await WebBrowser.openAuthSessionAsync(url, redirectTo);
                if (result.type === 'success') {
                  const code = new URL(result.url).searchParams.get('code');
                  if (code) await supabase.auth.exchangeCodeForSession(code);
                  done();
                }
              }
            } catch {
              toast.show('Apple sign-in failed.', 'error');
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}

      {showDev && !googleReal ? (
        <View style={{ gap: 12, marginTop: 8 }}>
          <Banner kind="warn">Dev sign-in — local only. Pick a seeded account or use a magic link.</Banner>
          {DEV_USERS.map((u) => (
            <Button key={u.role} title={`Sign in as ${u.label}`} variant="outline" onPress={() => handleDevUser(u.email)} />
          ))}
          <Text style={type.label}>Or get a magic link</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Button title="Send magic link" variant="action" onPress={handleMagic} disabled={!email || busy} />
          <Text style={type.caption}>Magic links appear in the local mailbox at the Inbucket URL (:54324).</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
