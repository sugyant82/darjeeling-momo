import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
  type ListViewToken,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { router, useScrollToTop } from 'expo-router';
import { ChevronRight, Plus, ShoppingBag } from 'lucide-react-native';
import { formatNZD } from '@darjeeling/shared';
import type { MenuItem } from '@darjeeling/shared/types';
import { colors, font, radii, shadows, styles, type } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import { useMenu } from '@/hooks/queries';
import { useCart } from '@/state/cart';
import { FoodImage } from '@/components/FoodImage';
import { PressableScale } from '@/components/PressableScale';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState, ErrorState, Loading, TagBadge } from '@/components/ui';

type Section = { key: string; title: string; data: MenuItem[] };

export default function MenuScreen() {
  const { data: menu, isLoading, isError, refetch, isRefetching } = useMenu();
  const { count, totals } = useCart();
  const listRef = useRef<SectionList<MenuItem, Section>>(null);
  useScrollToTop(listRef as Parameters<typeof useScrollToTop>[0]);
  const [active, setActive] = useState(0);
  /** Ignore scroll-driven chip updates briefly after a chip tap scrolls the list. */
  const lockUntil = useRef(0);

  const sections = useMemo<Section[]>(
    () =>
      (menu ?? [])
        .filter((c) => c.items.length > 0)
        .map((c) => ({ key: c.id, title: c.name, data: c.items })),
    [menu],
  );

  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  // Must be a stable function (SectionList throws if onViewableItemsChanged changes).
  const onViewable = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    if (Date.now() < lockUntil.current) return;
    const first = viewableItems.find((v) => v.section);
    const key = (first?.section as Section | undefined)?.key;
    if (!key) return;
    const index = sectionsRef.current.findIndex((sec) => sec.key === key);
    if (index >= 0) setActive(index);
  }).current;

  const jumpTo = useCallback((index: number) => {
    haptics.select();
    setActive(index);
    lockUntil.current = Date.now() + 700;
    listRef.current?.scrollToLocation({ sectionIndex: index, itemIndex: 0, viewOffset: 4, animated: true });
  }, []);

  return (
    <View style={styles.screen}>
      <ScreenHeader kicker="Rārangi kai" title="Menu" />
      {isLoading ? (
        <Loading label="Loading the menu…" />
      ) : isError ? (
        <View style={{ padding: 16 }}>
          <ErrorState message="We couldn't load the menu." onRetry={() => refetch()} />
        </View>
      ) : sections.length === 0 ? (
        <View style={{ padding: 16 }}>
          <EmptyState title="No items yet" message="The menu is being set up. Check back soon." />
        </View>
      ) : (
        <>
          <CategoryChips sections={sections} active={active} onPress={jumpTo} />
          <SectionList
            ref={listRef}
            sections={sections}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section }) => (
              <View style={s.sectionHeader}>
                <Text style={type.h2} accessibilityRole="header">
                  {section.title}
                </Text>
                <Text style={type.caption}>
                  {section.data.length} item{section.data.length === 1 ? '' : 's'}
                </Text>
              </View>
            )}
            renderItem={({ item, index }) => <MenuRow item={item} index={index} />}
            stickySectionHeadersEnabled={false}
            onViewableItemsChanged={onViewable}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            initialNumToRender={40}
            onScrollToIndexFailed={() => {}}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            contentContainerStyle={{ padding: 16, paddingBottom: count > 0 ? 110 : 32 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => void refetch()}
                tintColor={colors.marigold}
                colors={[colors.marigold, colors.achar, colors.tealeaf]}
              />
            }
          />
          {count > 0 ? <ViewCartBar count={count} totalCents={totals.totalCents} /> : null}
        </>
      )}
    </View>
  );
}

function CategoryChips({
  sections,
  active,
  onPress,
}: {
  sections: Section[];
  active: number;
  onPress: (index: number) => void;
}) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const offsets = useRef<number[]>([]);
  // Keep the active chip in view as the list scrolls.
  useEffect(() => {
    const x = offsets.current[active];
    if (x !== undefined) scrollRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  }, [active]);
  return (
    <View style={s.chipBar}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        accessibilityRole="tablist"
      >
        {sections.map((section, i) => {
          const selected = i === active;
          return (
            <View key={section.key} onLayout={(e) => (offsets.current[i] = e.nativeEvent.layout.x)}>
              <PressableScale
                haptic={false}
                onPress={() => onPress(i)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={section.title}
                style={[s.chip, selected && s.chipActive]}
              >
                <Text style={[s.chipText, selected && { color: colors.cream }]}>{section.title}</Text>
              </PressableScale>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function MenuRow({ item, index }: { item: MenuItem; index: number }) {
  const soldOut = !item.is_available;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 45).duration(380)}>
      <PressableScale
        disabled={soldOut}
        onPress={() => router.push(`/item/${item.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${formatNZD(item.price_cents)}${soldOut ? ', sold out' : ''}`}
        accessibilityHint={soldOut ? undefined : 'Opens options and add to order'}
        accessibilityState={{ disabled: soldOut }}
        style={[styles.card, s.row, soldOut && { opacity: 0.6 }]}
      >
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={type.h3}>{item.name}</Text>
            {item.description ? (
              <Text style={type.caption} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            {item.tags.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {item.tags.map((t) => (
                  <TagBadge key={t} tag={t} />
                ))}
              </View>
            ) : null}
            <Text style={[type.price, { marginTop: 2 }]}>{formatNZD(item.price_cents)}</Text>
          </View>
          <View>
            <FoodImage url={item.image_url} size={104} radius={18} />
            {soldOut ? (
              <View style={s.soldOut}>
                <Text style={s.soldOutText}>Sold out</Text>
              </View>
            ) : (
              <View style={s.addBadge}>
                <Plus color={colors.indigo} size={20} strokeWidth={2.6} />
              </View>
            )}
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/** Floating summary bar shown while the cart has items. */
function ViewCartBar({ count, totalCents }: { count: number; totalCents: number }) {
  // This screen sits above the tab bar (which handles the bottom inset), so a fixed gap is enough.
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(18)}
      exiting={SlideOutDown.duration(200)}
      style={[s.cartBarWrap, { bottom: 12 }]}
    >
      <PressableScale
        haptic="tap"
        onPress={() => router.navigate('/cart')}
        accessibilityRole="button"
        accessibilityLabel={`View cart, ${count} item${count === 1 ? '' : 's'}, ${formatNZD(totalCents)}`}
        style={s.cartBar}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={s.cartCount}>
            <ShoppingBag color={colors.indigo} size={18} />
            <Text style={{ fontFamily: font.bold, color: colors.indigo, fontSize: 14 }}>{count}</Text>
          </View>
          <Text style={{ flex: 1, fontFamily: font.bold, color: colors.white, fontSize: 16 }}>View cart</Text>
          <Text style={{ fontFamily: font.bold, color: colors.white, fontSize: 16 }}>{formatNZD(totalCents)}</Text>
          <ChevronRight color={colors.white} size={20} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  chipBar: {
    backgroundColor: colors.cream,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  chipText: { fontFamily: font.bold, fontSize: 14, color: colors.indigo },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 10,
  },
  row: { padding: 14 },
  addBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.marigold,
    borderWidth: 3,
    borderColor: colors.card,
    ...shadows.action,
  },
  soldOut: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    backgroundColor: 'rgba(31,42,68,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: { fontFamily: font.bold, fontSize: 13, color: colors.white, textTransform: 'uppercase' },
  cartBarWrap: { position: 'absolute', left: 16, right: 16 },
  cartBar: {
    backgroundColor: colors.indigo,
    borderRadius: radii.pill,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 16,
    ...shadows.float,
  },
  cartCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.marigold,
  },
});
