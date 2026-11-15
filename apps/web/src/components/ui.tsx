import type { ReactNode } from 'react';
import { flagStripe } from '@darjeeling/tokens';
import { STATUS_COLOR, STATUS_LABEL, type OrderStatus } from '@darjeeling/shared';
import type { Tag } from '@darjeeling/shared/types';

export function FlagStripe() {
  return (
    <div className="flag-stripe" aria-hidden="true">
      {flagStripe.map((c, i) => (
        <span key={i} style={{ background: c }} />
      ))}
    </div>
  );
}

/** Page title with an optional small kicker line above it (used for te reo Māori labels). */
export function PageHeading({
  kicker,
  title,
  children,
}: {
  kicker?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-head">
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <h1>{title}</h1>
      {children}
    </div>
  );
}

export function TagBadge({ tag }: { tag: Tag | string }) {
  const label = tag === 'veg' ? 'Veg' : tag === 'spicy' ? 'Spicy' : 'Bestseller';
  return <span className={`tag tag-${tag}`}>{label}</span>;
}

const STATUS_HEX: Record<string, string> = {
  indigo: '#1F2A44',
  marigold: '#E8A33D',
  achar: '#C2412D',
  tealeaf: '#3E6B48',
  muted: '#4A5168',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const token = STATUS_COLOR[status];
  const bg = STATUS_HEX[token] ?? '#1F2A44';
  const color = token === 'marigold' ? '#1F2A44' : '#FFFFFF';
  return (
    <span className="status-badge" style={{ background: bg, color }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="text-center muted" role="status" style={{ padding: '32px 0' }}>
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card card-pad text-center stack" style={{ alignItems: 'center' }}>
      <h3>{title}</h3>
      {message ? <p className="muted">{message}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="banner banner-error stack" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <button className="btn btn-outline" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card card-pad stack" aria-hidden="true">
      <div className="skeleton" style={{ height: 140 }} />
      <div className="skeleton" style={{ height: 20, width: '60%' }} />
      <div className="skeleton" style={{ height: 16, width: '90%' }} />
      <div className="skeleton" style={{ height: 40, width: '100%' }} />
    </div>
  );
}
