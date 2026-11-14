import { FlatList, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatNZD } from '@darjeeling/shared';
import type { MenuItem } from '@darjeeling/shared/types';
import { colors, styles, type } from '@/lib/theme';
import { Loading, EmptyState, Banner, TagBadge } from '@/components/ui';
import { FoodImage } from '@/components/FoodImage';
import { useMenu } from '@/hooks/queries';

export default function MenuScreen() {
  const { data: menu, isLoading, isError, refetch } = useMenu();

  if (isLoading) return <Loading label="Loading the menu…" />;
  if (isError)
    return (
      <View style={styles.container}>
        <Banner kind="error">We couldn&apos;t load the menu. Pull to retry.</Banner>
      </View>
    );
  if (!menu || menu.every((c) => c.items.length === 0))
    return (
      <View style={styles.container}>
        <EmptyState title="No items yet" message="The menu is being set up." />
      </View>
    );

  const sections = menu.filter((c) => c.items.length > 0);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={{ padding: 16, gap: 20 }}
      data={sections}
      keyExtractor={(c) => c.id}
      refreshing={isLoading}
      onRefresh={refetch}
      renderItem={({ item: category }) => (
        <View style={{ gap: 12 }}>
          <Text style={type.h2}>{category.name}</Text>
          {category.items.map((item) => (
            <MenuRow key={item.id} item={item} />
          ))}
        </View>
      )}
    />
  );
}

function MenuRow({ item }: { item: MenuItem }) {
  const soldOut = !item.is_available;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatNZD(item.price_cents)}${soldOut ? ', sold out' : ''}`}
      disabled={soldOut}
      onPress={() => router.push(`/item/${item.id}`)}
      style={[styles.card, { flexDirection: 'row', gap: 12, opacity: soldOut ? 0.55 : 1 }]}
    >
      <FoodImage url={item.image_url} size={72} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.rowBetween}>
          <Text style={type.bodyBold}>{item.name}</Text>
          <Text style={type.bodyBold}>{formatNZD(item.price_cents)}</Text>
        </View>
        {item.description ? (
          <Text style={type.caption} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {soldOut ? (
            <Text style={[type.caption, { color: colors.achar, fontFamily: 'Inter_700Bold' }]}>
              SOLD OUT
            </Text>
          ) : (
            item.tags.map((t) => <TagBadge key={t} tag={t} />)
          )}
        </View>
      </View>
    </Pressable>
  );
}
