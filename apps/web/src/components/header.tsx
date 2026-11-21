'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, User } from 'lucide-react';
import { appName } from '@/lib/env';
import { useT } from '@/lib/i18n';
import { useCart } from './cart-context';
import { useAuth } from './auth-context';
import { BrandLockup } from './brand';
import { LangThemeControls } from './lang-theme-controls';
import { MobileNav } from './mobile-nav';
import { FlagStripe } from './ui';

export function Header() {
  const { count } = useCart();
  const { user, isStaff } = useAuth();
  const { t } = useT();
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="site-header">
      <div className="site-header-bar">
        <div className="container">
          <Link href="/" className="header-brand" aria-label={t('a11y.homeLink', { app: appName })}>
            {/* The wordmark uses the cream-on-navy variant in both themes (the bar is always indigo). */}
            <BrandLockup variant="navy" compact />
          </Link>
          <div className="spacer" />
          <nav className="header-nav" aria-label={t('nav.primary')}>
            <Link
              href="/menu"
              className={`nav-link${isActive('/menu') ? ' is-active' : ''}`}
              aria-current={isActive('/menu') ? 'page' : undefined}
            >
              {t('nav.menu')}
            </Link>
            {isStaff ? (
              <Link
                href="/admin"
                className={`nav-link${isActive('/admin') ? ' is-active' : ''}`}
                aria-current={isActive('/admin') ? 'page' : undefined}
              >
                {t('nav.admin')}
              </Link>
            ) : null}
            <Link
              href="/account"
              className={`nav-icon${isActive('/account') ? ' is-active' : ''}`}
              aria-label={user ? t('a11y.account') : t('a11y.signin')}
            >
              <User size={20} aria-hidden="true" />
            </Link>
            <Link
              href="/cart"
              className={`nav-icon${isActive('/cart') ? ' is-active' : ''}`}
              aria-label={t('a11y.cart', { count })}
            >
              <ShoppingBag size={20} aria-hidden="true" />
              {/* Keyed on count so the badge re-mounts and pops whenever the cart changes. */}
              {count > 0 ? (
                <span key={count} className="cart-badge">
                  {count}
                </span>
              ) : null}
            </Link>
            <LangThemeControls />
          </nav>
          <MobileNav />
        </div>
      </div>
      <FlagStripe />
    </header>
  );
}
