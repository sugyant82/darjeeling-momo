'use client';

import Link from 'next/link';
import { ShoppingBag, User } from 'lucide-react';
import { appName } from '@/lib/env';
import { useCart } from './cart-context';
import { useAuth } from './auth-context';
import { FlagStripe } from './ui';

export function Header() {
  const { count } = useCart();
  const { user, isStaff } = useAuth();

  return (
    <header>
      <div className="site-header">
        <div className="container">
          <Link href="/" className="brand-wordmark" aria-label={`${appName} home`}>
            {appName}
          </Link>
          <div className="spacer" />
          <nav className="row" aria-label="Primary" style={{ gap: 4 }}>
            <Link href="/menu" className="btn btn-ghost" style={{ color: '#fff' }}>
              Menu
            </Link>
            {isStaff ? (
              <Link href="/admin" className="btn btn-ghost" style={{ color: '#fff' }}>
                Admin
              </Link>
            ) : null}
            <Link
              href="/account"
              className="btn btn-ghost"
              style={{ color: '#fff' }}
              aria-label={user ? 'Your account' : 'Sign in'}
            >
              <User size={20} aria-hidden="true" />
            </Link>
            <Link
              href="/cart"
              className="btn btn-ghost row"
              style={{ color: '#fff' }}
              aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
            >
              <ShoppingBag size={20} aria-hidden="true" />
              {count > 0 ? <span className="cart-badge">{count}</span> : null}
            </Link>
          </nav>
        </div>
      </div>
      <FlagStripe />
    </header>
  );
}
