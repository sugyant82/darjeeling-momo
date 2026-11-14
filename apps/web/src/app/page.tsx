'use client';

import Link from 'next/link';
import { MapPin, Clock } from 'lucide-react';
import { brand } from '@darjeeling/shared';
import { useTodaySchedule } from '@/hooks/queries';
import { StoreButtons, OpenInAppBanner } from '@/components/get-app';
import { Spinner } from '@/components/ui';

export default function HomePage() {
  return (
    <div className="container stack" style={{ gap: 32 }}>
      <OpenInAppBanner />

      <section
        className="card card-pad stack text-center"
        style={{ alignItems: 'center', gap: 20, paddingTop: 40, paddingBottom: 40 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-light.png"
          alt="Darjeeling Momo logo"
          width={200}
          height={167}
          style={{ height: 'auto', maxWidth: 220 }}
        />
        <p className="muted" style={{ fontWeight: 600, margin: 0 }}>
          {brand.tagline}
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 44px)', maxWidth: 640 }}>{brand.heroHeadline}</h1>
        <Link href="/menu" className="btn btn-action btn-lg">
          Order now
        </Link>
      </section>

      <TodayLocation />

      <section className="stack">
        <h2>Get the app</h2>
        <p className="muted">Order faster and get a notification the moment your momos are ready.</p>
        <StoreButtons />
      </section>
    </div>
  );
}

function TodayLocation() {
  const { data, isLoading, isError } = useTodaySchedule();

  if (isLoading) return <Spinner label="Checking today's location…" />;

  if (isError || !data || data.is_closed) {
    return (
      <section className="card card-pad stack">
        <h2>Today</h2>
        <p className="banner banner-warn">Closed today — check back soon for our next location.</p>
      </section>
    );
  }

  return (
    <section className="card card-pad stack">
      <h2>Today at the truck</h2>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <MapPin size={20} aria-hidden="true" />
        <div>
          <strong>{data.place}</strong>
          <div className="muted">{data.address}</div>
          {data.map_link ? (
            <a href={data.map_link} target="_blank" rel="noreferrer">
              Open in maps
            </a>
          ) : null}
        </div>
      </div>
      <div className="row">
        <Clock size={20} aria-hidden="true" />
        <span>
          Open {data.open_time.slice(0, 5)}–{data.close_time.slice(0, 5)}
        </span>
      </div>
      <Link href="/menu" className="btn btn-action">
        Start your order
      </Link>
    </section>
  );
}
