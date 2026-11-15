import type { CSSProperties } from 'react';
import { colors } from '@darjeeling/tokens';
import { appName } from '@/lib/env';

/**
 * Vector brand pieces, drawn from the logo's own geometry (brand/app-icon-rounded.svg)
 * so they stay crisp at any size and can be animated part by part (splash, hero).
 * The raster logos in /public remain the canonical files for places that need an image.
 */

export type BrandVariant = 'light' | 'navy';

/** Lighter indigo used for the peaks on the navy logo. */
const PEAK_ON_NAVY = '#3A4A6E';

/** The mark: a marigold momo in front of snow-capped peaks, with steam. */
export function LogoMark({
  variant = 'light',
  className,
}: {
  variant?: BrandVariant;
  className?: string;
}) {
  const navy = variant === 'navy';
  return (
    <svg className={className} viewBox="4 52 192 140" aria-hidden="true" focusable="false">
      <g className="mk-peaks">
        <path d="M8 150 62 60 96 104 140 74 192 150Z" fill={navy ? PEAK_ON_NAVY : colors.indigo} />
        <path d="M62 60 52 76 59 72 64 78 69 72 74 76Z" fill={colors.cream} />
        <path d="M140 74 122 86 131 83 137 88 143 83 148 86Z" fill={colors.cream} />
      </g>
      <g
        className="mk-steam"
        fill="none"
        stroke={navy ? colors.cream : colors.marigold}
        strokeWidth={7}
        strokeLinecap="round"
      >
        <path d="M94 88C88 80 100 74 94 64" pathLength={1} />
        <path d="M108 86C102 78 114 72 108 62" pathLength={1} />
      </g>
      {navy ? null : (
        <ellipse className="mk-plate" cx={100} cy={184} rx={69} ry={3.8} fill={colors.achar} />
      )}
      <g className="mk-momo">
        <path
          d="M40 150C40 118 70 100 100 100C130 100 160 118 160 150C160 166 140 172 100 172C60 172 40 166 40 150Z"
          fill={colors.marigold}
          stroke={navy ? colors.indigo : colors.cream}
          strokeWidth={navy ? 6 : 12}
          style={{ paintOrder: 'stroke' }}
        />
        <path
          d="M91 103C91 92 109 92 109 103Z"
          fill={colors.marigold}
          stroke={colors.indigo}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <g fill="none" stroke={colors.indigo} strokeWidth={6} strokeLinecap="round">
          <path d="M95 105C78 112 62 126 56 148" />
          <path d="M105 105C122 112 138 126 144 148" />
          <path d="M98 106C90 118 84 132 82 154" />
          <path d="M102 106C110 118 116 132 118 154" />
        </g>
      </g>
    </svg>
  );
}

type Flag = { fill: string; outline?: string };

const FLAGS: Record<BrandVariant, Flag[]> = {
  light: [
    { fill: colors.indigo },
    { fill: colors.cream, outline: colors.indigo },
    { fill: colors.achar },
    { fill: colors.tealeaf },
    { fill: colors.marigold },
    { fill: colors.indigo },
    { fill: colors.cream, outline: colors.indigo },
    { fill: colors.achar },
    { fill: colors.tealeaf },
  ],
  navy: [
    { fill: colors.indigo, outline: colors.cream },
    { fill: colors.cream },
    { fill: colors.achar },
    { fill: colors.tealeaf },
    { fill: colors.marigold },
    { fill: colors.indigo, outline: colors.cream },
    { fill: colors.cream },
    { fill: colors.achar },
    { fill: colors.tealeaf },
  ],
};

/** y of the sagging string (a quadratic from (0,78) via (720,222) to (1440,78)) at x. */
function stringY(x: number): number {
  const t = x / 1440;
  return 78 * (1 - t) ** 2 + 444 * t * (1 - t) + 78 * t ** 2;
}

/** The string of prayer flags from the logo, in the five brand colours. */
export function PrayerFlags({
  variant = 'light',
  className,
}: {
  variant?: BrandVariant;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 60 1440 220"
      preserveAspectRatio="xMidYMin meet"
      aria-hidden="true"
      focusable="false"
    >
      {FLAGS[variant].map((flag, i) => {
        const cx = 144 + 144 * i;
        return (
          <rect
            key={i}
            className="pf-flag"
            style={{ '--i': i } as CSSProperties}
            x={cx - 46}
            y={Math.round(stringY(cx))}
            width={92}
            height={116}
            fill={flag.fill}
            stroke={flag.outline ?? 'none'}
            strokeWidth={flag.outline ? 4 : 0}
          />
        );
      })}
      <path
        className="pf-string"
        d="M0 78Q720 222 1440 78"
        fill="none"
        stroke={variant === 'navy' ? colors.cream : colors.indigo}
        strokeWidth={5}
        pathLength={1}
      />
    </svg>
  );
}

/**
 * Mark + two-line wordmark, as on the logo ("DARJEELING" over "momo"). Built from
 * the configured app name so a rename flows through: every word but the last goes
 * on the small top line. Decorative: callers provide the accessible name.
 */
export function BrandLockup({
  variant = 'light',
  compact = false,
  className = '',
}: {
  variant?: BrandVariant;
  /** Header size: the mark spans both lines and the top line is set larger to stay legible. */
  compact?: boolean;
  className?: string;
}) {
  const words = appName.trim().split(/\s+/);
  const bottom = words.pop() ?? appName;
  const top = words.join(' ');
  return (
    <span
      className={`lockup lockup-${variant}${compact ? ' lockup-compact' : ''} ${className}`}
      aria-hidden="true"
    >
      <LogoMark variant={variant} className="lockup-mark" />
      {top ? <span className="lockup-top">{top}</span> : null}
      <span className="lockup-bottom">{bottom}</span>
    </span>
  );
}

/** The tagline, allowed to wrap only at its " · " separators (never mid-phrase). */
export function Tagline({ text, className }: { text: string; className?: string }) {
  const parts = text.split(' · ');
  return (
    <p className={className}>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 ? ' · ' : null}
          <span className="nowrap">{part}</span>
        </span>
      ))}
    </p>
  );
}

/**
 * A single koru: a fern frond unfurling into a spiral. Original line drawing used as
 * an ornament; the repeating page pattern lives in /public/patterns/koru.svg.
 */
const KORU_PATH =
  'M-8 34C-8 18.7-26 18.7-26 0L-24.9-4.5-23-8.6-20.5-12.2-17.5-15.2-14.1-17.6-10.5-19.2-6.7-20.2-2.9-20.5.7-20.1 4.2-19.1 7.3-17.5 10-15.5 12.2-13.1 14-10.4 15.1-7.6 15.8-4.6 15.9-1.7 15.5 1.1 14.6 3.7 13.4 6.1 11.7 8.1 9.8 9.8 7.7 11.1 5.4 11.9 3.1 12.3.9 12.3-1.3 12-3.3 11.2-5.1 10.2-6.6 8.8-7.9 7.3-8.8 5.6-9.4 3.9-9.6 2.1-9.6.3-9.2-1.3-8.6-2.9-7.7-4.2-6.6-5.4-5.4-6.3-4.1-6.9-2.7-7.3-1.4-7.5 0-7.4';

export function Koru({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-31 -25 51 63" aria-hidden="true" focusable="false">
      <path
        d={KORU_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={0} cy={-7.4} r={4.4} fill="currentColor" />
    </svg>
  );
}
