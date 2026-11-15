import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { router, useScrollToTop } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  Bell,
  Clock,
  CreditCard,
  MapPin,
  Navigation,
  Plus,
  Timer,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';
import { brand, formatNZD, isOpenNow, zonedWallTimeToUtc } from '@darjeeling/shared';
import type { LocationScheduleRow, MenuItem } from '@darjeeling/shared/types';
import { colors, font, MAX_CONTENT_WIDTH, radii, shadows, styles, tint, type } from '@/lib/theme';
import { appName } from '@/lib/env';
import { useMenu, useTodaySchedule } from '@/hooks/queries';
import { useNow } from '@/hooks/use-now';
import { useAuth } from '@/state/auth';
import { useIntroDelay } from '@/state/intro';
import { BrandLockup, Koru, PrayerFlags, Tagline } from '@/components/brand';
import { Button } from '@/components/Button';
import { FoodImage } from '@/components/FoodImage';
import { KoruBackground } from '@/components/KoruBackground';
import { PressableScale } from '@/components/PressableScale';
import { Spinner } from '@/components/Spinner';
import { FlagStripe, SectionTitle, TagBadge } from '@/components/ui';

const PAD = 16;

export default function HomeScreen() {
  const intro = useIntroDelay();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTop(scrollRef);
  const schedule = useTodaySchedule();
  const menu = useMenu();
  const [refreshing, setRefreshing] = useState(false);
  const todayY = useRef(0);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.allSettled([schedule.refetch(), menu.refetch()]);
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      <KoruBackground tone="indigo" opacity={0.035} />
      <HomeHeader />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[s.content, { width: contentWidth }]}
        style={{ alignSelf: 'stretch' }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.marigold}
            colors={[colors.marigold, colors.achar, colors.tealeaf]}
          />
        }
      >
        <Hero
          intro={intro}
          width={contentWidth - PAD * 2}
          onFindTruck={() => scrollRef.current?.scrollTo({ y: Math.max(0, todayY.current - 12), animated: true })}
        />
        <Marquee />
        <View style={{ gap: 14 }} onLayout={(e) => (todayY.current = e.nativeEvent.layout.y)}>
          <SectionTitle
            kicker={
              <>
                <Text accessibilityLanguage="mi">Haere mai ki te kai</Text> · come and eat
              </>
            }
            title="Find the truck"
          />
          <TodayCard query={schedule} />
          <OrderAheadCard />
        </View>
        <Favourites items={menu.data} loading={menu.isLoading} />
        <Steps />
        <FooterCard />
      </ScrollView>
    </View>
  );
}

/** Indigo bar with the compact lockup, like the website header. */
function HomeHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: colors.indigo, overflow: 'hidden' }}>
      <KoruBackground tone="cream" opacity={0.05} />
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 20 }}>
        <BrandLockup variant="navy" size={24} compact />
      </View>
      <FlagStripe />
    </View>
  );
}

function Hero({ intro, width, onFindTruck }: { intro: number; width: number; onFindTruck: () => void }) {
  const { profile } = useAuth();
  const firstName = profile?.name?.trim().split(/\s+/)[0];
  const inner = width - 40;
  const lockupSize = Math.max(44, Math.min(78, inner / 4.25));
  const flagsHeight = (width * 220) / 1440;
  const enter = (i: number) => FadeInUp.delay(intro + i * 90).duration(650).easing(Easing.out(Easing.cubic));

  return (
    <View style={[s.hero, { paddingTop: flagsHeight + 22 }]}>
      <LinearGradient colors={['#FFFFFF', '#FFFDF8', tint.pageEdge]} style={StyleSheet.absoluteFill} />
      <KoruBackground tone="indigo" opacity={0.055} />
      <FloatingKoru side="left" />
      <FloatingKoru side="right" />
      <View style={{ position: 'absolute', top: 0, left: 0 }}>
        <PrayerFlags variant="light" width={width} mode="sway" />
      </View>

      <Animated.View entering={enter(0)} style={s.eyebrow}>
        <View style={s.eyebrowDot} />
        <Text style={s.eyebrowText}>
          <Text accessibilityLanguage="mi">Kia ora{firstName ? `, ${firstName}` : ''}</Text> · <Text accessibilityLanguage="mi">Nau mai, haere mai</Text>
        </Text>
      </Animated.View>

      <Animated.View entering={enter(1)} style={{ marginTop: 18, marginBottom: 6 }}>
        <BrandLockup variant="light" size={lockupSize} />
      </Animated.View>

      <Animated.View entering={enter(2)} style={{ marginTop: 10 }}>
        <Tagline text={brand.tagline} style={s.tagline} />
      </Animated.View>

      <Animated.Text entering={enter(3)} style={s.headline} accessibilityRole="header">
        {brand.heroHeadline}
      </Animated.Text>

      <Animated.View entering={enter(4)} style={{ alignSelf: 'stretch', gap: 10, marginTop: 18 }}>
        <Button
          title="Order now"
          variant="action"
          size="lg"
          iconRight={<ArrowRight color={colors.indigo} size={20} />}
          onPress={() => router.push('/menu')}
        />
        <Button
          title="Find the truck"
          variant="outline"
          icon={<MapPin color={colors.indigo} size={18} />}
          onPress={onFindTruck}
        />
      </Animated.View>
    </View>
  );
}

/** A large koru drifting in a bottom corner of the hero. */
function FloatingKoru({ side }: { side: 'left' | 'right' }) {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    y.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    return () => cancelAnimation(y);
  }, [reduced, y]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const left = side === 'left';
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', bottom: -46, opacity: left ? 0.34 : 0.2 },
        left ? { left: -34 } : { right: -34 },
        { transform: [{ rotate: left ? '-18deg' : '18deg' }, { scaleX: left ? 1 : -1 }] },
      ]}
    >
      <Animated.View style={animated}>
        <Koru color={left ? colors.marigold : colors.achar} size={150} strokeWidth={3} />
      </Animated.View>
    </Animated.View>
  );
}

const MARQUEE: { text: string; reo?: boolean }[] = [
  { text: 'Kia ora', reo: true },
  { text: 'Steamed to order' },
  { text: 'Haere mai ki te kai', reo: true },
  { text: 'Himalayan street dumplings' },
  { text: 'Tino reka', reo: true },
  { text: 'Order ahead, skip the queue' },
  { text: 'Ngā mihi', reo: true },
  { text: 'Steamed fresh in Tāmaki Makaurau' },
];

/** Decorative ticker of te reo and English phrases (hidden from screen readers). */
function Marquee() {
  const reduced = useReducedMotion();
  const [rowWidth, setRowWidth] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!rowWidth || reduced) return;
    x.value = 0;
    x.value = withRepeat(withTiming(-rowWidth, { duration: rowWidth * 26, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(x);
  }, [rowWidth, reduced, x]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const row = (onLayout?: (w: number) => void) => (
    <View style={{ flexDirection: 'row' }} onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.width) : undefined}>
      {MARQUEE.map((m, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[s.marqueeText, m.reo && { color: colors.marigold }]}>{m.text}</Text>
          <View style={s.marqueeSep} />
        </View>
      ))}
    </View>
  );
  return (
    <View style={s.marquee} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ flexDirection: 'row', alignSelf: 'flex-start' }, animated]}>
        {row(setRowWidth)}
        {row()}
      </Animated.View>
    </View>
  );
}

type ScheduleQuery = ReturnType<typeof useTodaySchedule>;

function TodayCard({ query }: { query: ScheduleQuery }) {
  const { data, isLoading, isError } = query;
  return (
    <View style={s.today}>
      <KoruBackground tone="cream" opacity={0.06} />
      <Text style={s.todayKicker}>
        <Text accessibilityLanguage="mi">I tēnei rā</Text> · Today at the truck
      </Text>
      {isLoading ? (
        <View style={{ paddingVertical: 28, alignItems: 'center', gap: 12 }}>
          <Spinner size={34} color={colors.marigold} accessibilityLabel="Checking today's location" />
          <Text style={{ color: tint.creamMuted, fontFamily: font.semibold }}>Checking today&apos;s location…</Text>
        </View>
      ) : isError || !data || data.is_closed ? (
        <View style={{ gap: 10 }}>
          <StatusChip tone="closed" label="Closed today" />
          <Text style={s.todayPlace}>Off the road today</Text>
          <Text style={s.todayMuted}>Check back soon for our next location — or browse the menu and plan your order.</Text>
          <Button
            title="See the menu"
            variant="action"
            iconRight={<ArrowRight color={colors.indigo} size={18} />}
            onPress={() => router.push('/menu')}
            style={{ alignSelf: 'flex-start', marginTop: 6 }}
          />
        </View>
      ) : (
        <OpenToday schedule={data} />
      )}
    </View>
  );
}

function OpenToday({ schedule }: { schedule: LocationScheduleRow }) {
  const now = new Date(useNow());
  const openTime = schedule.open_time.slice(0, 5);
  const closeTime = schedule.close_time.slice(0, 5);
  const open = isOpenNow({ date: schedule.date, openTime, closeTime, isClosed: schedule.is_closed }, now);
  const status: { tone: 'open' | 'soon' | 'closed'; label: string } = open
    ? { tone: 'open', label: `Open now · until ${closeTime}` }
    : now < zonedWallTimeToUtc(schedule.date, openTime)
      ? { tone: 'soon', label: `Opens at ${openTime}` }
      : { tone: 'closed', label: 'Closed for today' };

  return (
    <View style={{ gap: 10 }}>
      <StatusChip tone={status.tone} label={status.label} />
      <Text style={s.todayPlace}>{schedule.place}</Text>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <MapPin color={colors.marigold} size={18} style={{ marginTop: 2 }} />
        <Text style={[s.todayMuted, { flex: 1 }]}>{schedule.address}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <Fact Icon={Clock} label="Opening hours" value={`${openTime}–${closeTime}`} />
        <Fact Icon={Timer} label="Pickup slots" value={`Every ${schedule.slot_minutes} min`} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
        <Button
          title="Start your order"
          variant="action"
          iconRight={<ArrowRight color={colors.indigo} size={18} />}
          onPress={() => router.push('/menu')}
        />
        {schedule.map_link ? (
          <Button
            title="Directions"
            variant="glass"
            icon={<Navigation color={colors.white} size={17} />}
            onPress={() => Linking.openURL(schedule.map_link as string).catch(() => {})}
          />
        ) : null}
      </View>
    </View>
  );
}

function StatusChip({ tone, label }: { tone: 'open' | 'soon' | 'closed'; label: string }) {
  const color = tone === 'open' ? tint.openGreen : tone === 'soon' ? colors.marigold : tint.closedRed;
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (tone !== 'open' || reduced) return;
    pulse.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(pulse);
  }, [tone, reduced, pulse]);
  const ring = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 1.6 }],
  }));
  return (
    <View style={s.chip} accessibilityLabel={label}>
      <View style={{ width: 8, height: 8 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 4, backgroundColor: color }, ring]} />
        <View style={[StyleSheet.absoluteFill, { borderRadius: 4, backgroundColor: color }]} />
      </View>
      <Text style={{ color, fontFamily: font.bold, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

function Fact({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={s.fact}>
      <Icon color={colors.marigold} size={20} />
      <View style={{ flexShrink: 1 }}>
        <Text style={{ color: 'rgba(251,246,236,0.65)', fontFamily: font.regular, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: colors.white, fontFamily: font.bold, fontSize: 15 }} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function OrderAheadCard() {
  return (
    <PressableScale
      onPress={() => router.push('/menu')}
      accessibilityRole="button"
      accessibilityLabel="Order ahead, skip the queue. Browse the menu"
      style={s.orderAhead}
    >
      <View style={{ position: 'absolute', top: -30, right: -20, opacity: 0.14, transform: [{ rotate: '20deg' }] }}>
        <Koru color={colors.indigo} size={130} />
      </View>
      <View style={[s.iconTile, { backgroundColor: colors.indigo }]}>
        <UtensilsCrossed color={colors.marigold} size={22} />
      </View>
      <Text style={[type.h2, { marginTop: 14 }]}>Order ahead, skip the queue</Text>
      <Text style={[type.body, { marginTop: 4 }]}>Pick your momos, pay in the app and collect them hot from the truck.</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 16, color: colors.indigo }}>Browse the menu</Text>
        <ArrowRight color={colors.indigo} size={18} />
      </View>
    </PressableScale>
  );
}

function Favourites({ items, loading }: { items: ReturnType<typeof useMenu>['data']; loading: boolean }) {
  const favourites = useMemo(() => {
    const available = (items ?? []).flatMap((c) => c.items).filter((i) => i.is_available);
    const best = available.filter((i) => i.tags.includes('bestseller'));
    return (best.length > 0 ? best : available).slice(0, 6);
  }, [items]);

  if (!loading && favourites.length === 0) return null;

  return (
    <View style={{ gap: 14 }}>
      <SectionTitle
        kicker={
          <>
            <Text accessibilityLanguage="mi">Tino reka</Text> · very delicious
          </>
        }
        title="Fan favourites"
        right={
          <Button
            title="Full menu"
            variant="ghost"
            size="sm"
            iconRight={<ArrowRight color={colors.indigo} size={16} />}
            onPress={() => router.push('/menu')}
          />
        }
      />
      {loading ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <Spinner size={34} accessibilityLabel="Loading favourites" />
        </View>
      ) : (
        <FlatList
          horizontal
          data={favourites}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <FavouriteCard item={item} />}
          showsHorizontalScrollIndicator={false}
          snapToInterval={FAV_WIDTH + 14}
          decelerationRate="fast"
          contentContainerStyle={{ gap: 14, paddingHorizontal: PAD, paddingVertical: 4 }}
          style={{ marginHorizontal: -PAD }}
        />
      )}
    </View>
  );
}

const FAV_WIDTH = 220;

function FavouriteCard({ item }: { item: MenuItem }) {
  return (
    <PressableScale
      onPress={() => router.push(`/item/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatNZD(item.price_cents)}. Add to order`}
      style={[styles.card, { width: FAV_WIDTH, padding: 0, gap: 0, overflow: 'hidden' }]}
    >
      <FoodImage url={item.image_url} size={{ width: '100%', height: 130 }} radius={0} />
      <View style={{ padding: 14, gap: 6 }}>
        <Text style={type.h3} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 22 }}>
          {item.tags.slice(0, 2).map((t) => (
            <TagBadge key={t} tag={t} />
          ))}
        </View>
        <View style={[styles.rowBetween, { marginTop: 4 }]}>
          <Text style={type.price}>{formatNZD(item.price_cents)}</Text>
          <View style={s.addBadge}>
            <Plus color={colors.indigo} size={18} strokeWidth={2.6} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const STEPS: { Icon: LucideIcon; title: string; body: React.ReactNode }[] = [
  {
    Icon: UtensilsCrossed,
    title: 'Choose your kai',
    body: (
      <>
        Browse the <Text accessibilityLanguage="mi">rārangi kai</Text> (our menu) and build your order.
      </>
    ),
  },
  { Icon: CreditCard, title: 'Pay in the app', body: 'Pick a pickup time and check out in seconds.' },
  {
    Icon: Bell,
    title: 'Collect it hot',
    body: (
      <>
        Track your order live, then grab it from the truck. <Text accessibilityLanguage="mi">Ka pai!</Text>
      </>
    ),
  },
];

function Steps() {
  return (
    <View style={{ gap: 14 }}>
      <SectionTitle kicker="How it works" title="Hot momos in three steps" />
      {STEPS.map(({ Icon, title, body }, i) => (
        <View key={title} style={[styles.card, { flexDirection: 'row', gap: 14, alignItems: 'center' }]}>
          <View style={[s.iconTile, { backgroundColor: colors.indigo }]}>
            <Icon color={colors.marigold} size={22} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={type.h3}>{title}</Text>
            <Text style={type.caption}>{body}</Text>
          </View>
          <Text style={s.stepNum} accessibilityElementsHidden>
            {i + 1}
          </Text>
        </View>
      ))}
    </View>
  );
}

function FooterCard() {
  return (
    <View style={s.footer}>
      <KoruBackground tone="cream" opacity={0.05} />
      <View style={s.footerLogo}>
        <Image
          source={require('../../assets/logo-navy.png')}
          style={{ width: '100%', aspectRatio: 640 / 344 }}
          contentFit="contain"
          accessibilityLabel={`${appName} logo`}
        />
      </View>
      <Tagline text={brand.tagline} style={s.footerTagline} />
      <Text style={s.footerText}>
        <Text accessibilityLanguage="mi" style={{ color: colors.marigold, fontFamily: font.bold }}>
          Ngā mihi nui
        </Text>{' '}
        — thank you for backing a local food truck.
      </Text>
      <Text style={[s.footerText, { opacity: 0.7 }]}>
        <Text accessibilityLanguage="mi">Ka kite anō</Text> — see you at the truck!
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  content: { alignSelf: 'center', padding: PAD, paddingBottom: 40, gap: 30 },
  hero: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 26,
    ...shadows.card,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.85)',
    maxWidth: '100%',
  },
  eyebrowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.tealeaf },
  eyebrowText: { fontFamily: font.bold, fontSize: 13, color: colors.indigo, flexShrink: 1 },
  tagline: { fontFamily: font.heading, fontSize: 17, lineHeight: 24, color: colors.tealeaf, textAlign: 'center' },
  headline: {
    marginTop: 8,
    fontFamily: font.display,
    fontSize: 28,
    lineHeight: 32,
    color: colors.indigo,
    textAlign: 'center',
    maxWidth: 320,
  },
  marquee: {
    backgroundColor: colors.indigo,
    borderRadius: radii.pill,
    overflow: 'hidden',
    paddingVertical: 14,
    ...shadows.card,
  },
  marqueeText: { fontFamily: font.heading, fontSize: 16, color: colors.cream },
  marqueeSep: {
    width: 7,
    height: 7,
    borderRadius: 2,
    marginHorizontal: 18,
    backgroundColor: 'rgba(251,246,236,0.45)',
    transform: [{ rotate: '45deg' }],
  },
  today: {
    backgroundColor: colors.indigo,
    borderRadius: radii.xl,
    padding: 22,
    gap: 12,
    overflow: 'hidden',
    ...shadows.card,
  },
  todayKicker: { ...type.kicker, color: colors.marigold },
  todayPlace: { fontFamily: font.display, fontSize: 26, lineHeight: 32, color: colors.white },
  todayMuted: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: tint.creamMuted },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  fact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  orderAhead: {
    backgroundColor: colors.marigold,
    borderRadius: radii.xl,
    padding: 22,
    overflow: 'hidden',
    ...shadows.card,
  },
  iconTile: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  addBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.marigold,
    ...shadows.action,
  },
  stepNum: { fontFamily: font.display, fontSize: 40, lineHeight: 46, color: 'rgba(232,163,61,0.4)' },
  footer: {
    backgroundColor: colors.indigo,
    borderRadius: radii.xl,
    padding: 22,
    gap: 12,
    overflow: 'hidden',
    alignItems: 'center',
  },
  footerLogo: {
    width: '100%',
    maxWidth: 300,
    padding: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(251,246,236,0.14)',
    backgroundColor: colors.indigo,
  },
  footerTagline: { fontFamily: font.heading, fontSize: 16, lineHeight: 22, color: colors.cream, textAlign: 'center' },
  footerText: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: tint.creamMuted, textAlign: 'center' },
});
