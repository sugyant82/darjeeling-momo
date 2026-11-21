'use client';

import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatNZD } from '@darjeeling/shared';
import { useT } from '@/lib/i18n';
import { useCart } from '@/components/cart-context';
import { EmptyState, PageHeading } from '@/components/ui';

export default function CartPage() {
  const { t } = useT();
  const { lines, totals, updateQuantity, removeItem, loading } = useCart();

  if (!loading && lines.length === 0) {
    return (
      <div className="container">
        <EmptyState
          title={t('cart.emptyTitle')}
          message={t('cart.emptyBody')}
          action={
            <Link href="/menu" className="btn btn-action">
              {t('cart.browseMenu')}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container stack" style={{ gap: 24 }}>
      <PageHeading title={t('cart.title')} />

      <div className="stack">
        {lines.map((line) => (
          <div key={line.id} className="card card-pad row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 'min(100%, 150px)' }}>
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
                  aria-label={t('cart.decrease', { name: line.name })}
                  onClick={() => updateQuantity(line.id, line.quantity - 1)}
                >
                  <Minus size={16} aria-hidden="true" />
                </button>
                <span aria-live="polite" style={{ minWidth: 20, textAlign: 'center' }}>
                  {line.quantity}
                </span>
                <button
                  className="btn btn-outline"
                  aria-label={t('cart.increase', { name: line.name })}
                  onClick={() => updateQuantity(line.id, line.quantity + 1)}
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
                <button
                  className="btn btn-ghost"
                  aria-label={t('cart.remove', { name: line.name })}
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
          <span className="muted">{t('cart.subtotal')}</span>
          <span>{formatNZD(totals.subtotalCents)}</span>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">{t('cart.gst')}</span>
          <span>{formatNZD(totals.gstCents)}</span>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', fontWeight: 800 }}>
          <span>{t('cart.total')}</span>
          <span>{formatNZD(totals.totalCents)}</span>
        </div>
        <Link href="/checkout" className="btn btn-primary btn-lg btn-block">
          {t('cart.checkout')}
        </Link>
      </div>
    </div>
  );
}
