'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@darjeeling/shared/types';
import type { DarjeelingSupabaseClient } from '@darjeeling/shared';
import { getSupabaseAnonKey, getSupabaseUrl } from '../env';

let client: DarjeelingSupabaseClient | undefined;

/** Browser Supabase client (singleton). Uses cookie storage via @supabase/ssr. */
export function getBrowserSupabase(): DarjeelingSupabaseClient {
  if (!client) {
    client = createBrowserClient<Database>(
      getSupabaseUrl(),
      getSupabaseAnonKey(),
    ) as DarjeelingSupabaseClient;
  }
  return client;
}
