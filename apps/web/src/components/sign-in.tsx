'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { DEV_USERS, devSignIn, devMagicLink, signInWithGoogle } from '@darjeeling/shared';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { devPassword, integrations } from '@/lib/env';
import { useT } from '@/lib/i18n';
import { useToast } from './toast-context';

export function SignIn({ next = '/account' }: { next?: string }) {
  const { t } = useT();
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const target = params.get('next') ?? next;

  const googleReal = integrations.googleAuth.connected;
  const [showDev, setShowDev] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleGoogle() {
    if (googleReal) {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`;
      try {
        // signInWithGoogle uses skipBrowserRedirect (for the mobile deep-link flow),
        // so on web we navigate to the returned OAuth URL ourselves.
        const data = await signInWithGoogle(supabase, redirectTo);
        if (data?.url) window.location.assign(data.url);
      } catch {
        toast.show(t('signin.googleFailed'), 'error');
      }
    } else {
      setShowDev(true);
    }
  }

  async function handleDevUser(userEmail: string) {
    setBusy(true);
    try {
      await devSignIn(supabase, userEmail, devPassword);
      toast.show(t('greet.kiaora'), 'success');
      router.push(target);
      router.refresh();
    } catch {
      toast.show(t('signin.devFailed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    if (!email) return;
    setBusy(true);
    try {
      await devMagicLink(supabase, email, `${window.location.origin}/auth/callback`);
      toast.show(t('signin.magicSent'), 'success');
    } catch {
      toast.show(t('signin.magicFailed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-pad stack" style={{ maxWidth: 440, margin: '0 auto' }}>
      <h1>{t('signin.title')}</h1>
      <p className="muted">{t('signin.subtitle')}</p>

      <button className="btn btn-primary btn-lg btn-block" onClick={handleGoogle} disabled={busy}>
        <LogIn size={18} aria-hidden="true" /> {t('signin.google')}
      </button>

      {!googleReal && showDev ? (
        <div className="stack" style={{ marginTop: 8 }}>
          <div className="banner banner-warn">
            <strong>Dev sign-in — local only.</strong> Google OAuth isn&apos;t configured, so pick a
            seeded account or use a magic link.
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {DEV_USERS.map((u) => (
              <button
                key={u.role}
                className="btn btn-outline btn-block"
                onClick={() => handleDevUser(u.email)}
                disabled={busy}
              >
                {t('signin.signInAs', { label: u.label })}
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="magic-email">{t('signin.orMagic')}</label>
            <input
              id="magic-email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button className="btn btn-action btn-block" onClick={handleMagicLink} disabled={busy || !email}>
            {t('signin.sendMagic')}
          </button>
          <small className="muted">
            Magic links appear in the local mailbox at http://localhost:54324
          </small>
        </div>
      ) : null}
    </div>
  );
}
