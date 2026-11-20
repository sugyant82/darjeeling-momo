'use client';

import type { CSSProperties } from 'react';
import { Plus } from 'lucide-react';
import { formatNZD, isItemAvailable } from '@darjeeling/shared';
import type { MenuItem } from '@darjeeling/shared/types';
import { useT } from '@/lib/i18n';
import { TagBadge } from './ui';

export function MenuCard({
  item,
  onOpen,
  index = 0,
}: {
  item: MenuItem;
  onOpen: (item: MenuItem) => void;
  /** Position in its grid, used to stagger the entrance animation. */
  index?: number;
}) {
  const { t } = useT();
  const soldOut = !isItemAvailable(item);
  // Low-stock nudge for tracked items that are still available.
  const lowStock = item.stock_qty != null && item.stock_qty > 0 && item.stock_qty <= 5;
  return (
    <article
      className={`card menu-card${soldOut ? ' sold-out' : ''}`}
      style={{ '--i': Math.min(index, 8) } as CSSProperties}
    >
      <div className="menu-card-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url ?? '/images/placeholder-momo.svg'}
          alt=""
          width={400}
          height={220}
          loading="lazy"
        />
      </div>
      <div className="card-pad stack" style={{ gap: 10, flex: 1 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 style={{ fontSize: 'var(--text-h3)' }}>{item.name}</h3>
          <strong>{formatNZD(item.price_cents)}</strong>
        </div>
        {item.description ? (
          <p className="muted" style={{ margin: 0, fontSize: 'var(--text-label)' }}>
            {item.description}
          </p>
        ) : null}
        {item.tags.length > 0 ? (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {item.tags.map((t) => (
              <TagBadge key={t} tag={t} />
            ))}
          </div>
        ) : null}
        {lowStock ? (
          <span className="tag tag-spicy" style={{ alignSelf: 'flex-start' }}>
            {t('card.onlyLeft', { n: item.stock_qty as number })}
          </span>
        ) : null}
        <div className="spacer" />
        {soldOut ? (
          <button className="btn btn-outline btn-block" disabled aria-disabled="true">
            {t('card.soldOut')}
          </button>
        ) : (
          <button className="btn btn-action btn-block" onClick={() => onOpen(item)}>
            <Plus size={18} aria-hidden="true" /> {t('card.addToCart')}
          </button>
        )}
      </div>
    </article>
  );
}
