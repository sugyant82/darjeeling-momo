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
import { useT } from '@/lib/i18n';
import { StatusBadge, Spinner, ErrorState } from '@/components/ui';
import { useToast } from '@/components/toast-context';

export default function OrderPage() {
  const { t } = useT();
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
        toast.show('🛎 ' + t('order.ready'), 'success');
      }
    });
    return unsub;
  }, [orderId, supabase, toast, t]);

  if (isLoading) return <Spinner label={t('order.loading')} />;
  if (isError || !order) {
    return (
      <div className="container">
        <ErrorState message={t('order.notFound')} onRetry={() => refetch()} />
      </div>
    );
  }

  const current = status ?? order.status;
  const stepIndex = statusStepIndex(current);
  const paid = Boolean(order.paid_at);

  return (
    <div className="container stack" style={{ gap: 24 }}>
      <div className="card card-pad stack">
        <span className="kicker">
          <span>{t('greet.thanks')}</span> · {t('order.thanks')}
        </span>
        <h1 style={{ fontSize: 36 }}>{order.number}</h1>
        <StatusBadge status={current} />
        {!paid ? (
          <div className="banner banner-warn">{t('order.awaitingPayment')}</div>
        ) : null}
      </div>

      {current === 'ready' ? (
        <div className="banner banner-success row">
          <CheckCircle2 aria-hidden="true" /> {t('order.ready')}
        </div>
      ) : null}
      {current === 'cancelled' ? (
        <div className="banner banner-error">{t('order.cancelled')}</div>
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
        <h2>{t('order.pickup')}</h2>
        {order.location ? (
          <div className="stack" style={{ gap: 2 }}>
            <strong>
              {t(order.location.pickup_type === 'home' ? 'pickup.home' : 'pickup.truck')} · {order.location.place}
            </strong>
            <span className="muted">{order.location.address}</span>
            {order.location.map_link ? (
              <a href={order.location.map_link} target="_blank" rel="noreferrer">
                {t('order.openInMaps')}
              </a>
            ) : null}
          </div>
        ) : null}
        {order.pickup_slot ? (
          <span>{t('order.readyAround', { time: formatSlotTime(order.pickup_slot) })}</span>
        ) : (
          <span>{t('order.asap')}</span>
        )}
        {order.phone ? <span className="muted">{t('order.contact', { phone: order.phone })}</span> : null}
        {order.notes ? <span className="muted">{t('order.notes', { notes: order.notes })}</span> : null}
      </div>

      <div className="card card-pad stack">
        <h2>{t('order.items')}</h2>
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
          <span className="muted">{t('cart.gst')}</span>
          <span>{formatNZD(order.gst_cents)}</span>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', fontWeight: 800 }}>
          <span>{t('order.total')}</span>
          <span>{formatNZD(order.total_cents)}</span>
        </div>
      </div>

      <Link href="/menu" className="btn btn-outline btn-block">
        {t('home.orderNow')}
      </Link>
    </div>
  );
}
