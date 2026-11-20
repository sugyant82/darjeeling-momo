'use client';

import { useSyncExternalStore } from 'react';
import { Apple, Smartphone, X } from 'lucide-react';
import { storeLinks } from '@darjeeling/shared';
import { useT } from '@/lib/i18n';

const DISMISS_KEY = 'dm_app_banner_dismissed';

export function StoreButtons({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const comingSoon = !storeLinks.appsLive;
  const { t } = useT();
  return (
    <div className={`store-buttons${tone === 'dark' ? ' store-buttons-dark' : ''}`}>
      <a
        className="btn btn-outline"
        href={storeLinks.ios}
        aria-disabled={comingSoon}
        onClick={(e) => comingSoon && e.preventDefault()}
      >
        <Apple size={18} aria-hidden="true" /> {t('app.appStore')}
        {comingSoon ? <span className="muted">· {t('app.comingSoon')}</span> : null}
      </a>
      <a
        className="btn btn-outline"
        href={storeLinks.android}
        aria-disabled={comingSoon}
        onClick={(e) => comingSoon && e.preventDefault()}
      >
        <Smartphone size={18} aria-hidden="true" /> {t('app.googlePlay')}
        {comingSoon ? <span className="muted">· {t('app.comingSoon')}</span> : null}
      </a>
    </div>
  );
}

/**
 * Tiny external store for the banner's visibility, so it can be read with
 * useSyncExternalStore: SSR-safe (server snapshot is `false`) and no setState-in-effect.
 */
const listeners = new Set<() => void>();
let dismissedThisSession = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readShowBanner(): boolean {
  if (dismissedThisSession) return false;
  try {
    if (window.localStorage.getItem(DISMISS_KEY) === '1') return false;
  } catch {
    /* storage unavailable: still offer the banner this session */
  }
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function dismissBanner() {
  dismissedThisSession = true;
  try {
    window.localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
  for (const notify of listeners) notify();
}

/** Dismissible "Open in app" banner shown only on mobile browsers. */
export function OpenInAppBanner() {
  const show = useSyncExternalStore(subscribe, readShowBanner, () => false);
  const { t } = useT();
  if (!show) return null;

  return (
    <div className="banner banner-warn row" style={{ margin: '12px 0' }}>
      <span style={{ flex: 1 }}>{t('app.bannerText')}</span>
      <StoreButtons />
      <button className="btn btn-ghost" aria-label={t('app.dismiss')} onClick={dismissBanner}>
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
