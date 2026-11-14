/**
 * Integration switch. Each external service runs in REAL mode when its keys are
 * present and in LOCAL PLACEHOLDER mode when they are missing. Detection is pure:
 * callers pass the relevant env map (process.env on web/server, Expo's extra on
 * mobile) so this module works in Next.js, Expo and Deno Edge Functions alike.
 *
 * See the /admin/setup page for a live rendering of this status, and
 * INTEGRATIONS.md for how to switch each placeholder to real.
 */

export type IntegrationsMode = 'local' | 'auto' | 'production';

export type Env = Record<string, string | undefined>;

export type PaymentProvider = 'stripe' | 'mock';

export interface ServiceReport {
  /** True when the service is wired to a real provider (or the real local Supabase stack). */
  connected: boolean;
  /** Human label for the admin/setup page. */
  detail: string;
  /** The exact env keys that flip this service to real mode. */
  envKeys: string[];
  /** Anchor in INTEGRATIONS.md. */
  guide: string;
}

export interface IntegrationsStatus {
  mode: IntegrationsMode;
  supabase: ServiceReport & { local: boolean };
  googleAuth: ServiceReport;
  appleAuth: ServiceReport & { available: boolean };
  payments: ServiceReport & { provider: PaymentProvider };
  push: ServiceReport;
  hosting: ServiceReport;
  appLinks: ServiceReport;
}

function truthy(v: string | undefined): boolean {
  return v != null && v !== '' && v !== 'false' && v !== '0';
}

function pick(env: Env, ...keys: string[]): string | undefined {
  for (const k of keys) {
    if (truthy(env[k])) return env[k];
  }
  return undefined;
}

function isLocalUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|kong:8000|host\.docker\.internal/.test(url);
}

export function resolveMode(env: Env): IntegrationsMode {
  const raw = (env.INTEGRATIONS_MODE || 'auto').toLowerCase();
  if (raw === 'local' || raw === 'production') return raw;
  return 'auto';
}

export function resolveIntegrations(env: Env): IntegrationsStatus {
  const mode = resolveMode(env);
  const forceLocal = mode === 'local';

  const supabaseUrl = pick(
    env,
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_URL',
  );
  const supabaseAnon = pick(
    env,
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  );
  const supabaseLocal = isLocalUrl(supabaseUrl);
  const supabaseReady = Boolean(supabaseUrl && supabaseAnon);

  // Google button is ALWAYS visible; this only decides real OAuth vs dev sign-in.
  const googleReal =
    !forceLocal &&
    truthy(pick(env, 'NEXT_PUBLIC_GOOGLE_AUTH_ENABLED', 'EXPO_PUBLIC_GOOGLE_AUTH_ENABLED'));

  const appleReal =
    !forceLocal &&
    truthy(pick(env, 'EXPO_PUBLIC_APPLE_AUTH_ENABLED'));

  const stripePublishable = pick(
    env,
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  );
  const stripeSecret = pick(env, 'STRIPE_SECRET_KEY'); // server-only, present in Edge Function env
  const paymentsReal = !forceLocal && Boolean(stripePublishable || stripeSecret);
  const provider: PaymentProvider = paymentsReal ? 'stripe' : 'mock';

  const easProjectId = pick(env, 'EXPO_PUBLIC_EAS_PROJECT_ID');
  const pushReal = !forceLocal && truthy(easProjectId);

  const hostingReal = !forceLocal && truthy(pick(env, 'NETLIFY', 'DEPLOY_URL', 'URL'));

  return {
    mode,
    supabase: {
      connected: supabaseReady,
      local: supabaseLocal,
      detail: supabaseReady
        ? supabaseLocal
          ? 'Local Supabase stack (real Postgres/Auth/Realtime/Storage via Docker)'
          : 'Hosted Supabase project'
        : 'Not configured — run `pnpm setup:local`',
      envKeys: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
      guide: '#1-supabase-cloud',
    },
    googleAuth: {
      connected: googleReal,
      detail: googleReal
        ? 'Supabase Google provider'
        : 'Dev sign-in (seeded users / magic link via local mailbox)',
      envKeys: ['NEXT_PUBLIC_GOOGLE_AUTH_ENABLED', 'EXPO_PUBLIC_GOOGLE_AUTH_ENABLED'],
      guide: '#2-google-oauth',
    },
    appleAuth: {
      connected: appleReal,
      available: appleReal,
      detail: appleReal ? 'Supabase Apple provider (iOS)' : 'Hidden until Apple keys are set',
      envKeys: ['EXPO_PUBLIC_APPLE_AUTH_ENABLED'],
      guide: '#3-apple-sign-in',
    },
    payments: {
      connected: paymentsReal,
      provider,
      detail: paymentsReal
        ? 'Stripe (NZD) — Payment Element / Payment Sheet, server-confirmed'
        : 'Mock payment provider — "Test payment, no real money"',
      envKeys: [
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      ],
      guide: '#4-stripe',
    },
    push: {
      connected: pushReal,
      detail: pushReal
        ? 'Expo push notifications (EAS)'
        : 'In-app realtime banner/toast (no push tokens registered)',
      envKeys: ['EXPO_PUBLIC_EAS_PROJECT_ID'],
      guide: '#5-expo-push--eas',
    },
    hosting: {
      connected: hostingReal,
      detail: hostingReal ? 'Netlify' : 'localhost only',
      envKeys: ['NETLIFY'],
      guide: '#6-netlify-hosting',
    },
    appLinks: {
      connected: false, // flipped by config.storeLinks, see admin/setup
      detail: 'Store URLs are "#" placeholders ("Coming soon")',
      envKeys: [],
      guide: '#8-app-store-links',
    },
  };
}

/** Flat list for the admin/setup page. */
export function integrationRows(status: IntegrationsStatus) {
  return [
    { key: 'Database / Auth / Realtime / Storage', report: status.supabase },
    { key: 'Google sign-in', report: status.googleAuth },
    { key: 'Sign in with Apple (iOS)', report: status.appleAuth },
    { key: 'Payments', report: status.payments },
    { key: 'Push notifications', report: status.push },
    { key: 'Hosting', report: status.hosting },
    { key: 'App store links', report: status.appLinks },
  ];
}

/**
 * Safety guard: in production builds, refuse to start with mock payments or dev
 * sign-in. Call this at app/server startup. Throws a descriptive error.
 */
export function assertProductionSafe(status: IntegrationsStatus): void {
  if (status.mode !== 'production') return;
  const problems: string[] = [];
  if (status.payments.provider === 'mock') {
    problems.push('mock payments are enabled (set STRIPE_SECRET_KEY and the publishable key)');
  }
  if (!status.googleAuth.connected) {
    problems.push('dev sign-in is active (enable the Supabase Google provider and set *_GOOGLE_AUTH_ENABLED=true)');
  }
  if (status.supabase.local) {
    problems.push('Supabase is pointed at a local stack (set hosted SUPABASE_URL/keys)');
  }
  if (problems.length > 0) {
    throw new Error(
      `[Darjeeling Momo] Refusing to start in production mode with placeholders:\n - ${problems.join(
        '\n - ',
      )}\nFix these or unset INTEGRATIONS_MODE=production. See INTEGRATIONS.md.`,
    );
  }
}
