import Link from 'next/link';
import { appName } from '@/lib/env';
import { brand } from '@darjeeling/shared';
import { Tagline } from './brand';
import { StoreButtons } from './get-app';
import { FlagStripe } from './ui';

export function Footer() {
  return (
    <footer className="site-footer">
      <FlagStripe />
      <div className="container footer-main">
        <div className="footer-brand">
          <div className="footer-logo-card">
            {/* Navy logo, cropped above its baked-in tagline (set as live text below). 640px source for 2x screens. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-navy-footer.png"
              alt={`${appName} logo`}
              width={320}
              height={172}
              loading="lazy"
              decoding="async"
              className="footer-logo"
            />
          </div>
          <Tagline text={brand.tagline} className="footer-tagline" />
          <p className="footer-mihi">
            <strong lang="mi">Ngā mihi nui</strong> — thank you for backing a local food truck.
          </p>
        </div>

        <nav className="footer-col" aria-label="Footer">
          <h2 className="footer-heading">Explore</h2>
          <ul className="footer-links">
            <li>
              <Link href="/menu">Menu</Link>
            </li>
            <li>
              <Link href="/cart">Cart</Link>
            </li>
            <li>
              <Link href="/account">Account</Link>
            </li>
            <li>
              <Link href="/legal/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/legal/terms">Terms</Link>
            </li>
            <li>
              <Link href="/admin/setup">Integration status</Link>
            </li>
          </ul>
        </nav>

        <div className="footer-col">
          <h2 className="footer-heading">Get the app</h2>
          <p className="footer-note">Order faster and get a ping the moment your momos are ready.</p>
          <StoreButtons tone="dark" />
        </div>
      </div>

      <div className="container footer-bottom">
        <small>
          © {new Date().getFullYear()} {appName}. Sample data — not a real business yet.
        </small>
        <small>
          <span lang="mi">Ka kite anō</span> — see you at the truck!
        </small>
      </div>
    </footer>
  );
}
