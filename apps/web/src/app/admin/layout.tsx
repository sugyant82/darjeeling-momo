'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-context';
import { SignIn } from '@/components/sign-in';
import { Spinner } from '@/components/ui';

const NAV = [
  { href: '/admin', label: 'Orders' },
  { href: '/admin/menu', label: 'Menu' },
  { href: '/admin/schedule', label: 'Schedule' },
  { href: '/admin/sales', label: 'Sales' },
  { href: '/admin/setup', label: 'Setup' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, isStaff } = useAuth();

  // The integration status page is open to everyone.
  const isSetup = pathname === '/admin/setup';

  const nav = (
    <nav className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 16 }} aria-label="Admin">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`btn ${pathname === n.href ? 'btn-primary' : 'btn-outline'}`}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );

  if (isSetup) {
    return (
      <div className="container stack">
        {nav}
        {children}
      </div>
    );
  }

  if (loading) return <Spinner />;

  if (!isStaff) {
    return (
      <div className="container stack">
        <div className="banner banner-warn">
          Staff access required. Sign in with a staff or admin account.
        </div>
        <Suspense fallback={null}>
          <SignIn next={pathname} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="container stack">
      {nav}
      {children}
    </div>
  );
}
