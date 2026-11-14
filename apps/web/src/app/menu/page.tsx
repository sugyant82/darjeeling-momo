'use client';

import { useState } from 'react';
import type { MenuItem } from '@darjeeling/shared/types';
import { useMenu } from '@/hooks/queries';
import { MenuCard } from '@/components/menu-card';
import { ItemSheet } from '@/components/item-sheet';
import { EmptyState, ErrorState, SkeletonCard } from '@/components/ui';

export default function MenuPage() {
  const { data: menu, isLoading, isError, refetch } = useMenu();
  const [active, setActive] = useState<MenuItem | null>(null);

  return (
    <div className="container stack" style={{ gap: 28 }}>
      <h1>Menu</h1>
      <p className="muted" style={{ marginTop: -12 }}>
        Sample menu — prices are GST-inclusive.
      </p>

      {isLoading ? (
        <div className="menu-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message="We couldn't load the menu." onRetry={() => refetch()} />
      ) : !menu || menu.length === 0 ? (
        <EmptyState title="No items yet" message="The menu is being set up. Check back soon." />
      ) : (
        menu
          .filter((c) => c.items.length > 0)
          .map((category) => (
            <section key={category.id} className="stack">
              <h2>{category.name}</h2>
              <div className="menu-grid">
                {category.items.map((item) => (
                  <MenuCard key={item.id} item={item} onOpen={setActive} />
                ))}
              </div>
            </section>
          ))
      )}

      {active ? <ItemSheet item={active} onClose={() => setActive(null)} /> : null}
    </div>
  );
}
