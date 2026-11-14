'use client';

import { useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { formatNZD } from '@darjeeling/shared';
import { useToast } from './toast-context';

/**
 * Stripe Payment Element sheet (web). Only mounted when the create-payment
 * function returns provider === 'stripe'. The order is marked paid by the
 * server-side webhook, never here.
 */
export function StripePaymentSheet({
  clientSecret,
  publishableKey,
  amountCents,
  onConfirmed,
  onCancel,
}: {
  clientSecret: string;
  publishableKey: string;
  amountCents: number;
  onConfirmed: () => void;
  onCancel: () => void;
}) {
  const stripePromise = useMemo<Promise<Stripe | null>>(
    () => loadStripe(publishableKey),
    [publishableKey],
  );

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Payment">
      <div className="sheet stack">
        <h2>Pay {formatNZD(amountCents)}</h2>
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'flat' } }}>
          <StripeInner amountCents={amountCents} onConfirmed={onConfirmed} onCancel={onCancel} />
        </Elements>
      </div>
    </div>
  );
}

function StripeInner({
  amountCents,
  onConfirmed,
  onCancel,
}: {
  amountCents: number;
  onConfirmed: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const ready = Boolean(stripe && elements);

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    const { error } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    setBusy(false);
    if (error) {
      toast.show(error.message ?? 'Payment failed.', 'error');
      return;
    }
    onConfirmed();
  }

  return (
    <div className="stack">
      <PaymentElement />
      <button
        className="btn btn-primary btn-lg btn-block"
        onClick={pay}
        disabled={!ready || busy}
      >
        {busy ? 'Processing…' : `Pay ${formatNZD(amountCents)}`}
      </button>
      <button className="btn btn-ghost btn-block" onClick={onCancel} disabled={busy}>
        Cancel
      </button>
    </div>
  );
}
