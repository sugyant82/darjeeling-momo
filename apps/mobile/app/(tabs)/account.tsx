import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  addCartItem,
  deleteAccount,
  fetchOrder,
  formatNZD,
  STATUS_LABEL,
  updateProfile,
} from '@darjeeling/shared';
import { supabase } from '@/lib/supabase';
import { styles, type } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Banner, EmptyState, Loading } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { useToast } from '@/state/toast';
import { useOrderHistory } from '@/hooks/queries';

export default function AccountScreen() {
  const { user, loading, profile, refreshProfile, signOut } = useAuth();
  const toast = useToast();
  const { data: orders, isLoading, refetch } = useOrderHistory(user?.id ?? null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  if (loading) return <Loading />;

  if (!user) {
    return (
      <View style={styles.container}>
        <EmptyState title="Not signed in" message="Sign in to see your orders and profile." />
        <Button title="Sign in" variant="primary" onPress={() => router.push('/signin')} />
      </View>
    );
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(supabase, user.id, { name, phone });
      await refreshProfile();
      toast.show('Profile saved.', 'success');
    } catch {
      toast.show('Could not save.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function reorder(orderId: string) {
    if (!user) return;
    try {
      const order = await fetchOrder(supabase, orderId);
      if (!order) return;
      for (const it of order.items) {
        if (!it.menu_item_id) continue;
        await addCartItem(supabase, user.id, {
          menuItemId: it.menu_item_id,
          quantity: it.quantity,
          selectedOptions: it.selected_options,
        });
      }
      toast.show('Added to cart.', 'success');
      router.push('/cart');
    } catch {
      toast.show('Could not reorder.', 'error');
    }
  }

  function confirmDelete() {
    Alert.alert('Delete account', 'This permanently deletes your account and data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount(supabase);
            toast.show('Account deleted.', 'success');
            router.replace('/');
          } catch {
            toast.show('Could not delete account.', 'error');
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={type.h2}>Profile</Text>
        <Text style={type.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        <Text style={type.label}>Email</Text>
        <TextInput style={[styles.input, { opacity: 0.6 }]} value={user.email ?? ''} editable={false} />
        <Text style={type.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button title={saving ? 'Saving…' : 'Save profile'} variant="primary" onPress={save} disabled={saving} />
      </View>

      <Text style={type.h2}>Order history</Text>
      {isLoading ? (
        <Loading />
      ) : !orders || orders.length === 0 ? (
        <Banner kind="info">No orders yet.</Banner>
      ) : (
        orders.map((o) => (
          <View key={o.id} style={styles.card}>
            <Pressable onPress={() => router.push(`/order/${o.id}`)}>
              <Text style={type.bodyBold}>{o.number}</Text>
              <Text style={type.caption}>
                {STATUS_LABEL[o.status]} · {o.item_count} item{o.item_count === 1 ? '' : 's'} ·{' '}
                {formatNZD(o.total_cents)}
              </Text>
            </Pressable>
            <Button title="Reorder" variant="outline" onPress={() => reorder(o.id)} />
          </View>
        ))
      )}
      <Button title="Refresh" variant="outline" onPress={() => refetch()} />

      <View style={{ height: 8 }} />
      <Button
        title="Sign out"
        variant="outline"
        onPress={async () => {
          await signOut();
          router.replace('/');
        }}
      />
      <Button title="Delete account" variant="danger" onPress={confirmDelete} />
    </ScrollView>
  );
}
