# Darjeeling Momo

Digital ordering platform for a Himalayan momo food truck in South Auckland: a mobile-first **website** and a **React Native app** (iOS + Android), sharing one Supabase backend. Customers sign in with Google, browse the menu, build a cart, order for pickup and pay online. Staff run a live orders board, menu manager and schedule from `/admin`.

> **"Darjeeling Momo" is a working name.** It lives in one config value (`NEXT_PUBLIC_APP_NAME` / `EXPO_PUBLIC_APP_NAME`, default in `packages/shared/src/config.ts`) so it can be renamed in one place.

**New machine?** Go straight to [Setting up on another workstation](#setting-up-on-another-workstation).

Everything runs **locally and free** today. Each external service (Supabase, Google, Apple, Stripe, Expo push, Netlify) has a working local placeholder and flips to real mode the moment you add keys — see **[INTEGRATIONS.md](./INTEGRATIONS.md)**.

---

## Prerequisites

Install these first:

- **Node** 22 LTS (22.13 or later — the Expo CLI crashes on Node 20; `.nvmrc` pins 22)
- **pnpm** 9 (`npm i -g pnpm`)
- **Git**
- **Docker Desktop** — only for the fully local backend (Option B below). Not needed with a hosted Supabase project.
- **Expo Go** on your phone (App Store / Play Store), on the same Wi-Fi as your computer

The Supabase CLI is a repo dependency — no global install needed.

---

## Setting up on another workstation

### 1. Clone and install

```bash
git clone https://github.com/sugyant82/darjeeling-momo.git
cd darjeeling-momo
nvm use            # or install Node 22 another way
npm i -g pnpm@9
pnpm install
```

Env files and `supabase/.temp/` are gitignored, so a fresh clone has no backend configured. Pick one of the two options below.

### 2. Option A — hosted Supabase (no Docker, works on small machines)

Use this to share one dev backend between machines, or when the machine can't run Docker (the local stack needs several GB of RAM).

**Connecting to the existing dev project** — you only need steps 1, 2 and 6. **Creating a new project** — do all of them.

1. Log the CLI in (opens a browser):
   ```bash
   pnpm exec supabase login
   ```
2. Link the repo to the project. The ref is the ID in the dashboard URL, `supabase.com/dashboard/project/<ref>`:
   ```bash
   pnpm exec supabase link --project-ref <ref>
   ```
3. Apply the schema:
   ```bash
   pnpm exec supabase db push --linked
   ```
4. Load the sample menu and the three test users. A hosted project is reachable from the internet, so **don't use the default `momo1234` password** — substitute your own first:
   ```bash
   sed "s/momo1234/<your-test-password>/g" supabase/seed.sql > /tmp/seed-hosted.sql
   pnpm exec supabase db query --linked -f /tmp/seed-hosted.sql
   rm /tmp/seed-hosted.sql
   ```
5. Deploy the Edge Functions (`--use-api` bundles server-side, no Docker):
   ```bash
   pnpm exec supabase functions deploy --use-api
   ```
6. Create the two env files. Get the URL and `anon` key from the dashboard (Project Settings → API) or `pnpm exec supabase projects api-keys --project-ref <ref>`.

   `apps/web/.env.local`:
   ```bash
   INTEGRATIONS_MODE=auto
   NEXT_PUBLIC_APP_NAME=Darjeeling Momo
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_DEV_PASSWORD=<your-test-password>
   ```

   `apps/mobile/.env` (`<lan-ip>` is this computer's Wi-Fi address, e.g. `ipconfig getifaddr en0` on macOS):
   ```bash
   EXPO_PUBLIC_INTEGRATIONS_MODE=auto
   EXPO_PUBLIC_APP_NAME=Darjeeling Momo
   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   EXPO_PUBLIC_WEB_ORIGIN=http://<lan-ip>:3000
   EXPO_PUBLIC_DEV_PASSWORD=<your-test-password>
   ```

   The `*_DEV_PASSWORD` values are what the one-tap dev sign-in buttons use; they must match the password you seeded in step 4. Ask whoever set up the existing project for it — it is not stored in the repo.
7. Start the apps. **Don't use `pnpm dev` here** — it tries to start local Supabase in Docker. Run each app in its own terminal:
   ```bash
   pnpm --filter @darjeeling/web dev      # http://localhost:3000
   pnpm --filter @darjeeling/mobile dev   # scan the QR with Expo Go
   ```

Notes for hosted mode:

- Magic-link emails are sent by Supabase for real (there is no local mailbox), and `.test` addresses can't receive them. Use the dev sign-in buttons.
- The first Expo bundle can take a minute or two on a slow machine. If Expo Go shows "Could not connect to development server" or sits on the splash screen, wait for `iOS Bundled …` in the terminal, then force-quit Expo Go and reopen the project.
- Expo Go must be signed in to the same Expo account as the CLI (`pnpm --filter @darjeeling/mobile exec expo login`).

### 2. Option B — fully local Supabase (Docker)

With Docker Desktop running, follow the [Quickstart](#quickstart) below: `pnpm setup:local` starts the stack, applies migrations, seeds it and writes both env files for you; `pnpm dev` then runs everything.

---

## Quickstart

These commands are the Docker path (Option B).

```bash
pnpm install          # install workspace deps
pnpm setup:local      # one-time: brand assets + local Supabase + migrations + seed + env files
pnpm dev              # start Supabase, Edge Functions, website and the Expo dev server
```

Then:

| What | Where |
|---|---|
| Website | http://localhost:3000 |
| Admin (staff/admin) | http://localhost:3000/admin |
| Integration status | http://localhost:3000/admin/setup |
| Supabase Studio | http://localhost:54323 |
| Local mailbox (magic links) | http://localhost:54324 |
| Mobile app | scan the Expo QR with **Expo Go** |

> First `pnpm setup:local` downloads Docker images — give it a few minutes.

### Dev sign-in (local only)

Google OAuth isn't configured locally, so **"Continue with Google"** opens a **dev sign-in** screen. Use a seeded account (password `momo1234` locally; on a hosted project, whatever you seeded and set in `NEXT_PUBLIC_DEV_PASSWORD` / `EXPO_PUBLIC_DEV_PASSWORD`) or a magic link (caught by the local mailbox at :54324):

| Role | Email |
|---|---|
| Customer | `customer@darjeeling.test` |
| Staff (truck) | `staff@darjeeling.test` |
| Admin (owner) | `admin@darjeeling.test` |

### Try the happy path

Browse → add momos → checkout → dev sign-in → **"Test payment"** (mock) → Pay → watch the order track live. Sign in as **staff** and the order appears on `/admin` instantly; tap to move it through Preparing → Ready → Collected.

---

## Monorepo layout

```
apps/
  web/        Next.js (App Router, TS) — Netlify
  mobile/     Expo (React Native, TS, Expo Router) — EAS
packages/
  shared/     types, Zod schemas, API client, price/GST + order-status logic, adapters
  tokens/     brand colours, fonts, spacing, radii
supabase/
  migrations/ schema + Row Level Security
  seed.sql    SAMPLE menu + 3 dev users (local only)
  functions/  Edge Functions: create-payment, confirm-mock-payment, payment-webhook, delete-account
brand/        canonical icons/logos/splash (copied from resources/)
scripts/      setup-local, dev, copy-brand, write-local-env
```

## Scripts

| Command | Does |
|---|---|
| `pnpm setup:local` | brand assets, start Supabase, migrate + seed, write local env |
| `pnpm dev` | everything for local dev (Supabase + functions + web + mobile) |
| `pnpm dev:web` / `pnpm dev:mobile` | just one app |
| `pnpm build` / `pnpm typecheck` / `pnpm lint` | across the workspace (Turborepo) |
| `pnpm test` | unit tests (pricing/GST, order-status, slots) |
| `pnpm test:e2e` | Playwright happy-path (web) in placeholder mode |
| `pnpm supabase:reset` | re-apply migrations + reseed the local DB |

## How the integration switch works

- `INTEGRATIONS_MODE=auto` (default): a service is real when its keys exist, else placeholder.
- `INTEGRATIONS_MODE=local`: force placeholders.
- `INTEGRATIONS_MODE=production`: **refuses to start** with mock payments or dev sign-in (safety guard).

The `/admin/setup` page shows each service as ✅ Connected or 🟡 Placeholder with the exact env keys needed. Full step-by-step switch-over: **[INTEGRATIONS.md](./INTEGRATIONS.md)**.

## Money & time

- All money is **integer cents (NZD)**; never floating-point. Prices are **GST-inclusive (15%)**; receipts show the GST content (`gst = total × 3/23`).
- All hours, slots and dates use **Pacific/Auckland**.

## Testing

```bash
pnpm test        # vitest units in packages/shared
pnpm test:e2e    # Playwright (needs `pnpm setup:local` + a running stack)
```

## Deploying

Target setup is written and ready; switch it on by adding keys (see INTEGRATIONS.md):

- **Backend:** Supabase (Sydney), separate dev/prod projects; `supabase db push` + `supabase functions deploy`. CI applies migrations on merge to `master`.
- **Web:** Netlify from GitHub (`netlify.toml` builds only `@darjeeling/web`). PRs get free deploy previews; `master` → production. Keep credits low (server logic in Edge Functions, static menu, images from Supabase Storage).
- **Mobile:** EAS Build (dev/preview/production in `eas.json`), EAS Submit to the stores, EAS Update for OTA JS fixes.
- **CI:** `.github/workflows/ci.yml` type-checks, lints and tests every PR.

## Store submission (summary)

1. `eas build --profile production` (iOS + Android).
2. `eas submit --profile production` → App Store Connect / Google Play Console.
3. Fill in store listings, privacy policy URL, and the account-deletion note (deletion is built in under Account).
4. After approval, put the real store URLs in `storeLinks` (`packages/shared/src/config.ts`).

## Troubleshooting

- **`TypeError: URL.parse is not a function` from `expo start`:** you're on Node 20. Switch to Node 22 (`nvm use`).
- **Sign-in fails with "Database error querying schema":** the `auth.users` rows were inserted with NULL token columns. Re-run the current `supabase/seed.sql`, which sets them.
- **Phone can't reach the backend:** `setup:local` points the mobile app at your machine's LAN IP. Phone and computer must share Wi-Fi. Re-run `pnpm env:local` if your IP changed.
- **Expo package version warnings:** run `pnpm --filter @darjeeling/mobile exec expo install --check` to align native packages to the installed Expo SDK, then re-run.
- **Supabase won't start:** make sure Docker Desktop is running; `pnpm supabase:stop` then `pnpm setup:local`.
- **Reset local data:** `pnpm supabase:reset` (re-applies migrations + reseeds the SAMPLE menu).
- **Stripe on mobile:** needs a dev build (EAS), not Expo Go — mock payments cover local testing.

## Replacing the sample data

The seeded menu is marked **SAMPLE**. Sign in as **admin**, open `/admin/menu`, and add your real categories, items, prices, photos and options; set the truck location and hours in `/admin/schedule`. Fill in `/legal/privacy` and `/legal/terms`.
