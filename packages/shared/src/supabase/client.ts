import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type DarjeelingSupabaseClient = SupabaseClient<Database>;

export interface SupabaseFactoryOptions {
  url: string;
  anonKey: string;
  /** Storage adapter for the auth session (AsyncStorage on mobile, default web storage on web). */
  storage?: {
    getItem: (key: string) => Promise<string | null> | string | null;
    setItem: (key: string, value: string) => Promise<void> | void;
    removeItem: (key: string) => Promise<void> | void;
  };
  /** Mobile must set this false; it has no URL to parse for the OAuth callback. */
  detectSessionInUrl?: boolean;
  /** Persist the session (true for clients, false for stateless server/edge use). */
  persistSession?: boolean;
  /** Mobile sets this true to keep tokens fresh while the app is open. */
  autoRefreshToken?: boolean;
}

export function createSupabaseClient(options: SupabaseFactoryOptions): DarjeelingSupabaseClient {
  const {
    url,
    anonKey,
    storage,
    detectSessionInUrl = true,
    persistSession = true,
    autoRefreshToken = true,
  } = options;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase URL and anon key are required. Run `pnpm setup:local` to generate local env.',
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      storage,
      persistSession,
      autoRefreshToken,
      detectSessionInUrl,
      flowType: 'pkce',
    },
  });
}
