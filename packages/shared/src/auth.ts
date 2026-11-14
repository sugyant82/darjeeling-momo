import type { DarjeelingSupabaseClient } from './supabase/client';

/**
 * Seeded dev users for LOCAL dev sign-in (placeholder mode). Clearly dev-only.
 * These exist only in the local Supabase seed; never in production.
 */
export const DEV_USERS = [
  { role: 'customer', email: 'customer@darjeeling.test', label: 'Customer' },
  { role: 'staff', email: 'staff@darjeeling.test', label: 'Staff (truck)' },
  { role: 'admin', email: 'admin@darjeeling.test', label: 'Admin (owner)' },
] as const;

export const DEV_PASSWORD = 'momo1234';

export type DevRole = (typeof DEV_USERS)[number]['role'];

/** Dev sign-in: email + password against local Supabase. */
export async function devSignIn(
  supabase: DarjeelingSupabaseClient,
  email: string,
  password: string = DEV_PASSWORD,
) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Dev magic link: Supabase sends it to the local Inbucket/mail viewer. */
export async function devMagicLink(
  supabase: DarjeelingSupabaseClient,
  email: string,
  emailRedirectTo?: string,
) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });
  if (error) throw error;
}

/** Real Google OAuth via Supabase (web uses redirect; mobile passes a deep link). */
export async function signInWithGoogle(
  supabase: DarjeelingSupabaseClient,
  redirectTo?: string,
) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: Boolean(redirectTo) },
  });
  if (error) throw error;
  return data;
}

export async function signInWithApple(
  supabase: DarjeelingSupabaseClient,
  redirectTo?: string,
) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo, skipBrowserRedirect: Boolean(redirectTo) },
  });
  if (error) throw error;
  return data;
}

export async function signOut(supabase: DarjeelingSupabaseClient) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSessionUser(supabase: DarjeelingSupabaseClient) {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}
