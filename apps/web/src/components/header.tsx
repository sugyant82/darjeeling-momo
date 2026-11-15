'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, User } from 'lucide-react';
import { appName } from '@/lib/env';
import { useCart } from './cart-context';
import { useAuth } from './auth-context';
import { BrandLockup } from './brand';
import { FlagStripe } from './ui';

export function Header() {
  const { count } = useCart();
  const { user, isStaff } = useAuth();
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="site-header">
      <div className="site-header-bar">
        <div className="container">
          <Link href="/" className="header-brand" aria-label={`${appName} home`}>
            <BrandLockup variant="navy" compact />
          </Link>
          <div className="spacer" />
          <nav className="header-nav" aria-label="Primary">
            <Link
              href="/menu"
              className={`nav-link${isActive('/menu') ? ' is-active' : ''}`}
              aria-current={isActive('/menu') ? 'page' : undefined}
            >
              Menu
            </Link>
            {isStaff ? (
              <Link
                href="/admin"
                className={`nav-link${isActive('/admin') ? ' is-active' : ''}`}
                aria-current={isActive('/admin') ? 'page' : undefined}
              >
                Admin
              </Link>
            ) : null}
            <Link
              href="/account"
              className={`nav-icon${isActive('/account') ? ' is-active' : ''}`}
              aria-label={user ? 'Your account' : 'Sign in'}
            >
              <User size={20} aria-hidden="true" />
            </Link>
            <Link
              href="/cart"
              className={`nav-icon${isActive('/cart') ? ' is-active' : ''}`}
              aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
            >
              <ShoppingBag size={20} aria-hidden="true" />
              {/* Keyed on count so the badge re-mounts and pops whenever the cart changes. */}
              {count > 0 ? (
                <span key={count} className="cart-badge">
                  {count}
                </span>
              ) : null}
            </Link>
          </nav>
        </div>
      </div>
      <FlagStripe />
    </header>
  );
}
