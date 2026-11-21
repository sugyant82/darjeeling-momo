'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  addCartItem,
  deleteAccount,
  fetchOrder,
  formatNZD,
  STATUS_LABEL,
  updateProfile,
} from '@darjeeling/shared';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/components/auth-context';
import { useOrderHistory } from '@/hooks/queries';
import { SignIn } from '@/components/sign-in';
import { Spinner, EmptyState, PageHeading } from '@/components/ui';
import { useToast } from '@/components/toast-context';

export default function AccountPage() {
  const { t } = useT();
  const { user, loading } = useAuth();
  if (loading) return <Spinner label={t('ui.loading')} />;
  if (!user) {
    return (
      <div className="container">
        <Suspense fallback={null}>
          <SignIn next="/account" />
        </Suspense>
      </div>
    );
  }
  return <Account userId={user.id} email={user.email ?? ''} />;
}

function Account({ userId, email }: { userId: string; email: string }) {
  const { t } = useT();
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const toast = useToast();
  const { profile, refreshProfile, signOut } = useAuth();
  const { data: orders, isLoading, refetch } = useOrderHistory(userId);

  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  // Re-sync the form when the profile loads or changes. This is React's documented
  // "adjust state when a prop changes" pattern; it avoids a setState-in-effect cascade.
  const [syncedProfile, setSyncedProfile] = useState(profile);
  if (profile !== syncedProfile) {
    setSyncedProfile(profile);
    setName(profile?.name ?? '');
    setPhone(profile?.phone ?? '');
  }

  async function save() {
    setSaving(true);
    try {
      await updateProfile(supabase, userId, { name, phone });
      await refreshProfile();
      toast.show(t('account.saved'), 'success');
    } catch {
      toast.show(t('account.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function reorder(orderId: string) {
    try {
      const order = await fetchOrder(supabase, orderId);
      if (!order) return;
      for (const it of order.items) {
        if (!it.menu_item_id) continue;
        await addCartItem(supabase, userId, {
          menuItemId: it.menu_item_id,
          quantity: it.quantity,
          selectedOptions: it.selected_options,
        });
      }
      toast.show(t('account.reordered'), 'success');
      router.push('/cart');
    } catch {
      toast.show(t('account.reorderError'), 'error');
    }
  }

  async function onDelete() {
    if (!window.confirm('Delete your account and all your data? This cannot be undone.')) return;
    try {
      await deleteAccount(supabase);
      toast.show(t('account.deleted'), 'success');
      router.push('/');
    } catch {
      toast.show(t('account.deleteError'), 'error');
    }
  }

  return (
    <div className="container stack" style={{ gap: 24 }}>
      <PageHeading kicker={t('greet.kiaora')} title={t('account.title')} />

      <section className="card card-pad stack">
        <h2>{t('account.profile')}</h2>
        <div className="field">
          <label htmlFor="name">{t('account.name')}</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">{t('account.email')}</label>
          <input id="email" className="input" value={email} disabled />
        </div>
        <div className="field">
          <label htmlFor="phone">{t('account.phone')}</label>
          <input id="phone" className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? t('account.saving') : t('account.save')}
        </button>
      </section>

      <section className="stack">
        <h2>{t('account.history')}</h2>
        {isLoading ? (
          <Spinner label={t('ui.loading')} />
        ) : !orders || orders.length === 0 ? (
          <EmptyState
            title={t('account.noOrders')}
            action={
              <Link href="/menu" className="btn btn-action">
                {t('cart.browseMenu')}
              </Link>
            }
          />
        ) : (
          orders.map((o) => (
            <div key={o.id} className="card card-pad row" style={{ justifyContent: 'space-between' }}>
              <div>
                <Link href={`/order/${o.id}`}>
                  <strong>{o.number}</strong>
                </Link>
                <div className="muted">
                  {STATUS_LABEL[o.status]} · {t('account.itemsCount', { n: o.item_count })} ·{' '}
                  {formatNZD(o.total_cents)}
                </div>
              </div>
              <button className="btn btn-outline" onClick={() => reorder(o.id)}>
                {t('account.reorder')}
              </button>
            </div>
          ))
        )}
        <button className="btn btn-ghost" onClick={() => refetch()}>
          {t('account.refresh')}
        </button>
      </section>

      <section className="card card-pad stack">
        <button
          className="btn btn-outline btn-block"
          onClick={async () => {
            await signOut();
            router.push('/');
          }}
        >
          {t('account.signOut')}
        </button>
        <button className="btn btn-danger btn-block" onClick={onDelete}>
          {t('account.deleteAccount')}
        </button>
      </section>
    </div>
  );
}
