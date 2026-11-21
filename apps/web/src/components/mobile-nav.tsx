'use client';

import { useEffect, useRef, useState, type FocusEvent } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, LayoutDashboard, Menu as MenuIcon, Moon, ShoppingBag, User, UtensilsCrossed, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { usePrefs } from './prefs-context';
import { useCart } from './cart-context';
import { useAuth } from './auth-context';
import { LANGS } from './lang-theme-controls';

/** At/above this width the full header nav shows (keep in sync with the 720px query in globals.css). */
const DESKTOP_QUERY = '(min-width: 720px)';

/**
 * Small-screen header: the cart stays in the bar (it's the key ordering action) and
 * everything else — Menu, Account, Admin, dark mode and language — folds into a ☰ panel
 * that drops down under the header. Hidden by CSS on wider screens.
 */
export function MobileNav() {
  const { t } = useT();
  const { theme, toggleTheme, lang, setLang } = usePrefs();
  const { count } = useCart();
  const { user, isStaff } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Navigating anywhere (links, back/forward) closes the panel: adjust state when the route
  // changes, during render, rather than in an effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    html.classList.add('mobile-nav-open'); // locks page scroll below 720px (CSS)
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    // Rotating / resizing past the breakpoint hides the panel, so close it too.
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onWide = () => {
      if (mq.matches) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onWide);
    return () => {
      html.classList.remove('mobile-nav-open');
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onWide);
    };
  }, [open]);

  // Close when keyboard focus moves somewhere outside the toggle/panel.
  const onBlur = (e: FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (!open || !next) return;
    if (rootRef.current?.contains(next) || panelRef.current?.contains(next)) return;
    setOpen(false);
  };

  const close = () => setOpen(false);
  const linkClass = (href: string) => `mobile-link${isActive(href) ? ' is-active' : ''}`;

  return (
    <div className="mobile-nav" ref={rootRef} onBlur={onBlur}>
      <Link
        href="/cart"
        className={`nav-icon${isActive('/cart') ? ' is-active' : ''}`}
        aria-label={t('a11y.cart', { count })}
      >
        <ShoppingBag size={20} aria-hidden="true" />
        {count > 0 ? (
          <span key={count} className="cart-badge">
            {count}
          </span>
        ) : null}
      </Link>
      <button
        ref={toggleRef}
        type="button"
        className="nav-icon nav-toggle"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? t('nav.closeNav') : t('nav.openNav')}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X size={22} aria-hidden="true" /> : <MenuIcon size={22} aria-hidden="true" />}
      </button>

      {open
        ? createPortal(
            <>
              <div className="mobile-backdrop" onClick={close} aria-hidden="true" />
              <div id="mobile-nav-panel" ref={panelRef} className="mobile-panel">
                <nav aria-label={t('nav.primary')}>
                  <ul className="mobile-links">
                    <li>
                      <Link
                        href="/menu"
                        className={linkClass('/menu')}
                        aria-current={isActive('/menu') ? 'page' : undefined}
                        onClick={close}
                      >
                        <UtensilsCrossed size={20} aria-hidden="true" />
                        {t('nav.menu')}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/account"
                        className={linkClass('/account')}
                        aria-current={isActive('/account') ? 'page' : undefined}
                        onClick={close}
                      >
                        <User size={20} aria-hidden="true" />
                        {user ? t('a11y.account') : t('a11y.signin')}
                      </Link>
                    </li>
                    {isStaff ? (
                      <li>
                        <Link
                          href="/admin"
                          className={linkClass('/admin')}
                          aria-current={isActive('/admin') ? 'page' : undefined}
                          onClick={close}
                        >
                          <LayoutDashboard size={20} aria-hidden="true" />
                          {t('nav.admin')}
                        </Link>
                      </li>
                    ) : null}
                  </ul>
                </nav>

                <p className="mobile-section-label">{t('nav.preferences')}</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme === 'dark'}
                  className="mobile-pref"
                  onClick={toggleTheme}
                >
                  <Moon size={20} aria-hidden="true" />
                  <span>{t('theme.dark')}</span>
                  <span className="switch" aria-hidden="true">
                    <span className="switch-thumb" />
                  </span>
                </button>
                <div className="mobile-langs" role="group" aria-label={t('lang.label')}>
                  {LANGS.map(({ code, Flag, labelKey }) => (
                    <button
                      key={code}
                      type="button"
                      aria-pressed={lang === code}
                      className={`lang-option${lang === code ? ' is-active' : ''}`}
                      onClick={() => setLang(code)}
                    >
                      <Flag size={22} />
                      <span>{t(labelKey)}</span>
                      {lang === code ? <Check size={16} aria-hidden="true" className="lang-check" /> : null}
                    </button>
                  ))}
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
