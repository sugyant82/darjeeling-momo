import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { styles } from '@/lib/theme';
import { Button } from '@/components/Button';
import { EmptyState, LoadingScreen } from '@/components/ui';

const EXPIRED = 'That sign-in link is invalid or has expired. Please request a new one.';

/** Deep-link target for OAuth / magic links: exchanges the code for a session, then carries on. */
export default function AuthCallback() {
  const { code, next, error_description } = useLocalSearchParams<{
    code?: string;
    next?: string;
    error_description?: string;
  }>();
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!code) {
        setFailed(error_description || EXPIRED);
        return;
      }
      // exchangeCodeForSession reports failures in its result rather than throwing.
      const { error } = await supabase.auth.exchangeCodeForSession(code).catch(() => ({ error: true }));
      if (!active) return;
      if (error) {
        setFailed(EXPIRED);
        return;
      }
      const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/account';
      router.replace(destination as never);
    })();
    return () => {
      active = false;
    };
  }, [code, next, error_description]);

  if (failed) {
    return (
      <View style={[styles.screen, { padding: 16, justifyContent: 'center' }]}>
        <EmptyState
          title="Couldn't sign you in"
          message={failed}
          action={<Button title="Try again" variant="primary" onPress={() => router.replace('/signin')} />}
        />
      </View>
    );
  }
  return <LoadingScreen label="Signing you in…" />;
}
