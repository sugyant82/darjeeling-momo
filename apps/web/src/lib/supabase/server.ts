import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@darjeeling/shared/types';
import { getSupabaseAnonKey, getSupabaseUrl } from '../env';

/** Server Supabase client bound to the request cookies (RSC / route handlers). */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only — safe to ignore.
        }
      },
    },
  });
}
