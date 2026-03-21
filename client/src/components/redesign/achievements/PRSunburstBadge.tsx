import { memo } from 'react';

interface PRSunburstBadgeProps {
  rank: 1 | 2 | 3;
  size?: number;
  className?: string;
}

const RANK_CONFIG = {
  1: {
    outerColor: '#F59E0B',
    innerColor: '#FCD34D',
    textColor: '#78350F',
    rayColor: '#FBBF24',
    rayOpacity: 0.55,
    rayCount: 8,
    rayLengthRatio: 0.22,
    strokeWidth: 2.5,
    label: '1',
    // Subtle highlight ring
    highlightRing: true,
  },
  2: {
    outerColor: '#9CA3AF',
    innerColor: '#D1D5DB',
    textColor: '#374151',
    rayColor: '#9CA3AF',
    rayOpacity: 0.35,
    rayCount: 6,
    rayLengthRatio: 0.16,
    strokeWidth: 2,
    label: '2',
    highlightRing: false,
  },
  3: {
    outerColor: '#92400E',
    innerColor: '#B45309',
    textColor: '#FDE68A',
    rayColor: '#B45309',
    rayOpacity: 0.3,
    rayCount: 6,
    rayLengthRatio: 0.14,
    strokeWidth: 2,
    label: '3',
    highlightRing: false,
  },
} as const;

function PRSunburstBadgeInner({ rank, size = 48, className = '' }: PRSunburstBadgeProps) {
  const cfg = RANK_CONFIG[rank];
  const cx = size / 2;
  const cy = size / 2;
  const medalRadius = size * 0.32;
  const innerRadius = size * 0.24;
  const rayStart = medalRadius + size * 0.04;
  const rayEnd = rayStart + size * cfg.rayLengthRatio;

  const rays = Array.from({ length: cfg.rayCount }, (_, i) => {
    const angle = (i * 360) / cfg.rayCount - 90;
    const rad = (angle * Math.PI) / 180;
    return {
      x1: cx + rayStart * Math.cos(rad),
      y1: cy + rayStart * Math.sin(rad),
      x2: cx + rayEnd * Math.cos(rad),
      y2: cy + rayEnd * Math.sin(rad),
    };
  });

  const gradId = `pr-grad-${rank}`;
  const shadowId = `pr-shadow-${rank}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={`Rank ${rank} personal record`}
    >
      <defs>
        <radialGradient id={gradId} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor={cfg.innerColor} />
          <stop offset="100%" stopColor={cfg.outerColor} />
        </radialGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Sunburst rays */}
      {rays.map((ray, i) => (
        <line
          key={i}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          stroke={cfg.rayColor}
          strokeWidth={cfg.strokeWidth}
          strokeOpacity={cfg.rayOpacity}
          strokeLinecap="round"
        />
      ))}

      {/* Medal outer circle with shadow */}
      <circle
        cx={cx}
        cy={cy}
        r={medalRadius}
        fill={`url(#${gradId})`}
        filter={`url(#${shadowId})`}
      />

      {/* Medal inner circle */}
      <circle cx={cx} cy={cy} r={innerRadius} fill={cfg.innerColor} opacity={0.95} />

      {/* White highlight ring on gold */}
      {cfg.highlightRing && (
        <circle
          cx={cx}
          cy={cy}
          r={innerRadius - size * 0.02}
          fill="none"
          stroke="white"
          strokeWidth={0.8}
          opacity={0.4}
        />
      )}

      {/* Rank number */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.28}
        fontWeight="bold"
        fill={cfg.textColor}
        fontFamily="system-ui, sans-serif"
      >
        {cfg.label}
      </text>
    </svg>
  );
}

export const PRSunburstBadge = memo(PRSunburstBadgeInner);
PRSunburstBadge.displayName = 'PRSunburstBadge';
