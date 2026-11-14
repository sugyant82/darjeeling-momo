import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container">
      <div className="card card-pad text-center stack" style={{ alignItems: 'center' }}>
        <h1>Page not found</h1>
        <p className="muted">That page has gone cold. Let&apos;s get you back to the momos.</p>
        <Link href="/" className="btn btn-action">
          Back home
        </Link>
      </div>
    </div>
  );
}
