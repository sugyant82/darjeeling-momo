'use client';

import { formatNZD } from '@darjeeling/shared';
import { useTodaySales } from '@/hooks/queries';
import { Spinner, ErrorState } from '@/components/ui';

export default function SalesPage() {
  const { data, isLoading, isError, refetch } = useTodaySales(true);

  if (isLoading) return <Spinner />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="stack">
      <h1>Today&apos;s sales</h1>
      <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
        <div className="card card-pad stack" style={{ flex: 1, minWidth: 160 }}>
          <span className="muted">Paid orders</span>
          <strong style={{ fontSize: 32 }}>{data.orderCount}</strong>
        </div>
        <div className="card card-pad stack" style={{ flex: 1, minWidth: 160 }}>
          <span className="muted">Revenue</span>
          <strong style={{ fontSize: 32 }}>{formatNZD(data.revenueCents)}</strong>
        </div>
      </div>

      <section className="card card-pad stack">
        <h2>Top items</h2>
        {data.topItems.length === 0 ? (
          <span className="muted">No sales yet today.</span>
        ) : (
          data.topItems.map((t) => (
            <div key={t.name} className="row" style={{ justifyContent: 'space-between' }}>
              <span>{t.name}</span>
              <strong>{t.quantity}</strong>
            </div>
          ))
        )}
      </section>
      <button className="btn btn-outline" onClick={() => refetch()}>
        Refresh
      </button>
    </div>
  );
}
