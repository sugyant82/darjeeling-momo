'use client';

import Link from 'next/link';
import { Koru } from '@/components/brand';
import { useT } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useT();
  return (
    <div className="container">
      <div className="card card-pad text-center stack not-found">
        <Koru className="not-found-koru" />
        <h1>{t('nf.title')}</h1>
        <p className="muted">{t('nf.body')}</p>
        <Link href="/" className="btn btn-action">
          {t('nf.back')}
        </Link>
      </div>
    </div>
  );
}
