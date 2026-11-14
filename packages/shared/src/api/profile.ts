import type { DarjeelingSupabaseClient } from '../supabase/client';
import type { ProfileRow } from '../types/database';
import type { ProfileInput, PushTokenInput } from '../schemas';

export async function fetchProfile(
  supabase: DarjeelingSupabaseClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  supabase: DarjeelingSupabaseClient,
  userId: string,
  input: ProfileInput,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ name: input.name, phone: input.phone })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/** Register (upsert) an Expo push token for the signed-in user. */
export async function registerPushToken(
  supabase: DarjeelingSupabaseClient,
  userId: string,
  input: PushTokenInput,
): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token: input.token, platform: input.platform }, { onConflict: 'token' });
  if (error) throw error;
}

/**
 * Delete the signed-in user's account. Calls the delete-account Edge Function,
 * which removes the auth user (cascades profile/orders per FK policy). Required
 * by the App Store.
 */
export async function deleteAccount(supabase: DarjeelingSupabaseClient): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw error;
  await supabase.auth.signOut();
}
