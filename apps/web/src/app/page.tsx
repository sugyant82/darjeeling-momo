'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Clock,
  CreditCard,
  MapPin,
  Smartphone,
  Timer,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { isOpenNow, zonedWallTimeToUtc } from '@darjeeling/shared';
import type { LocationScheduleRow, MenuItem } from '@darjeeling/shared/types';
import { useMenu, useTodaySchedule } from '@/hooks/queries';
import { useNow } from '@/hooks/use-now';
import { useT, useVenue, type MsgKey } from '@/lib/i18n';
import { usePrefs } from '@/components/prefs-context';
import { StoreButtons, OpenInAppBanner } from '@/components/get-app';
import { BrandLockup, Koru, LogoMark, PrayerFlags, Tagline } from '@/components/brand';
import { Splash } from '@/components/splash';
import { MenuCard } from '@/components/menu-card';
import { ItemSheet } from '@/components/item-sheet';
import { SkeletonCard } from '@/components/ui';
import { appName } from '@/lib/env';

/** Stagger offset for an intro animation (see .reveal in globals.css). */
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

export default function HomePage() {
  const { t } = useT();
  const { noun: venue } = useVenue();
  const [active, setActive] = useState<MenuItem | null>(null);

  return (
    <>
      <Splash />
      <div className="container home">
        <OpenInAppBanner />
        <Hero />
        <Marquee />
        <section id="today" className="home-section reveal-scroll" aria-labelledby="today-title">
          <SectionHead id="today-title" kicker={t('home.comeEat')} title={t('home.findTruckTitle', { venue })} />
          <Bento />
        </section>
        <Favourites onOpen={setActive} />
        <Steps />
      </div>
      {active ? <ItemSheet item={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}

function Hero() {
  const { t } = useT();
  const { noun: venue } = useVenue();
  const { theme } = usePrefs();
  // On the dark hero the cream-on-navy wordmark reads; on light use the indigo-on-cream one.
  const variant = theme === 'dark' ? 'navy' : 'light';
  return (
    <section className="hero" aria-labelledby="hero-title">
      <PrayerFlags variant={variant} className="hero-flags" />
      <Koru className="hero-koru hero-koru-left" />
      <Koru className="hero-koru hero-koru-right" />

      <p className="eyebrow reveal" style={delay(0)}>
        <span className="eyebrow-dot" aria-hidden="true" />
        <span>{t('greet.kiaora')}</span>
        <span aria-hidden="true">·</span>
        <span>{t('greet.welcome')}</span>
      </p>
      <h1 id="hero-title" className="hero-logo reveal" style={delay(90)}>
        <span className="sr-only">{appName}</span>
        <BrandLockup variant={variant} />
      </h1>
      <div className="reveal" style={delay(190)}>
        <Tagline text={t('brand.tagline')} className="hero-tagline" />
      </div>
      <p className="hero-headline reveal" style={delay(270)}>
        {t('brand.headline')}
      </p>
      <div className="hero-ctas reveal" style={delay(360)}>
        <Link href="/menu" className="btn btn-action btn-lg btn-shine">
          {t('home.orderNow')} <ArrowRight size={20} className="btn-arrow" aria-hidden="true" />
        </Link>
        <a href="#today" className="btn btn-soft btn-lg">
          <MapPin size={18} aria-hidden="true" /> {t('home.findVenue', { venue })}
        </a>
      </div>
    </section>
  );
}

/** Decorative ticker: greetings (te reo) plus short English/Hindi phrases. */
function Marquee() {
  const { t } = useT();
  const items: { text: string; reo?: boolean }[] = [
    { text: t('greet.kiaora'), reo: true },
    { text: t('home.m1') },
    { text: t('home.m2') },
    { text: t('greet.thanks'), reo: true },
    { text: t('home.m3') },
    { text: t('home.m4') },
  ];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[...items, ...items].map((m, i) => (
          <span key={i} className={`marquee-item${m.reo ? ' is-reo' : ''}`}>
            {m.text}
            <span className="marquee-sep" />
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionHead({
  id,
  kicker,
  title,
  action,
}: {
  id: string;
  kicker: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <p className="kicker">{kicker}</p>
        <h2 id={id}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function Bento() {
  const { t } = useT();
  const { noun: venue } = useVenue();
  return (
    <div className="bento">
      <TodayCard />
      <Link href="/menu" className="bento-card bento-order">
        <Koru className="bento-koru" />
        <span className="bento-icon">
          <UtensilsCrossed size={22} aria-hidden="true" />
        </span>
        <h3>{t('home.orderAheadTitle')}</h3>
        <p>{t('home.orderAheadBody', { venue })}</p>
        <span className="bento-link">
          {t('home.browseMenu')} <ArrowRight size={18} className="btn-arrow" aria-hidden="true" />
        </span>
      </Link>
      <div className="bento-card bento-app">
        <span className="bento-icon">
          <Smartphone size={22} aria-hidden="true" />
        </span>
        <h3>{t('home.getApp')}</h3>
        <p className="muted">{t('home.getAppBody')}</p>
        <StoreButtons />
      </div>
    </div>
  );
}

function TodayCard() {
  const { t } = useT();
  const { noun: venue } = useVenue();
  const { data, isLoading, isError } = useTodaySchedule();

  return (
    <article className="bento-card bento-today">
      <LogoMark variant="navy" className="today-mark" />
      <p className="bento-kicker">{t('home.todayKicker', { venue })}</p>
      {isLoading ? (
        <div className="today-loading" role="status">
          <span className="sr-only">{t('ui.loading')}</span>
          <span className="skeleton-dark" style={{ width: '40%', height: 26 }} />
          <span className="skeleton-dark" style={{ width: '75%', height: 34 }} />
          <span className="skeleton-dark" style={{ width: '60%', height: 18 }} />
        </div>
      ) : isError || !data || data.is_closed ? (
        <>
          <span className="status-chip is-closed">
            <span className="status-dot" aria-hidden="true" />
            {t('home.closedTodayChip')}
          </span>
          <h3 className="today-place">{t('home.offRoad', { venue })}</h3>
          <p className="today-detail">{t('home.offRoadBody')}</p>
          <div className="today-actions">
            <Link href="/menu" className="btn btn-action">
              {t('home.seeMenu')} <ArrowRight size={18} className="btn-arrow" aria-hidden="true" />
            </Link>
          </div>
        </>
      ) : (
        <>
          <OpenStatus schedule={data} />
          <h3 className="today-place">{data.place}</h3>
          <p className="today-detail">
            <MapPin size={18} aria-hidden="true" />
            {data.address}
          </p>
          <dl className="today-facts">
            <div className="today-fact">
              <Clock size={20} aria-hidden="true" />
              <div>
                <dt>{t('home.openingHours')}</dt>
                <dd>
                  {data.open_time.slice(0, 5)}–{data.close_time.slice(0, 5)}
                </dd>
              </div>
            </div>
            <div className="today-fact">
              <Timer size={20} aria-hidden="true" />
              <div>
                <dt>{t('home.pickupSlots')}</dt>
                <dd>{t('home.everyMin', { n: data.slot_minutes })}</dd>
              </div>
            </div>
          </dl>
          <div className="today-actions">
            <Link href="/menu" className="btn btn-action">
              {t('home.startOrder')} <ArrowRight size={18} className="btn-arrow" aria-hidden="true" />
            </Link>
            {data.map_link ? (
              <a href={data.map_link} target="_blank" rel="noreferrer" className="btn btn-glass">
                <MapPin size={18} aria-hidden="true" /> {t('home.openInMaps')}
              </a>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}

function OpenStatus({ schedule }: { schedule: LocationScheduleRow }) {
  const { t } = useT();
  const now = new Date(useNow());
  const openTime = schedule.open_time.slice(0, 5);
  const closeTime = schedule.close_time.slice(0, 5);
  const open = isOpenNow({ date: schedule.date, openTime, closeTime, isClosed: schedule.is_closed }, now);
  const [tone, label] = open
    ? ['is-open', t('home.openNow', { time: closeTime })]
    : now < zonedWallTimeToUtc(schedule.date, openTime)
      ? ['is-soon', t('home.opensAt', { time: openTime })]
      : ['is-closed', t('home.closedForToday')];

  return (
    <span className={`status-chip ${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

function Favourites({ onOpen }: { onOpen: (item: MenuItem) => void }) {
  const { t } = useT();
  const { data: menu, isLoading, isError } = useMenu();
  const items = useMemo(() => {
    const available = (menu ?? []).flatMap((c) => c.items).filter((i) => i.is_available);
    const bestsellers = available.filter((i) => i.tags.includes('bestseller'));
    return (bestsellers.length > 0 ? bestsellers : available).slice(0, 3);
  }, [menu]);

  if (isError || (!isLoading && items.length === 0)) return null;

  return (
    <section className="home-section reveal-scroll" aria-labelledby="fav-title">
      <SectionHead
        id="fav-title"
        kicker={t('home.favKicker')}
        title={t('home.favTitle')}
        action={
          <Link href="/menu" className="link-arrow">
            {t('home.fullMenu')} <ArrowRight size={18} className="btn-arrow" aria-hidden="true" />
          </Link>
        }
      />
      <div className="fav-row">
        {isLoading
          ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
          : items.map((item, i) => <MenuCard key={item.id} item={item} onOpen={onOpen} index={i} />)}
      </div>
    </section>
  );
}

const STEPS: { Icon: LucideIcon; titleKey: MsgKey; bodyKey: MsgKey }[] = [
  { Icon: UtensilsCrossed, titleKey: 'home.step1Title', bodyKey: 'home.step1Body' },
  { Icon: CreditCard, titleKey: 'home.step2Title', bodyKey: 'home.step2Body' },
  { Icon: Bell, titleKey: 'home.step3Title', bodyKey: 'home.step3Body' },
];

function Steps() {
  const { t } = useT();
  const { noun: venue } = useVenue();
  return (
    <section className="home-section reveal-scroll" aria-labelledby="steps-title">
      <SectionHead id="steps-title" kicker={t('home.howKicker')} title={t('home.howTitle')} />
      <ol className="steps">
        {STEPS.map(({ Icon, titleKey, bodyKey }, i) => (
          <li key={titleKey} className="step">
            <span className="step-num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="step-icon">
              <Icon size={22} aria-hidden="true" />
            </span>
            <h3>{t(titleKey)}</h3>
            <p className="muted">{t(bodyKey, { venue })}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
