import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { router, useScrollToTop } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { ChevronRight, LogOut, RotateCcw, Trash2, UserRound } from 'lucide-react-native';
import {
  deleteAccount,
  fetchMenu,
  fetchOrder,
  formatNZD,
  profileInputSchema,
  TIME_ZONE,
  updateProfile,
} from '@darjeeling/shared';
import type { OrderSummary, ProfileRow, SelectedOption } from '@darjeeling/shared/types';
import { supabase } from '@/lib/supabase';
import { colors, font, radii, styles, tint, type } from '@/lib/theme';
import { useOrderHistory } from '@/hooks/queries';
import { useAuth } from '@/state/auth';
import { useCart } from '@/state/cart';
import { useToast } from '@/state/toast';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Banner, EmptyState, Loading, SectionTitle, StatusBadge } from '@/components/ui';

const dateFormat = new Intl.DateTimeFormat('en-NZ', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export default function AccountScreen() {
  const { user, loading, profile } = useAuth();
  const firstName = profile?.name?.trim().split(/\s+/)[0];

  return (
    <View style={styles.screen}>
      <ScreenHeader kicker="Kia ora" title={firstName ? `Kia ora, ${firstName}` : 'Your account'} />
      {loading ? (
        <Loading />
      ) : !user ? (
        <View style={{ padding: 16 }}>
          <EmptyState
            art={
              <View style={s.avatarEmpty}>
                <UserRound color={colors.muted} size={30} />
              </View>
            }
            title="Not signed in"
            message="Sign in to see your orders, save your details and reorder in a tap."
            action={<Button title="Sign in" variant="primary" onPress={() => router.push('/signin')} />}
          />
        </View>
      ) : (
        <SignedIn user={user} profile={profile} />
      )}
    </View>
  );
}

function SignedIn({ user, profile }: { user: User; profile: ProfileRow | null }) {
  const { refreshProfile, signOut } = useAuth();
  const toast = useToast();
  const cart = useCart();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef);
  const orders = useOrderHistory(user.id);
  const [refreshing, setRefreshing] = useState(false);
  const [reordering, setReordering] = useState<string | null>(null);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.allSettled([orders.refetch(), refreshProfile()]);
    setRefreshing(false);
  }

  async function reorder(summary: OrderSummary) {
    setReordering(summary.id);
    try {
      const [order, menu] = await Promise.all([
        fetchOrder(supabase, summary.id),
        queryClient.fetchQuery({ queryKey: ['menu'], queryFn: () => fetchMenu(supabase), staleTime: 60_000 }),
      ]);
      if (!order) throw new Error('Order not found');
      const items = menu.flatMap((c) => c.items);
      let added = 0;
      let skipped = 0;
      for (const line of order.items) {
        const item = line.menu_item_id ? items.find((m) => m.id === line.menu_item_id) : undefined;
        if (!item || !item.is_available) {
          skipped += 1;
          continue;
        }
        // Keep only choices that still exist, at today's prices.
        const choices = new Map(item.options.flatMap((o) => o.choices.map((c) => [c.id, c] as const)));
        const selected: SelectedOption[] = line.selected_options.flatMap((o) => {
          const choice = choices.get(o.choiceId);
          return choice ? [{ ...o, choiceLabel: choice.label, priceDeltaCents: choice.price_delta_cents }] : [];
        });
        await cart.addItem(item, selected, line.quantity);
        added += 1;
      }
      if (added === 0) {
        toast.show("Those items aren't available right now.", 'error');
      } else {
        toast.show(
          skipped > 0 ? `Added ${added} item${added === 1 ? '' : 's'} — ${skipped} no longer available.` : 'Ka pai! Added to your cart.',
          'success',
        );
        router.navigate('/cart');
      }
    } catch {
      toast.show("Couldn't reorder. Please try again.", 'error');
    } finally {
      setReordering(null);
    }
  }

  async function doSignOut() {
    await signOut().catch(() => {});
    toast.show('Signed out — ka kite anō!', 'info');
    router.replace('/');
  }

  function confirmDelete() {
    Alert.alert('Delete account', 'This permanently deletes your account and order history. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount(supabase);
            await signOut().catch(() => {});
            toast.show('Your account has been deleted.', 'success');
            router.replace('/');
          } catch {
            toast.show("Couldn't delete your account. Please try again.", 'error');
          }
        },
      },
    ]);
  }

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.marigold} colors={[colors.marigold]} />
      }
    >
      <ProfileCard user={user} profile={profile} />

      <SectionTitle kicker="Your orders" title="Order history" />
      {orders.isLoading ? (
        <Loading label="Loading your orders…" style={{ paddingVertical: 24 }} />
      ) : orders.isError ? (
        <Banner kind="error">We couldn&apos;t load your orders. Pull down to try again.</Banner>
      ) : !orders.data || orders.data.length === 0 ? (
        <EmptyState
          title="No orders yet"
          message="Your orders will show up here."
          action={<Button title="Browse the menu" variant="action" onPress={() => router.navigate('/menu')} />}
        />
      ) : (
        orders.data.map((o, i) => (
          <Animated.View key={o.id} entering={FadeInDown.delay(Math.min(i, 5) * 50).duration(350)}>
            <OrderRow order={o} reordering={reordering === o.id} disabled={reordering !== null} onReorder={() => reorder(o)} />
          </Animated.View>
        ))
      )}

      <View style={{ gap: 10, marginTop: 8 }}>
        <Button title="Sign out" variant="outline" icon={<LogOut color={colors.indigo} size={18} />} onPress={doSignOut} />
        <Button
          title="Delete account"
          variant="ghost"
          icon={<Trash2 color={colors.achar} size={18} />}
          onPress={confirmDelete}
          style={{ opacity: 0.9 }}
        />
      </View>
    </ScrollView>
  );
}

function ProfileCard({ user, profile }: { user: User; profile: ProfileRow | null }) {
  const { refreshProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const edited = useRef(false);

  // Fill from the profile until the user starts typing (background refreshes never clobber edits).
  useEffect(() => {
    if (edited.current) return;
    setName(profile?.name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile?.name, profile?.phone]);

  const changed = name.trim() !== (profile?.name ?? '').trim() || phone.trim() !== (profile?.phone ?? '').trim();
  const initials = (name || user.email || '?')
    .trim()
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  async function save() {
    setError(null);
    const parsed = profileInputSchema.safeParse({ name, phone });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.path[0] === 'phone' ? 'Enter a valid phone number.' : 'Names can be up to 80 characters.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(supabase, user.id, parsed.data);
      edited.current = false;
      await refreshProfile();
      toast.show('Profile saved.', 'success');
    } catch {
      setError("Couldn't save your details. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.card, { gap: 14, padding: 18 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.h3} numberOfLines={1}>
            {profile?.name || 'Your profile'}
          </Text>
          <Text style={type.caption} numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={type.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(v) => {
            edited.current = true;
            setName(v);
          }}
          placeholder="Your name"
          placeholderTextColor={colors.disabled}
          autoComplete="name"
          textContentType="name"
          maxLength={80}
          accessibilityLabel="Name"
        />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={type.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(v) => {
            edited.current = true;
            setPhone(v);
          }}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="021 123 4567"
          placeholderTextColor={colors.disabled}
          maxLength={20}
          accessibilityLabel="Phone"
        />
        <Text style={type.caption}>Used to prefill checkout so we can reach you about your order.</Text>
      </View>
      {error ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <Banner kind="error">{error}</Banner>
        </Animated.View>
      ) : null}
      <Button title="Save details" variant="primary" loading={saving} disabled={!changed || saving} onPress={save} />
    </View>
  );
}

function OrderRow({
  order,
  reordering,
  disabled,
  onReorder,
}: {
  order: OrderSummary;
  reordering: boolean;
  disabled: boolean;
  onReorder: () => void;
}) {
  const unpaid = !order.paid_at && order.status !== 'cancelled';
  return (
    <PressableScale
      onPress={() => router.push(`/order/${order.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.number}, ${order.item_count} items, ${formatNZD(order.total_cents)}`}
      style={[styles.card, { padding: 16, gap: 10 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[type.h3, { fontFamily: font.display }]}>{order.number}</Text>
          <Text style={type.caption}>
            {dateFormat.format(new Date(order.created_at))} · {order.item_count} item{order.item_count === 1 ? '' : 's'} ·{' '}
            {formatNZD(order.total_cents)}
          </Text>
        </View>
        <ChevronRight color={colors.muted} size={20} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        {unpaid ? (
          <View style={s.unpaid}>
            <Text style={s.unpaidText}>Payment not completed</Text>
          </View>
        ) : (
          <StatusBadge status={order.status} />
        )}
        {!unpaid ? (
          <Button
            title="Reorder"
            variant="soft"
            size="sm"
            icon={<RotateCcw color={colors.indigo} size={15} />}
            loading={reordering}
            disabled={disabled}
            onPress={onReorder}
          />
        ) : null}
      </View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.marigold,
  },
  avatarText: { fontFamily: font.display, fontSize: 20, color: colors.indigo },
  avatarEmpty: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tint.indigoFaint,
  },
  unpaid: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: '#FCEFD6',
  },
  unpaidText: { fontFamily: font.bold, fontSize: 13, color: colors.indigo },
});
