'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  formatNZD,
  formatSlotTime,
  primaryNextStatus,
  STATUS_LABEL,
  subscribeToActiveOrders,
  updateOrderStatus,
  type OrderStatus,
} from '@darjeeling/shared';
import type { Order } from '@darjeeling/shared/types';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useActiveOrders } from '@/hooks/queries';
import { StatusBadge, Spinner, ErrorState } from '@/components/ui';
import { useToast } from '@/components/toast-context';

function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    /* audio not available */
  }
}

export default function AdminOrdersPage() {
  const supabase = getBrowserSupabase();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: orders, isLoading, isError, refetch } = useActiveOrders(true);
  const [soundOn, setSoundOn] = useState(false);
  const knownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsub = subscribeToActiveOrders(supabase, () => {
      qc.invalidateQueries({ queryKey: ['active-orders'] });
    });
    return unsub;
  }, [supabase, qc]);

  useEffect(() => {
    if (!orders) return;
    const ids = new Set(orders.map((o) => o.id));
    if (knownIds.current.size > 0) {
      for (const o of orders) {
        if (!knownIds.current.has(o.id)) {
          if (soundOn) beep();
          toast.show(`New order ${o.number}`, 'success');
        }
      }
    }
    knownIds.current = ids;
  }, [orders, soundOn, toast]);

  async function advance(order: Order) {
    const next = primaryNextStatus(order.status);
    if (!next) return;
    try {
      await updateOrderStatus(supabase, order.id, order.status, next);
      qc.invalidateQueries({ queryKey: ['active-orders'] });
    } catch {
      toast.show('Could not update order.', 'error');
    }
  }

  async function cancel(order: Order) {
    try {
      await updateOrderStatus(supabase, order.id, order.status, 'cancelled' as OrderStatus);
      qc.invalidateQueries({ queryKey: ['active-orders'] });
    } catch {
      toast.show('Could not cancel order.', 'error');
    }
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Live orders</h1>
        <button
          className={`btn ${soundOn ? 'btn-success' : 'btn-outline'}`}
          onClick={() => setSoundOn((s) => !s)}
          aria-pressed={soundOn}
        >
          Sound {soundOn ? 'on' : 'off'}
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <ErrorState message="Could not load orders." onRetry={() => refetch()} />
      ) : !orders || orders.length === 0 ? (
        <div className="banner banner-info">No active orders right now.</div>
      ) : (
        <div className="board-grid">
          {orders.map((order) => {
            const next = primaryNextStatus(order.status);
            return (
              <div key={order.id} className="card card-pad stack board-card">
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="num">{order.number}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div className="muted">
                  {order.pickup_slot ? `Pickup ${formatSlotTime(order.pickup_slot)}` : 'ASAP'} ·{' '}
                  {order.phone}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {order.items.map((it) => (
                    <li key={it.id}>
                      {it.quantity} × {it.name}
                      {it.selected_options.length > 0 ? (
                        <span className="muted">
                          {' '}
                          ({it.selected_options.map((o) => o.choiceLabel).join(', ')})
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {order.notes ? <div className="muted">Note: {order.notes}</div> : null}
                <strong>{formatNZD(order.total_cents)}</strong>
                <div className="row" style={{ gap: 8 }}>
                  {next ? (
                    <button className="btn btn-success btn-block" onClick={() => advance(order)}>
                      Move to {STATUS_LABEL[next]}
                    </button>
                  ) : null}
                  <button className="btn btn-outline" onClick={() => cancel(order)} aria-label="Cancel order">
                    Cancel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
