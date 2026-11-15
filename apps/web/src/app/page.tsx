'use client';

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
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
} from 'lucide-react';
import { brand, isOpenNow, zonedWallTimeToUtc } from '@darjeeling/shared';
import type { LocationScheduleRow, MenuItem } from '@darjeeling/shared/types';
import { useMenu, useTodaySchedule } from '@/hooks/queries';
import { useNow } from '@/hooks/use-now';
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
  const [active, setActive] = useState<MenuItem | null>(null);

  return (
    <>
      <Splash />
      <div className="container home">
        <OpenInAppBanner />
        <Hero />
        <Marquee />
        <section id="today" className="home-section reveal-scroll" aria-labelledby="today-title">
          <SectionHead
            id="today-title"
            kicker={
              <>
                <span lang="mi">Haere mai ki te kai</span> · come and eat
              </>
            }
            title="Find the truck"
          />
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
  return (
    <section className="hero" aria-labelledby="hero-title">
      <PrayerFlags variant="light" className="hero-flags" />
      <Koru className="hero-koru hero-koru-left" />
      <Koru className="hero-koru hero-koru-right" />

      <p className="eyebrow reveal" style={delay(0)}>
        <span className="eyebrow-dot" aria-hidden="true" />
        <span lang="mi">Kia ora</span>
        <span aria-hidden="true">·</span>
        <span lang="mi">Nau mai, haere mai</span>
      </p>
      <h1 id="hero-title" className="hero-logo reveal" style={delay(90)}>
        <span className="sr-only">{appName}</span>
        <BrandLockup variant="light" />
      </h1>
      <div className="reveal" style={delay(190)}>
        <Tagline text={brand.tagline} className="hero-tagline" />
      </div>
      <p className="hero-headline reveal" style={delay(270)}>
        {brand.heroHeadline}
      </p>
      <div className="hero-ctas reveal" style={delay(360)}>
        <Link href="/menu" className="btn btn-action btn-lg btn-shine">
          Order now <ArrowRight size={20} className="btn-arrow" aria-hidden="true" />
        </Link>
        <a href="#today" className="btn btn-soft btn-lg">
          <MapPin size={18} aria-hidden="true" /> Find the truck
        </a>
      </div>
    </section>
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

/** Decorative ticker; the list is rendered twice so the loop is seamless. */
function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[...MARQUEE, ...MARQUEE].map((m, i) => (
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
  kicker: ReactNode;
  title: string;
  action?: ReactNode;
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
  return (
    <div className="bento">
      <TodayCard />
      <Link href="/menu" className="bento-card bento-order">
        <Koru className="bento-koru" />
        <span className="bento-icon">
          <UtensilsCrossed size={22} aria-hidden="true" />
        </span>
        <h3>Order ahead, skip the queue</h3>
        <p>Pick your momos, pay online and collect them hot from the truck.</p>
        <span className="bento-link">
          Browse the menu <ArrowRight size={18} className="btn-arrow" aria-hidden="true" />
        </span>
      </Link>
      <div className="bento-card bento-app">
        <span className="bento-icon">
          <Smartphone size={22} aria-hidden="true" />
        </span>
        <h3>Get the app</h3>
        <p className="muted">Order faster and get a notification the moment your momos are ready.</p>
        <StoreButtons />
      </div>
    </div>
  );
}

function TodayCard() {
  const { data, isLoading, isError } = useTodaySchedule();

  return (
    <article className="bento-card bento-today">
      <LogoMark variant="navy" className="today-mark" />
      <p className="bento-kicker">
        <span lang="mi">I tēnei rā</span> · Today at the truck
      </p>
      {isLoading ? (
        <div className="today-loading" role="status">
          <span className="sr-only">Checking today&apos;s location…</span>
          <span className="skeleton-dark" style={{ width: '40%', height: 26 }} />
          <span className="skeleton-dark" style={{ width: '75%', height: 34 }} />
          <span className="skeleton-dark" style={{ width: '60%', height: 18 }} />
        </div>
      ) : isError || !data || data.is_closed ? (
        <>
          <span className="status-chip is-closed">
            <span className="status-dot" aria-hidden="true" />
            Closed today
          </span>
          <h3 className="today-place">Off the road today</h3>
          <p className="today-detail">
            Check back soon for our next location — or browse the menu and plan your order.
          </p>
          <div className="today-actions">
            <Link href="/menu" className="btn btn-action">
              See the menu <ArrowRight size={18} className="btn-arrow" aria-hidden="true" />
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
                <dt>Opening hours</dt>
                <dd>
                  {data.open_time.slice(0, 5)}–{data.close_time.slice(0, 5)}
                </dd>
              </div>
            </div>
            <div className="today-fact">
              <Timer size={20} aria-hidden="true" />
              <div>
                <dt>Pickup slots</dt>
                <dd>Every {data.slot_minutes} min</dd>
              </div>
            </div>
          </dl>
          <div className="today-actions">
            <Link href="/menu" className="btn btn-action">
              Start your order <ArrowRight size={18} className="btn-arrow" aria-hidden="true" />
            </Link>
            {data.map_link ? (
              <a href={data.map_link} target="_blank" rel="noreferrer" className="btn btn-glass">
                <MapPin size={18} aria-hidden="true" /> Open in maps
              </a>
            ) : null}
          </div>
        </>
      )}
    </article>
  );
}

function OpenStatus({ schedule }: { schedule: LocationScheduleRow }) {
  const now = new Date(useNow());
  const openTime = schedule.open_time.slice(0, 5);
  const closeTime = schedule.close_time.slice(0, 5);
  const open = isOpenNow(
    { date: schedule.date, openTime, closeTime, isClosed: schedule.is_closed },
    now,
  );
  const [tone, label] = open
    ? ['is-open', `Open now · until ${closeTime}`]
    : now < zonedWallTimeToUtc(schedule.date, openTime)
      ? ['is-soon', `Opens at ${openTime}`]
      : ['is-closed', 'Closed for today'];

  return (
    <span className={`status-chip ${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

function Favourites({ onOpen }: { onOpen: (item: MenuItem) => void }) {
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
        kicker={
          <>
            <span lang="mi">Tino reka</span> · very delicious
          </>
        }
        title="Fan favourites"
        action={
          <Link href="/menu" className="link-arrow">
            Full menu <ArrowRight size={18} className="btn-arrow" aria-hidden="true" />
          </Link>
        }
      />
      <div className="fav-row">
        {isLoading
          ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
          : items.map((item, i) => (
              <MenuCard key={item.id} item={item} onOpen={onOpen} index={i} />
            ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    Icon: UtensilsCrossed,
    title: 'Choose your kai',
    body: (
      <>
        Browse the <span lang="mi">rārangi kai</span> (our menu) and build your order.
      </>
    ),
  },
  {
    Icon: CreditCard,
    title: 'Pay online',
    body: <>Pick a pickup time and check out in seconds.</>,
  },
  {
    Icon: Bell,
    title: 'Collect it hot',
    body: (
      <>
        Track your order live, then grab it from the truck. <span lang="mi">Ka pai!</span>
      </>
    ),
  },
];

function Steps() {
  return (
    <section className="home-section reveal-scroll" aria-labelledby="steps-title">
      <SectionHead id="steps-title" kicker="How it works" title="Hot momos in three steps" />
      <ol className="steps">
        {STEPS.map(({ Icon, title, body }, i) => (
          <li key={title} className="step">
            <span className="step-num" aria-hidden="true">
              {i + 1}
            </span>
            <span className="step-icon">
              <Icon size={22} aria-hidden="true" />
            </span>
            <h3>{title}</h3>
            <p className="muted">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
