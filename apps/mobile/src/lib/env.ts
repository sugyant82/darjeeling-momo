import { DEV_PASSWORD, appName as resolveAppName, resolveIntegrations } from '@darjeeling/shared';

// EXPO_PUBLIC_* are statically inlined by the Expo bundler.
export const publicEnv = {
  INTEGRATIONS_MODE: process.env.EXPO_PUBLIC_INTEGRATIONS_MODE,
  EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_WEB_ORIGIN: process.env.EXPO_PUBLIC_WEB_ORIGIN,
  EXPO_PUBLIC_GOOGLE_AUTH_ENABLED: process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED,
  EXPO_PUBLIC_APPLE_AUTH_ENABLED: process.env.EXPO_PUBLIC_APPLE_AUTH_ENABLED,
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  EXPO_PUBLIC_DEV_PASSWORD: process.env.EXPO_PUBLIC_DEV_PASSWORD,
} as const;

export const SUPABASE_URL = publicEnv.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = publicEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const WEB_ORIGIN = publicEnv.EXPO_PUBLIC_WEB_ORIGIN ?? 'http://localhost:3000';

/** Dev sign-in password. Override when the seeded users use a non-default password. */
export const devPassword = publicEnv.EXPO_PUBLIC_DEV_PASSWORD || DEV_PASSWORD;

export const appName = resolveAppName(publicEnv as Record<string, string | undefined>);
export const integrations = resolveIntegrations(publicEnv as Record<string, string | undefined>);

/** Resolve a (possibly relative) menu image URL to something fetchable on device. */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return `${WEB_ORIGIN}/images/placeholder-momo.svg`;
  if (url.startsWith('http')) return url;
  return `${WEB_ORIGIN}${url}`;
}
