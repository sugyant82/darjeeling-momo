'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import {
  CUSTOMER_STEPS,
  STATUS_LABEL,
  formatNZD,
  formatSlotTime,
  statusStepIndex,
  subscribeToOrder,
  type OrderStatus,
} from '@darjeeling/shared';
import type { OrderRow } from '@darjeeling/shared/types';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useOrder } from '@/hooks/queries';
import { StatusBadge, Spinner, ErrorState } from '@/components/ui';
import { useToast } from '@/components/toast-context';

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const supabase = getBrowserSupabase();
  const toast = useToast();
  const { data: order, isLoading, isError, refetch } = useOrder(orderId);
  const [status, setStatus] = useState<OrderStatus | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const unsub = subscribeToOrder(supabase, orderId, (row: OrderRow) => {
      setStatus(row.status);
      if (row.status === 'ready') {
        toast.show('🛎 Your order is ready for pickup!', 'success');
      }
    });
    return unsub;
  }, [orderId, supabase, toast]);

  if (isLoading) return <Spinner label="Loading your order…" />;
  if (isError || !order) {
    return (
      <div className="container">
        <ErrorState message="We couldn't find that order." onRetry={() => refetch()} />
      </div>
    );
  }

  const current = status ?? order.status;
  const stepIndex = statusStepIndex(current);
  const paid = Boolean(order.paid_at);

  return (
    <div className="container stack" style={{ gap: 24 }}>
      <div className="card card-pad stack">
        <span className="muted">Order</span>
        <h1 style={{ fontSize: 36 }}>{order.number}</h1>
        <StatusBadge status={current} />
        {!paid ? (
          <div className="banner banner-warn">Awaiting payment confirmation…</div>
        ) : null}
      </div>

      {current === 'ready' ? (
        <div className="banner banner-success row">
          <CheckCircle2 aria-hidden="true" /> Your order is ready for pickup!
        </div>
      ) : null}
      {current === 'cancelled' ? (
        <div className="banner banner-error">This order was cancelled.</div>
      ) : null}

      {current !== 'cancelled' ? (
        <div className="card card-pad stack">
          <div className="progress">
            {CUSTOMER_STEPS.map((s, i) => (
              <div
                key={s}
                className={`progress-step ${i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''}`}
              />
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            {CUSTOMER_STEPS.map((s) => (
              <small key={s} className="muted" style={{ flex: 1, textAlign: 'center' }}>
                {STATUS_LABEL[s]}
              </small>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card card-pad stack">
        <h2>Pickup</h2>
        {order.pickup_slot ? (
          <span>Ready around {formatSlotTime(order.pickup_slot)}</span>
        ) : (
          <span>ASAP</span>
        )}
        {order.phone ? <span className="muted">Contact: {order.phone}</span> : null}
        {order.notes ? <span className="muted">Notes: {order.notes}</span> : null}
      </div>

      <div className="card card-pad stack">
        <h2>Items</h2>
        {order.items.map((it) => (
          <div key={it.id} className="row" style={{ justifyContent: 'space-between' }}>
            <span>
              {it.quantity} × {it.name}
              {it.selected_options.length > 0 ? (
                <span className="muted"> ({it.selected_options.map((o) => o.choiceLabel).join(', ')})</span>
              ) : null}
            </span>
            <span>{formatNZD(it.line_total_cents)}</span>
          </div>
        ))}
        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">GST (15% incl.)</span>
          <span>{formatNZD(order.gst_cents)}</span>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', fontWeight: 800 }}>
          <span>Total</span>
          <span>{formatNZD(order.total_cents)}</span>
        </div>
      </div>

      <Link href="/menu" className="btn btn-outline btn-block">
        Order again
      </Link>
    </div>
  );
}
