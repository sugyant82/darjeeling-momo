import Link from 'next/link';
import { appName } from '@/lib/env';
import { brand } from '@darjeeling/shared';
import { StoreButtons } from './get-app';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container stack">
        <div className="brand-wordmark" style={{ fontSize: 24 }}>
          {appName}
        </div>
        <p style={{ color: 'var(--color-cream)', opacity: 0.85 }}>{brand.tagline}</p>

        <div className="stack" style={{ gap: 8 }}>
          <strong>Get the app</strong>
          <StoreButtons />
        </div>

        <nav className="row" style={{ gap: 20, flexWrap: 'wrap' }} aria-label="Footer">
          <Link href="/menu">Menu</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/admin/setup">Integration status</Link>
        </nav>
        <small style={{ opacity: 0.7 }}>
          © {new Date().getFullYear()} {appName}. Sample data — not a real business yet.
        </small>
      </div>
    </footer>
  );
}
