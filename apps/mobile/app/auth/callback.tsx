import { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Loading } from '@/components/ui';
import { styles } from '@/lib/theme';

/** Deep-link target for OAuth / magic-link. Exchanges the code for a session. */
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    (async () => {
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch {
          /* ignore */
        }
      }
      router.replace('/account');
    })();
  }, [code]);

  return (
    <View style={styles.screen}>
      <Loading label="Signing you in…" />
    </View>
  );
}
