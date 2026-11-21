import type { CSSProperties } from 'react';
import { colors } from '@darjeeling/tokens';

/**
 * A spinning momo for data-loading states.
 *
 * A momo is rotationally symmetric, so when it spins its outline stays put and only the
 * pleats move: each pleat is a meridian of the dumpling, i.e. the right-hand outline curve
 * squeezed horizontally by sin(angle). CSS animates that squeeze (scaleX 1 → -1 → 1, with
 * pleats hidden while they travel round the back), so the pleats sweep across the front like
 * a dumpling turning on a plate. It also hops gently over a squashing shadow, with steam rising.
 * Keyframes + reduced-motion handling live in globals.css (.momo-loader …).
 */
const BODY = 'M50 27 C65 31 83 49 83 72 C83 81 17 81 17 72 C17 49 35 31 50 27 Z';
/**
 * A pleat at the very edge: the right-hand outline from the top knot, cut at 80% of the way
 * down (de Casteljau split of 'M50 27 C65 31 83 49 83 72'), so the pleats gather at the top
 * and the lower dough stays smooth — like a real momo.
 */
const MERIDIAN = 'M50 27 C62 30.2 75.9 42.4 81 58.9';
const PLEATS = 12;
const TURN_SECONDS = 2.4;

export function MomoLoader({ size = 88 }: { size?: number }) {
  return (
    <svg className="momo-loader" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <ellipse className="momo-shadow" cx="50" cy="87" rx="29" ry="4.5" />
      <g className="momo-bob">
        <g className="momo-steam" fill="none" strokeWidth="3" strokeLinecap="round">
          <path d="M42 17 C38 12 46 9 42 3" />
          <path d="M50 15 C46 10 54 7 50 1" />
          <path d="M58 17 C54 12 62 9 58 3" />
        </g>
        {/* Dough */}
        <path d={BODY} fill={colors.marigold} />
        {/* Shading under the curve of the base, and a soft highlight. */}
        <path d="M17 72 C17 81 83 81 83 72 C83 66 17 66 17 72 Z" fill={colors.achar} opacity="0.16" />
        <ellipse cx="37" cy="47" rx="6.5" ry="12" transform="rotate(-28 37 47)" fill="#FFFFFF" opacity="0.38" />
        {/* Pleats sweeping round the front. */}
        <g fill="none" stroke={colors.indigo} strokeWidth="2.6" strokeLinecap="round">
          {Array.from({ length: PLEATS }).map((_, i) => {
            const phase = i / PLEATS; // fraction of a turn this pleat is ahead
            // Frozen pose for reduced motion: front-half pleats spread across the face.
            const front = phase >= 0.5;
            const frozenScale = front ? -Math.cos(Math.PI * (phase - 0.5) * 2) : 1;
            const style = {
              animationDelay: `${(-phase * TURN_SECONDS).toFixed(2)}s`,
              '--s': frozenScale.toFixed(3),
              '--o': front ? 1 : 0,
            } as CSSProperties;
            return <path key={i} className="momo-pleat" d={MERIDIAN} style={style} />;
          })}
        </g>
        {/* Outline drawn last so the edge stays crisp, then the twisted top knot. */}
        <path d={BODY} fill="none" stroke={colors.indigo} strokeWidth="3" strokeLinejoin="round" />
        <path
          d="M45.6 28.2 C45.2 23.4 48.2 20.6 51 21.2 C54.4 21.9 55 25.4 54.4 28.2"
          fill={colors.marigold}
          stroke={colors.indigo}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path d="M49 23.8 C50.6 23.1 52 24.1 51.8 25.7" fill="none" stroke={colors.indigo} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
