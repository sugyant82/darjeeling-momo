import Link from 'next/link';
import { Koru } from '@/components/brand';

export default function NotFound() {
  return (
    <div className="container">
      <div className="card card-pad text-center stack not-found">
        <Koru className="not-found-koru" />
        <p className="kicker">
          <span lang="mi">Auē!</span>
        </p>
        <h1>Page not found</h1>
        <p className="muted">That page has gone cold. Let&apos;s get you back to the momos.</p>
        <Link href="/" className="btn btn-action">
          Back home
        </Link>
      </div>
    </div>
  );
}
