import { useId } from 'react';

/** Round national-flag icons (simplified but recognisable) for the language switcher. */

export function FlagIndia({ size = 20 }: { size?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" role="img">
      <clipPath id={id}>
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <rect width="24" height="8" fill="#FF9933" />
        <rect y="8" width="24" height="8" fill="#FFFFFF" />
        <rect y="16" width="24" height="8" fill="#138808" />
        <circle cx="12" cy="12" r="3.1" fill="none" stroke="#000080" strokeWidth="0.7" />
        <circle cx="12" cy="12" r="0.6" fill="#000080" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * Math.PI) / 6;
          return (
            <line
              key={i}
              x1={12}
              y1={12}
              x2={12 + 3.1 * Math.cos(a)}
              y2={12 + 3.1 * Math.sin(a)}
              stroke="#000080"
              strokeWidth="0.35"
            />
          );
        })}
      </g>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
    </svg>
  );
}

export function FlagNepal({ size = 20 }: { size?: number }) {
  const id = useId();
  const CRIMSON = '#DC143C';
  const BLUE = '#003893';
  // Sun: a disc with 12 triangular rays, centred at (12, 15).
  const rays = Array.from({ length: 12 }).map((_, i) => {
    const a = (i * Math.PI) / 6;
    const [cx, cy] = [12, 15];
    const inner = 1.9;
    const outer = 3.2;
    const w = 0.28;
    const tip = `${cx + outer * Math.cos(a)},${cy + outer * Math.sin(a)}`;
    const b1 = `${cx + inner * Math.cos(a - w)},${cy + inner * Math.sin(a - w)}`;
    const b2 = `${cx + inner * Math.cos(a + w)},${cy + inner * Math.sin(a + w)}`;
    return <polygon key={i} points={`${tip} ${b1} ${b2}`} fill="#FFFFFF" />;
  });
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" role="img">
      <clipPath id={id}>
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <rect width="24" height="24" fill={CRIMSON} />
        {/* Moon (crescent) upper. */}
        <g>
          <circle cx="12" cy="7.6" r="2.3" fill="#FFFFFF" />
          <circle cx="12.7" cy="7" r="1.9" fill={CRIMSON} />
        </g>
        {/* Sun lower. */}
        {rays}
        <circle cx="12" cy="15" r="1.9" fill="#FFFFFF" />
        <circle cx="12" cy="15" r="1.2" fill={CRIMSON} />
      </g>
      <circle cx="12" cy="12" r="11" fill="none" stroke={BLUE} strokeWidth="2.2" />
    </svg>
  );
}

export function FlagNZ({ size = 20 }: { size?: number }) {
  const id = useId();
  const cantonId = `${id}-c`;
  // A southern-cross star (4-point) at (cx,cy).
  const star = (cx: number, cy: number, r: number) =>
    `${cx},${cy - r} ${cx + r * 0.28},${cy - r * 0.28} ${cx + r},${cy} ${cx + r * 0.28},${cy + r * 0.28} ${cx},${cy + r} ${cx - r * 0.28},${cy + r * 0.28} ${cx - r},${cy} ${cx - r * 0.28},${cy - r * 0.28}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" role="img">
      <clipPath id={id}>
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <rect width="24" height="24" fill="#00247D" />
        {/* Union Jack in the canton (top-left quadrant 0..12 x 0..11). */}
        <clipPath id={cantonId}>
          <rect width="12" height="11" />
        </clipPath>
        <g clipPath={`url(#${cantonId})`}>
          <path d="M0 0 L12 11 M12 0 L0 11" stroke="#FFFFFF" strokeWidth="2.4" />
          <path d="M0 0 L12 11 M12 0 L0 11" stroke="#CF142B" strokeWidth="1" />
          <path d="M6 0 V11 M0 5.5 H12" stroke="#FFFFFF" strokeWidth="3.4" />
          <path d="M6 0 V11 M0 5.5 H12" stroke="#CF142B" strokeWidth="1.8" />
        </g>
        {/* Southern Cross: four red stars with white fringe. */}
        {([
          [18, 6, 1.7],
          [20, 13, 1.5],
          [15.5, 16, 1.4],
          [17.5, 10.5, 1.2],
        ] as [number, number, number][]).map(([cx, cy, r], i) => (
          <g key={i}>
            <polygon points={star(cx, cy, r + 0.5)} fill="#FFFFFF" />
            <polygon points={star(cx, cy, r)} fill="#CF142B" />
          </g>
        ))}
      </g>
      <circle cx="12" cy="12" r="11.5" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
    </svg>
  );
}
