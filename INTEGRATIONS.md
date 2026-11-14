# Switching placeholders to real services

Everything runs locally and free today. Each external service runs in **real mode when its keys are present** and **local placeholder mode when they're missing**. Work through these in any order; the `/admin/setup` page shows live status (✅ Connected / 🟡 Placeholder) and links back to each section here.

> Golden rule: never commit real keys. Put them in `.env.local` (web), `.env` (mobile), the Supabase/Netlify dashboards, or GitHub Actions secrets. The committed `.env.example` files list every variable.

**How the switch works**
- `INTEGRATIONS_MODE=auto` (default): a service goes real as soon as its keys exist.
- `INTEGRATIONS_MODE=local`: forces placeholders everywhere.
- `INTEGRATIONS_MODE=production`: the app **refuses to start** if mock payments or dev sign-in are still active (safety guard).

---

## 1. Supabase cloud

**What you need:** a free Supabase account (upgrade production to Pro before launch — free projects pause after a week idle).

1. Create **two** projects at https://supabase.com/dashboard — `darjeeling-dev` and `darjeeling-prod`. Choose region **Sydney (ap-southeast-2)** (closest to Auckland).
2. Get the API keys: Project Settings → API. Copy the **Project URL**, the **anon public** key, and the **service_role** key.
3. Link the CLI and push schema + functions:
   ```bash
   pnpm exec supabase link --project-ref <your-project-ref>
   pnpm exec supabase db push          # applies supabase/migrations
   pnpm exec supabase functions deploy # deploys supabase/functions
   ```
   (The seed is local-only. Enter real menu data via `/admin/menu`.)
4. Set env:
   - **Web** (`apps/web/.env.local` or Netlify): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
   - **Mobile** (`apps/mobile/.env` or EAS): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
5. Create the first staff/admin: sign in once with Google (below), then in Supabase → Table editor → `profiles`, set your row's `role` to `admin`.
6. **Test:** load the site against the hosted URL; the menu loads; `/admin/setup` shows Supabase ✅ Connected (hosted).

**Keys:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (+ the `NEXT_PUBLIC_`/`EXPO_PUBLIC_` variants).

---

## 2. Google OAuth

**What you need:** a Google Cloud project (free).

1. https://console.cloud.google.com → APIs & Services → Credentials.
2. Configure the OAuth consent screen (External, add your email as a test user).
3. Create OAuth client IDs:
   - **Web application** — Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
   - **iOS** and **Android** client IDs (for the native apps).
4. In Supabase → Authentication → Providers → **Google**: enable it, paste the **Web client ID** and **secret**. Add the iOS/Android client IDs under "Authorized Client IDs".
5. Flip the flags so the UI does real OAuth instead of the dev screen:
   - Web: `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`
   - Mobile: `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true`
6. **Test:** click "Continue with Google" → real Google flow → you're signed in. `/admin/setup` shows Google ✅.

**Keys:** `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`, `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED` (+ provider config in the Supabase dashboard).

---

## 3. Apple sign-in

Required by **App Store Review Guideline 4.8** because the app offers Google sign-in. iOS only.

**What you need:** an Apple Developer account (US$99/yr).

1. Apple Developer → Certificates, Identifiers & Profiles → enable **Sign in with Apple** for your App ID (`nz.co.darjeelingmomo.app`).
2. Create a **Services ID** and a **Sign in with Apple key**; note the Team ID, Key ID and Services ID.
3. In Supabase → Authentication → Providers → **Apple**: enable and fill those in. Redirect: `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Flip the flag: `EXPO_PUBLIC_APPLE_AUTH_ENABLED=true` (shows the Apple button on iOS, and adds the `expo-apple-authentication` plugin).
5. Rebuild the iOS app with EAS (native capability change).
6. **Test:** on iOS, "Continue with Apple" signs you in.

**Keys:** `EXPO_PUBLIC_APPLE_AUTH_ENABLED` (+ provider config in Supabase).

---

## 4. Stripe

**What you need:** a Stripe account (free; test mode first). All amounts are NZD.

1. https://dashboard.stripe.com → Developers → API keys. Copy the **Secret key** (`sk_test_…`) and **Publishable key** (`pk_test_…`).
2. Put the **secret** only where the server can see it:
   - Local functions: `supabase/functions/.env` → `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`.
   - Hosted: `pnpm exec supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_PUBLISHABLE_KEY=pk_test_...`
3. Put the **publishable** key in the clients:
   - Web: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Mobile: `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. **Webhook** → the same Edge Function that mock mode uses (`payment-webhook`):
   - Local: `pnpm exec stripe listen --forward-to localhost:54321/functions/v1/payment-webhook` → copy the `whsec_…` into `supabase/functions/.env` as `STRIPE_WEBHOOK_SECRET`.
   - Hosted: Dashboard → Developers → Webhooks → add endpoint `https://<project-ref>.functions.supabase.co/payment-webhook`, events `payment_intent.succeeded` and `payment_intent.payment_failed` → copy its signing secret into Supabase secrets as `STRIPE_WEBHOOK_SECRET`. Create one endpoint per environment.
5. Enable **Apple Pay / Google Pay** in the Stripe dashboard (payment methods).
6. **Mobile only:** Stripe's Payment Sheet is a native module — `pnpm --filter @darjeeling/mobile exec expo install @stripe/stripe-react-native` and build a **dev client** with EAS (it does not run in Expo Go).
7. **Test:** checkout now shows the real Payment Element (web) / Payment Sheet (mobile). Pay with test card `4242 4242 4242 4242`. The order is marked paid only when the webhook fires. `/admin/setup` shows Payments ✅ (stripe).

**Keys:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

Go live later: swap the `sk_test`/`pk_test` keys for live keys and re-create the webhook with live events.

---

## 5. Expo push & EAS

**What you need:** an Expo account (free) + EAS.

1. `pnpm --filter @darjeeling/mobile exec eas init` → creates an EAS project and prints its **project ID**.
2. Set `EXPO_PUBLIC_EAS_PROJECT_ID=<id>` (mobile env / EAS secrets). This enables push-token registration (`registerForPush`).
3. Build:
   ```bash
   eas build --profile development   # dev client
   eas build --profile preview       # TestFlight / Play internal track
   eas build --profile production     # store builds
   ```
4. Server-side sending of "Your order is ready" via Expo's push API can be added to a DB trigger / Edge Function on order status → `ready`, using the stored `push_tokens`. Until then the app shows the in-app realtime banner.
5. **Test:** install a dev/preview build, place an order, move it to Ready on the admin board → push arrives.

**Keys:** `EXPO_PUBLIC_EAS_PROJECT_ID`.

---

## 6. Netlify hosting

**What you need:** a Netlify account (Free plan allows commercial use — watch the monthly credit cap).

1. Connect the GitHub repo in Netlify. It reads `apps/web/netlify.toml` (base = repo root, builds only `@darjeeling/web`).
2. Set environment variables (Site settings → Environment): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and server-only `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. `INTEGRATIONS_MODE=production` is set for the production context in `netlify.toml`.
3. PRs get free deploy previews; `master` deploys to production.
4. **Keep credits low:** server logic lives in Supabase Edge Functions (not Netlify Functions); menu pages are static/cached; images come from Supabase Storage. Batch changes into fewer production deploys.
5. **Watch usage:** Netlify → Billing → Usage. When you regularly approach the Free cap, move to the **Personal** plan.

**Keys:** set in Netlify env (same names as web `.env`).

---

## 7. Custom domain

1. Buy a domain (e.g. a `.co.nz` from a NZ registrar).
2. Netlify → Domain management → add your domain; follow the DNS instructions (or use Netlify DNS). HTTPS is automatic.
3. Update Supabase Auth → URL configuration: set **Site URL** and **Redirect URLs** to your domain (and the mobile deep link `darjeelingmomo://auth/callback`).

---

## 8. App Store links

Until the apps are published, store buttons show **"Coming soon"** (URLs are `#` in `packages/shared/src/config.ts`).

1. Publish via `eas submit --profile production` (App Store Connect / Google Play Console).
2. Put the real URLs in `storeLinks` in `packages/shared/src/config.ts`:
   ```ts
   export const storeLinks = {
     ios: 'https://apps.apple.com/nz/app/....',
     android: 'https://play.google.com/store/apps/details?id=nz.co.darjeelingmomo.app',
     ...
   }
   ```
3. The footer/home buttons and the "Open in app" banner light up automatically.

---

## Renaming the business

The working name lives in **one** place: `NEXT_PUBLIC_APP_NAME` / `EXPO_PUBLIC_APP_NAME` (default in `packages/shared/src/config.ts`). Change it there — no code changes.

## Deployment checklist (summary)

- [ ] Supabase dev + prod projects created (Sydney), migrations & functions pushed (§1)
- [ ] Google OAuth configured, flags on (§2)
- [ ] Apple sign-in configured, iOS rebuilt (§3)
- [ ] Stripe keys + webhook per environment, test payment passes (§4)
- [ ] EAS project, push enabled, dev/preview/production builds (§5)
- [ ] Netlify connected, env set, credits monitored (§6)
- [ ] Custom domain + auth URLs (§7)
- [ ] Apps submitted, store URLs added (§8)
- [ ] Production: `INTEGRATIONS_MODE=production` and `/admin/setup` all ✅
- [ ] Privacy policy & terms filled in (`/legal/*`)
