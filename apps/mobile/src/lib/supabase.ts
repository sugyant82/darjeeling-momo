import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupabaseClient } from '@darjeeling/shared';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/** Mobile Supabase client. Persists the session in AsyncStorage; no URL detection. */
export const supabase = createSupabaseClient({
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  storage: AsyncStorage,
  detectSessionInUrl: false,
  persistSession: true,
  autoRefreshToken: true,
});
