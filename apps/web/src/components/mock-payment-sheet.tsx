'use client';

import { useState } from 'react';
import { formatNZD, confirmMockPayment } from '@darjeeling/shared';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useToast } from './toast-context';

export function MockPaymentSheet({
  orderId,
  amountCents,
  onPaid,
  onCancel,
}: {
  orderId: string;
  amountCents: number;
  onPaid: () => void;
  onCancel: () => void;
}) {
  const supabase = getBrowserSupabase();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function decide(decision: 'pay' | 'decline') {
    setBusy(true);
    try {
      const res = await confirmMockPayment(supabase, orderId, decision);
      if (res.paid) {
        onPaid();
      } else {
        toast.show('Payment declined — order cancelled.', 'error');
        onCancel();
      }
    } catch {
      toast.show('Payment could not be processed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label="Test payment">
      <div className="sheet stack">
        <div className="banner banner-warn">
          <strong>Test payment — no real money.</strong> This is the mock payment provider used in
          local mode. It uses the same server path the Stripe webhook will use.
        </div>
        <h2>Pay {formatNZD(amountCents)}</h2>
        <button className="btn btn-success btn-lg btn-block" onClick={() => decide('pay')} disabled={busy}>
          {busy ? 'Processing…' : `Pay ${formatNZD(amountCents)}`}
        </button>
        <button className="btn btn-danger btn-block" onClick={() => decide('decline')} disabled={busy}>
          Decline
        </button>
        <button className="btn btn-ghost btn-block" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
