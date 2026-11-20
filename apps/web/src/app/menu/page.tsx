'use client';

import { useState } from 'react';
import type { MenuItem } from '@darjeeling/shared/types';
import { useMenu } from '@/hooks/queries';
import { useT } from '@/lib/i18n';
import { MenuCard } from '@/components/menu-card';
import { ItemSheet } from '@/components/item-sheet';
import { EmptyState, ErrorState, PageHeading, SkeletonCard } from '@/components/ui';

export default function MenuPage() {
  const { t } = useT();
  const { data: menu, isLoading, isError, refetch } = useMenu();
  const [active, setActive] = useState<MenuItem | null>(null);

  return (
    <div className="container stack" style={{ gap: 28 }}>
      <PageHeading title={t('menu.title')}>
        <p className="muted">{t('menu.sampleNote')}</p>
      </PageHeading>

      {isLoading ? (
        <div className="menu-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={t('menu.loadError')} onRetry={() => refetch()} />
      ) : !menu || menu.length === 0 ? (
        <EmptyState title={t('menu.emptyTitle')} message={t('menu.emptyBody')} />
      ) : (
        menu
          .filter((c) => c.items.length > 0)
          .map((category) => (
            <section key={category.id} className="stack">
              <h2>{category.name}</h2>
              <div className="menu-grid">
                {category.items.map((item, i) => (
                  <MenuCard key={item.id} item={item} onOpen={setActive} index={i} />
                ))}
              </div>
            </section>
          ))
      )}

      {active ? <ItemSheet item={active} onClose={() => setActive(null)} /> : null}
    </div>
  );
}
