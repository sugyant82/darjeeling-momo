'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Home, Pause, Play, Truck } from 'lucide-react';
import {
  formatNZD,
  formatSlotTime,
  PICKUP_TYPE_LABEL,
  primaryNextStatus,
  STATUS_LABEL,
  subscribeToActiveOrders,
  updateKitchenControls,
  updateOrderStatus,
  type OrderStatus,
} from '@darjeeling/shared';
import type { LocationScheduleRow, Order } from '@darjeeling/shared/types';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useActiveOrders, useTodayLocations } from '@/hooks/queries';
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

const BUFFER_PRESETS = [0, 10, 20, 30, 45];

/** Live kitchen dial: pause/resume new orders and set the "we're busy" prep buffer per location today. */
function KitchenControls() {
  const supabase = getBrowserSupabase();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: locations, isLoading } = useTodayLocations();
  const [busy, setBusy] = useState(false);

  async function change(row: LocationScheduleRow, change: { acceptingOrders?: boolean; prepBufferMinutes?: number }) {
    setBusy(true);
    try {
      await updateKitchenControls(supabase, row.id, change);
      await qc.invalidateQueries({ queryKey: ['today-locations'] });
      await qc.invalidateQueries({ queryKey: ['pickup-options'] });
    } catch {
      toast.show('Could not update the kitchen controls.', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading || !locations || locations.length === 0) return null;

  return (
    <div className="stack" style={{ gap: 10 }}>
      <h2 style={{ fontSize: 'var(--text-h3)' }}>Kitchen controls (today)</h2>
      {locations.map((row) => (
        <div key={row.id} className="card card-pad stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <strong className="row" style={{ gap: 6 }}>
              {row.pickup_type === 'home' ? <Home size={16} /> : <Truck size={16} />}
              {PICKUP_TYPE_LABEL[row.pickup_type]} · {row.place}
            </strong>
            <button
              className={`btn ${row.accepting_orders ? 'btn-success' : 'btn-danger'}`}
              disabled={busy}
              aria-pressed={!row.accepting_orders}
              onClick={() => change(row, { acceptingOrders: !row.accepting_orders })}
            >
              {row.accepting_orders ? (
                <>
                  <Pause size={16} /> Pause orders
                </>
              ) : (
                <>
                  <Play size={16} /> Resume orders
                </>
              )}
            </button>
          </div>
          {!row.accepting_orders ? (
            <div className="banner banner-warn">Paused — customers can’t place new orders here right now.</div>
          ) : null}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="muted">Prep buffer:</span>
            {BUFFER_PRESETS.map((m) => (
              <button
                key={m}
                className={`btn ${row.prep_buffer_minutes === m ? 'btn-primary' : 'btn-outline'}`}
                disabled={busy}
                aria-pressed={row.prep_buffer_minutes === m}
                onClick={() => change(row, { prepBufferMinutes: m })}
              >
                +{m}m
              </button>
            ))}
          </div>
          <span className="muted" style={{ fontSize: 'var(--text-caption)' }}>
            Added on top of each item’s prep time, so customers see realistic pickup times when you’re busy.
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminOrdersPage() {
  const supabase = getBrowserSupabase();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: orders, isLoading, isError, refetch } = useActiveOrders(true);
  const { data: locations } = useTodayLocations();
  const locationsById = new Map((locations ?? []).map((l) => [l.id, l]));
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

      <KitchenControls />

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
                {order.location_id && locationsById.has(order.location_id) ? (
                  <div className="row" style={{ gap: 6 }}>
                    {locationsById.get(order.location_id)!.pickup_type === 'home' ? (
                      <Home size={15} />
                    ) : (
                      <Truck size={15} />
                    )}
                    <span className="muted">
                      {PICKUP_TYPE_LABEL[locationsById.get(order.location_id)!.pickup_type]}
                    </span>
                  </div>
                ) : null}
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
