import { DEV_PASSWORD, resolveIntegrations, appName as resolveAppName } from '@darjeeling/shared';

/**
 * NEXT_PUBLIC_* values are statically inlined by Next at build time, so we
 * reference them explicitly (not via dynamic keys) to keep them in the bundle.
 */
export const publicEnv = {
  INTEGRATIONS_MODE: process.env.INTEGRATIONS_MODE,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_DEV_PASSWORD: process.env.NEXT_PUBLIC_DEV_PASSWORD,
} as const;

export function getSupabaseUrl(): string {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set. Run `pnpm setup:local`.');
  return url;
}

export function getSupabaseAnonKey(): string {
  const key = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Run `pnpm setup:local`.');
  return key;
}

/** Dev sign-in password. Override when the seeded users use a non-default password. */
export const devPassword = publicEnv.NEXT_PUBLIC_DEV_PASSWORD || DEV_PASSWORD;

export const appName = resolveAppName(publicEnv as Record<string, string | undefined>);

export const integrations = resolveIntegrations(publicEnv as Record<string, string | undefined>);
