'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatNZD } from '@darjeeling/shared';
import { useCart } from '@/components/cart-context';
import { EmptyState } from '@/components/ui';

export default function CartPage() {
  const { lines, totals, updateQuantity, removeItem, loading } = useCart();

  if (!loading && lines.length === 0) {
    return (
      <div className="container">
        <EmptyState
          title="Your cart is empty"
          message="Add some momos to get started."
          action={
            <Link href="/menu" className="btn btn-action">
              Browse the menu
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container stack" style={{ gap: 24 }}>
      <h1>Your cart</h1>

      <div className="stack">
        {lines.map((line) => (
          <div key={line.id} className="card card-pad row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <strong>{line.name}</strong>
              {line.selectedOptions.length > 0 ? (
                <div className="muted" style={{ fontSize: 'var(--text-label)' }}>
                  {line.selectedOptions.map((o) => o.choiceLabel).join(', ')}
                </div>
              ) : null}
              <div className="muted">{formatNZD(line.unitPriceCents)} each</div>
            </div>
            <div className="stack" style={{ alignItems: 'flex-end', gap: 8 }}>
              <strong>{formatNZD(line.unitPriceCents * line.quantity)}</strong>
              <div className="row" style={{ gap: 8 }}>
                <button
                  className="btn btn-outline"
                  aria-label={`Decrease ${line.name}`}
                  onClick={() => updateQuantity(line.id, line.quantity - 1)}
                >
                  <Minus size={16} aria-hidden="true" />
                </button>
                <span aria-live="polite" style={{ minWidth: 20, textAlign: 'center' }}>
                  {line.quantity}
                </span>
                <button
                  className="btn btn-outline"
                  aria-label={`Increase ${line.name}`}
                  onClick={() => updateQuantity(line.id, line.quantity + 1)}
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
                <button
                  className="btn btn-ghost"
                  aria-label={`Remove ${line.name}`}
                  onClick={() => removeItem(line.id)}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card card-pad stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">Subtotal (excl. GST)</span>
          <span>{formatNZD(totals.subtotalCents)}</span>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">GST (15%)</span>
          <span>{formatNZD(totals.gstCents)}</span>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', fontWeight: 800 }}>
          <span>Total</span>
          <span>{formatNZD(totals.totalCents)}</span>
        </div>
        <Link href="/checkout" className="btn btn-primary btn-lg btn-block">
          Go to checkout
        </Link>
      </div>
    </div>
  );
}
