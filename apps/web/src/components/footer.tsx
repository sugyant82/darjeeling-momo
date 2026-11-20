'use client';

import Link from 'next/link';
import { appName } from '@/lib/env';
import { useT, useVenue } from '@/lib/i18n';
import { Tagline } from './brand';
import { StoreButtons } from './get-app';
import { FlagStripe } from './ui';

export function Footer() {
  const { t } = useT();
  const { noun: venue } = useVenue();
  return (
    <footer className="site-footer">
      <FlagStripe />
      <div className="container footer-main">
        <div className="footer-brand">
          <div className="footer-logo-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-navy-footer.png"
              alt={t('a11y.homeLink', { app: appName })}
              width={320}
              height={172}
              loading="lazy"
              decoding="async"
              className="footer-logo"
            />
          </div>
          <Tagline text={t('brand.tagline')} className="footer-tagline" />
          <p className="footer-mihi">
            <strong>{t('greet.thanksBig')}</strong> — {t('footer.mihi', { venue })}
          </p>
        </div>

        <nav className="footer-col" aria-label={t('footer.explore')}>
          <h2 className="footer-heading">{t('footer.explore')}</h2>
          <ul className="footer-links">
            <li>
              <Link href="/menu">{t('nav.menu')}</Link>
            </li>
            <li>
              <Link href="/cart">{t('footer.cart')}</Link>
            </li>
            <li>
              <Link href="/account">{t('footer.account')}</Link>
            </li>
            <li>
              <Link href="/legal/privacy">{t('footer.privacy')}</Link>
            </li>
            <li>
              <Link href="/legal/terms">{t('footer.terms')}</Link>
            </li>
            <li>
              <Link href="/admin/setup">{t('footer.integration')}</Link>
            </li>
          </ul>
        </nav>

        <div className="footer-col">
          <h2 className="footer-heading">{t('footer.getApp')}</h2>
          <p className="footer-note">{t('footer.getAppNote')}</p>
          <StoreButtons tone="dark" />
        </div>
      </div>

      <div className="container footer-bottom">
        <small>{t('footer.rights', { year: new Date().getFullYear(), app: appName })}</small>
        <small>
          <span>{t('greet.farewell')}</span> — {t('footer.seeYou', { venue })}
        </small>
      </div>
    </footer>
  );
}
