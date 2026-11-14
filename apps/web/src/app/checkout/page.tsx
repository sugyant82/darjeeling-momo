'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  createPayment,
  createOrderInputSchema,
  fetchProfile,
  formatNZD,
  formatSlotTime,
  type CreatePaymentResponse,
} from '@darjeeling/shared';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-context';
import { useCart } from '@/components/cart-context';
import { useAvailableSlots } from '@/hooks/queries';
import { SignIn } from '@/components/sign-in';
import { MockPaymentSheet } from '@/components/mock-payment-sheet';
import { StripePaymentSheet } from '@/components/stripe-payment-sheet';
import { EmptyState, Spinner } from '@/components/ui';
import { useToast } from '@/components/toast-context';

export default function CheckoutPage() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) {
    return (
      <div className="container">
        <Suspense fallback={null}>
          <SignIn next="/checkout" />
        </Suspense>
      </div>
    );
  }
  return <CheckoutForm userId={user.id} />;
}

function CheckoutForm({ userId }: { userId: string }) {
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const toast = useToast();
  const cart = useCart();
  const { data: slotData, isLoading: slotsLoading } = useAvailableSlots();

  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [mode, setMode] = useState<'asap' | 'scheduled'>('asap');
  const [slotIso, setSlotIso] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState<CreatePaymentResponse | null>(null);

  useEffect(() => {
    fetchProfile(supabase, userId).then((p) => {
      if (p?.phone) setPhone(p.phone);
    });
  }, [supabase, userId]);

  const availableSlots = (slotData?.slots ?? []).filter((s) => !s.full);
  const open = slotData?.open ?? false;
  const canOrder = open && availableSlots.length > 0;

  if (!cart.loading && cart.lines.length === 0 && !payment) {
    return (
      <div className="container">
        <EmptyState
          title="Nothing to check out"
          message="Your cart is empty."
          action={
            <Link href="/menu" className="btn btn-action">
              Browse the menu
            </Link>
          }
        />
      </div>
    );
  }

  function resolvePickup(): { pickupSlotIso: string | null; pickupAsap: boolean } {
    if (mode === 'asap') {
      return { pickupSlotIso: availableSlots[0]?.startIso ?? null, pickupAsap: true };
    }
    return { pickupSlotIso: slotIso || null, pickupAsap: false };
  }

  async function submit() {
    const pickup = resolvePickup();
    const input = {
      items: cart.lines.map((l) => ({
        menuItemId: l.menuItemId,
        quantity: l.quantity,
        selectedOptions: l.selectedOptions,
      })),
      pickupSlotIso: pickup.pickupSlotIso,
      pickupAsap: pickup.pickupAsap,
      locationId: slotData?.schedule?.id ?? null,
      phone,
      notes,
    };

    const parsed = createOrderInputSchema.safeParse(input);
    if (!parsed.success) {
      toast.show(parsed.error.issues[0]?.message ?? 'Please check your details.', 'error');
      return;
    }
    if (mode === 'scheduled' && !slotIso) {
      toast.show('Please choose a pickup time.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createPayment(supabase, parsed.data);
      setPayment(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start checkout.';
      toast.show(message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function onPaid() {
    await cart.clear();
    const orderId = payment?.orderId;
    setPayment(null);
    if (orderId) router.push(`/order/${orderId}`);
  }

  return (
    <div className="container stack" style={{ gap: 24 }}>
      <h1>Checkout</h1>

      {slotsLoading ? (
        <Spinner label="Checking pickup times…" />
      ) : !open ? (
        <div className="banner banner-warn">The truck is closed right now — checkout is paused.</div>
      ) : availableSlots.length === 0 ? (
        <div className="banner banner-warn">All pickup slots are full today. Please try later.</div>
      ) : null}

      {/* Pickup */}
      <section className="card card-pad stack">
        <h2>Pickup</h2>
        <div className="stack">
          <strong>{slotData?.schedule?.place ?? 'Truck location'}</strong>
          <span className="muted">{slotData?.schedule?.address}</span>
        </div>
        <fieldset className="stack" style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 700 }}>When</legend>
          <label className="row card card-pad" style={{ padding: 12, gap: 10 }}>
            <input
              type="radio"
              name="mode"
              checked={mode === 'asap'}
              onChange={() => setMode('asap')}
              disabled={!canOrder}
            />
            <span>
              ASAP{' '}
              {availableSlots[0] ? (
                <span className="muted">(ready around {availableSlots[0].label})</span>
              ) : null}
            </span>
          </label>
          <label className="row card card-pad" style={{ padding: 12, gap: 10 }}>
            <input
              type="radio"
              name="mode"
              checked={mode === 'scheduled'}
              onChange={() => setMode('scheduled')}
              disabled={!canOrder}
            />
            <span>Schedule a time</span>
          </label>
          {mode === 'scheduled' ? (
            <div className="field">
              <label htmlFor="slot">Pickup time</label>
              <select
                id="slot"
                className="select"
                value={slotIso}
                onChange={(e) => setSlotIso(e.target.value)}
              >
                <option value="">Choose a time…</option>
                {availableSlots.map((s) => (
                  <option key={s.startIso} value={s.startIso}>
                    {formatSlotTime(s.startIso)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </fieldset>
      </section>

      {/* Contact */}
      <section className="card card-pad stack">
        <h2>Contact</h2>
        <div className="field">
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            className="input"
            type="tel"
            inputMode="tel"
            placeholder="021 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="notes">Order notes (optional)</label>
          <textarea
            id="notes"
            className="textarea"
            placeholder="Allergies, extra achar on the side…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
        </div>
      </section>

      {/* Totals + pay */}
      <section className="card card-pad stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">Subtotal (excl. GST)</span>
          <span>{formatNZD(cart.totals.subtotalCents)}</span>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">GST (15%)</span>
          <span>{formatNZD(cart.totals.gstCents)}</span>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', fontWeight: 800 }}>
          <span>Total</span>
          <span>{formatNZD(cart.totals.totalCents)}</span>
        </div>
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={submit}
          disabled={!canOrder || submitting || !phone}
        >
          {submitting ? 'Starting payment…' : `Pay ${formatNZD(cart.totals.totalCents)}`}
        </button>
      </section>

      {payment?.provider === 'mock' ? (
        <MockPaymentSheet
          orderId={payment.orderId}
          amountCents={payment.amountCents}
          onPaid={onPaid}
          onCancel={() => setPayment(null)}
        />
      ) : null}
      {payment?.provider === 'stripe' ? (
        <StripePaymentSheet
          clientSecret={payment.clientSecret}
          publishableKey={payment.publishableKey}
          amountCents={payment.amountCents}
          onConfirmed={onPaid}
          onCancel={() => setPayment(null)}
        />
      ) : null}
    </div>
  );
}
