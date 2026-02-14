import React, { memo, useMemo } from 'react';

type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
type Category = 'consistency' | 'strength' | 'volume' | 'exploration' | 'social' | 'nutrition';

interface AchievementBadgeSVGProps {
  tier: Tier;
  category: Category;
  size?: number;
  unlocked?: boolean;
  className?: string;
}

// Tier gradient color definitions
const TIER_GRADIENTS: Record<Tier, { from: string; to: string }> = {
  bronze: { from: '#CD7F32', to: '#8B4513' },
  silver: { from: '#C0C0C0', to: '#808080' },
  gold: { from: '#FFD700', to: '#DAA520' },
  platinum: { from: '#60A5FA', to: '#06B6D4' },
  diamond: { from: '#A855F7', to: '#EC4899' },
};

// Category icon SVG path data, designed for a 24x24 viewBox centered at (0, 0)
// Each path is drawn relative to center so it can be translated into position
const CATEGORY_ICONS: Record<Category, { paths: string[]; fillRule?: 'evenodd' | 'nonzero' }> = {
  // Calendar with checkmark
  consistency: {
    paths: [
      // Calendar body
      'M-7,-8 L7,-8 Q9,-8 9,-6 L9,7 Q9,9 7,9 L-7,9 Q-9,9 -9,7 L-9,-6 Q-9,-8 -7,-8 Z',
      // Calendar top bar
      'M-9,-5 L9,-5 L9,-2 L-9,-2 Z',
      // Calendar hangers
      'M-5,-10 L-5,-6 M5,-10 L5,-6',
      // Checkmark
      'M-4,3 L-1,6 L5,0',
    ],
  },
  // Lightning bolt
  strength: {
    paths: ['M1,-10 L-4,1 L0,1 L-1,10 L6,-1 L2,-1 Z'],
  },
  // Bar chart
  volume: {
    paths: [
      // Left bar
      'M-7,0 L-7,8 L-3,8 L-3,0 Z',
      // Middle bar (tallest)
      'M-1,-6 L-1,8 L3,8 L3,-6 Z',
      // Right bar
      'M5,-2 L5,8 L9,8 L9,-2 Z',
    ],
  },
  // Compass
  exploration: {
    paths: [
      // Outer ring (drawn as a circle, handled separately in render)
      'M0,-9 A9,9 0 1,1 0,9 A9,9 0 1,1 0,-9 Z M0,-7 A7,7 0 1,0 0,7 A7,7 0 1,0 0,-7 Z',
      // Compass needle (diamond shape pointing N-S)
      'M0,-6 L2.5,0 L0,6 L-2.5,0 Z',
      // North half fill indicator
      'M0,-6 L2.5,0 L0,0 L-2.5,0 Z',
    ],
    fillRule: 'evenodd',
  },
  // Two people / group
  social: {
    paths: [
      // Left person head
      'M-4,-6 A2.5,2.5 0 1,1 -4,-1 A2.5,2.5 0 1,1 -4,-6 Z',
      // Left person body
      'M-8,4 Q-8,0 -4,0 Q0,0 0,4 L0,7 L-8,7 Z',
      // Right person head
      'M5,-7 A2.5,2.5 0 1,1 5,-2 A2.5,2.5 0 1,1 5,-7 Z',
      // Right person body
      'M1,3 Q1,-1 5,-1 Q9,-1 9,3 L9,6 L1,6 Z',
    ],
  },
  // Leaf shape
  nutrition: {
    paths: [
      // Leaf body
      'M0,-9 Q8,-7 8,0 Q8,7 0,9 Q-2,4 -2,0 Q-2,-5 0,-9 Z',
      // Leaf vein (center line)
      'M0,-7 Q0,0 0,7',
      // Side veins
      'M0,-3 Q3,-2 5,-1 M0,1 Q3,2 5,4 M0,5 Q2,5 3,6',
    ],
  },
};

function AchievementBadgeSVG({
  tier,
  category,
  size = 64,
  unlocked = true,
  className = '',
}: AchievementBadgeSVGProps) {
  const gradient = TIER_GRADIENTS[tier];
  const icon = CATEGORY_ICONS[category];

  // Generate unique IDs for SVG gradients/filters per instance
  const uniqueId = useMemo(() => {
    return `badge-${tier}-${category}-${Math.random().toString(36).substring(2, 8)}`;
  }, [tier, category]);

  const ringGradientId = `${uniqueId}-ring`;
  const shieldGradientId = `${uniqueId}-shield`;
  const filterId = `${uniqueId}-grayscale`;
  const glowId = `${uniqueId}-glow`;
  const innerShadowId = `${uniqueId}-inner-shadow`;

  // The SVG viewBox is 100x100 with center at 50,50
  const viewSize = 100;
  const center = viewSize / 2;
  const outerRadius = 46;
  const ringWidth = 6;
  const innerRadius = outerRadius - ringWidth;
  const shieldRadius = 30;

  // Determine icon colors based on tier for visual richness
  const iconFill = unlocked ? '#FFFFFF' : '#9CA3AF';
  const iconStroke = unlocked ? '#FFFFFF' : '#9CA3AF';

  // Shield center gradient: slightly lighter version of the tier
  const shieldFrom = unlocked ? gradient.from : '#6B7280';
  const shieldTo = unlocked ? gradient.to : '#4B5563';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      className={className}
      role="img"
      aria-label={`${tier} ${category} achievement badge${unlocked ? '' : ' (locked)'}`}
    >
      <defs>
        {/* Outer ring gradient */}
        <linearGradient id={ringGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={unlocked ? gradient.from : '#9CA3AF'} />
          <stop offset="50%" stopColor={unlocked ? lightenColor(gradient.from, 30) : '#B0B0B0'} />
          <stop offset="100%" stopColor={unlocked ? gradient.to : '#6B7280'} />
        </linearGradient>

        {/* Shield/medallion gradient */}
        <radialGradient id={shieldGradientId} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor={lightenColor(shieldFrom, 20)} />
          <stop offset="60%" stopColor={shieldFrom} />
          <stop offset="100%" stopColor={shieldTo} />
        </radialGradient>

        {/* Glow filter for unlocked badges */}
        {unlocked && (
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.4 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}

        {/* Grayscale filter for locked badges */}
        {!unlocked && (
          <filter id={filterId}>
            <feColorMatrix type="saturate" values="0" />
          </filter>
        )}

        {/* Inner shadow for the shield */}
        <filter id={innerShadowId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      <g opacity={unlocked ? 1 : 0.55}>
        {/* Background circle - subtle dark fill */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill={unlocked ? darkenColor(gradient.to, 40) : '#374151'}
        />

        {/* Outer ring */}
        <circle
          cx={center}
          cy={center}
          r={outerRadius - ringWidth / 2}
          fill="none"
          stroke={`url(#${ringGradientId})`}
          strokeWidth={ringWidth}
        />

        {/* Decorative tick marks on the ring (like a watch bezel) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const innerTick = outerRadius - ringWidth + 1;
          const outerTick = outerRadius - 1;
          const x1 = center + innerTick * Math.cos(rad);
          const y1 = center + innerTick * Math.sin(rad);
          const x2 = center + outerTick * Math.cos(rad);
          const y2 = center + outerTick * Math.sin(rad);
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={unlocked ? lightenColor(gradient.from, 40) : '#9CA3AF'}
              strokeWidth={1}
              opacity={0.6}
            />
          );
        })}

        {/* Inner circle fill (dark background behind shield) */}
        <circle
          cx={center}
          cy={center}
          r={innerRadius - 1}
          fill={unlocked ? darkenColor(gradient.to, 50) : '#1F2937'}
        />

        {/* Shield / medallion shape */}
        <g filter={`url(#${innerShadowId})`}>
          <path
            d={createShieldPath(center, center, shieldRadius)}
            fill={`url(#${shieldGradientId})`}
          />
          {/* Shield highlight */}
          <path d={createShieldPath(center, center, shieldRadius)} fill="url(#none)" opacity={0} />
          {/* Subtle shine on top half of shield */}
          <clipPath id={`${uniqueId}-shield-clip`}>
            <path d={createShieldPath(center, center, shieldRadius)} />
          </clipPath>
          <ellipse
            cx={center - 3}
            cy={center - 10}
            rx={shieldRadius * 0.6}
            ry={shieldRadius * 0.4}
            fill="white"
            opacity={unlocked ? 0.15 : 0.05}
            clipPath={`url(#${uniqueId}-shield-clip)`}
          />
        </g>

        {/* Category icon */}
        <g
          transform={`translate(${center}, ${center}) scale(${shieldRadius / 24})`}
          filter={unlocked ? `url(#${glowId})` : undefined}
        >
          {renderCategoryIcon(category, icon, iconFill, iconStroke, unlocked)}
        </g>

        {/* Diamond tier: extra sparkle dots */}
        {tier === 'diamond' && unlocked && (
          <>
            <circle cx={center - 16} cy={center - 18} r={1.5} fill="#E9D5FF" opacity={0.8} />
            <circle cx={center + 18} cy={center - 14} r={1} fill="#F9A8D4" opacity={0.7} />
            <circle cx={center + 14} cy={center + 17} r={1.2} fill="#E9D5FF" opacity={0.6} />
            <circle cx={center - 18} cy={center + 12} r={1} fill="#F9A8D4" opacity={0.7} />
          </>
        )}

        {/* Platinum tier: subtle star accents */}
        {tier === 'platinum' && unlocked && (
          <>
            <polygon
              points={createStarPoints(center + 19, center - 19, 3, 1.2, 5)}
              fill="#93C5FD"
              opacity={0.7}
            />
            <polygon
              points={createStarPoints(center - 20, center + 16, 2.5, 1, 5)}
              fill="#67E8F9"
              opacity={0.6}
            />
          </>
        )}

        {/* Gold tier: small star */}
        {tier === 'gold' && unlocked && (
          <polygon
            points={createStarPoints(center + 17, center - 18, 3.5, 1.5, 5)}
            fill="#FDE68A"
            opacity={0.8}
          />
        )}

        {/* Lock icon overlay for locked badges */}
        {!unlocked && (
          <g transform={`translate(${center}, ${center + 2})`} opacity={0.9}>
            {/* Lock body */}
            <rect
              x={-6}
              y={-2}
              width={12}
              height={10}
              rx={2}
              fill="#6B7280"
              stroke="#9CA3AF"
              strokeWidth={1}
            />
            {/* Lock shackle */}
            <path
              d="M-4,-2 L-4,-6 A4,4 0 0,1 4,-6 L4,-2"
              fill="none"
              stroke="#9CA3AF"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            {/* Keyhole */}
            <circle cx={0} cy={3} r={1.5} fill="#9CA3AF" />
            <rect x={-0.75} y={3} width={1.5} height={3} rx={0.5} fill="#9CA3AF" />
          </g>
        )}
      </g>
    </svg>
  );
}

/**
 * Creates a shield/medallion SVG path centered at (cx, cy) with the given radius.
 * The shape is a rounded shield: wide at the top, tapering to a point at the bottom.
 */
function createShieldPath(cx: number, cy: number, r: number): string {
  const top = cy - r * 0.75;
  const bottom = cy + r * 0.85;
  const left = cx - r * 0.7;
  const right = cx + r * 0.7;
  const midY = cy + r * 0.15;
  const cornerR = r * 0.2;

  return [
    `M ${left + cornerR} ${top}`,
    `L ${right - cornerR} ${top}`,
    `Q ${right} ${top} ${right} ${top + cornerR}`,
    `L ${right} ${midY}`,
    `Q ${right} ${bottom - r * 0.2} ${cx} ${bottom}`,
    `Q ${left} ${bottom - r * 0.2} ${left} ${midY}`,
    `L ${left} ${top + cornerR}`,
    `Q ${left} ${top} ${left + cornerR} ${top}`,
    'Z',
  ].join(' ');
}

/**
 * Creates star polygon points for decorative accents
 */
function createStarPoints(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number
): string {
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    coords.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return coords.join(' ');
}

/**
 * Renders the category-specific icon as SVG elements
 */
function renderCategoryIcon(
  category: Category,
  icon: (typeof CATEGORY_ICONS)[Category],
  fill: string,
  stroke: string,
  unlocked: boolean
): React.ReactNode {
  const strokeWidth = 1.2;
  const opacity = unlocked ? 0.95 : 0.6;

  switch (category) {
    case 'consistency':
      return (
        <g opacity={opacity}>
          {/* Calendar body outline */}
          <rect
            x={-8}
            y={-7}
            width={16}
            height={16}
            rx={2}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          {/* Top bar */}
          <line x1={-8} y1={-3} x2={8} y2={-3} stroke={stroke} strokeWidth={strokeWidth} />
          {/* Hangers */}
          <line
            x1={-4}
            y1={-9}
            x2={-4}
            y2={-5}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <line
            x1={4}
            y1={-9}
            x2={4}
            y2={-5}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Checkmark */}
          <polyline
            points="-3.5,3 -0.5,6 5,1"
            fill="none"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );

    case 'strength':
      return (
        <g opacity={opacity}>
          <path d="M1,-9 L-4,0.5 L-0.5,0.5 L-1,9 L6,-0.5 L2.5,-0.5 Z" fill={fill} stroke="none" />
        </g>
      );

    case 'volume':
      return (
        <g opacity={opacity}>
          {/* Left bar */}
          <rect x={-8} y={1} width={4.5} height={8} rx={0.8} fill={fill} />
          {/* Middle bar */}
          <rect x={-2.25} y={-5} width={4.5} height={14} rx={0.8} fill={fill} />
          {/* Right bar */}
          <rect x={3.5} y={-2} width={4.5} height={11} rx={0.8} fill={fill} />
          {/* Baseline */}
          <line
            x1={-9}
            y1={9}
            x2={9}
            y2={9}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </g>
      );

    case 'exploration':
      return (
        <g opacity={opacity}>
          {/* Compass outer circle */}
          <circle cx={0} cy={0} r={9} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
          {/* Cardinal direction ticks */}
          <line x1={0} y1={-9} x2={0} y2={-7} stroke={stroke} strokeWidth={1} />
          <line x1={9} y1={0} x2={7} y2={0} stroke={stroke} strokeWidth={1} />
          <line x1={0} y1={9} x2={0} y2={7} stroke={stroke} strokeWidth={1} />
          <line x1={-9} y1={0} x2={-7} y2={0} stroke={stroke} strokeWidth={1} />
          {/* Compass needle - north (filled) */}
          <polygon points="0,-6 2,0 0,1 -2,0" fill={fill} />
          {/* Compass needle - south (outline) */}
          <polygon points="0,6 2,0 0,-1 -2,0" fill="none" stroke={stroke} strokeWidth={0.8} />
          {/* Center dot */}
          <circle cx={0} cy={0} r={1} fill={fill} />
        </g>
      );

    case 'social':
      return (
        <g opacity={opacity}>
          {/* Left person - head */}
          <circle cx={-4} cy={-4.5} r={3} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
          {/* Left person - body */}
          <path
            d="M-9,7 Q-9,1 -4,1 Q1,1 1,7"
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Right person - head */}
          <circle cx={5} cy={-5.5} r={2.5} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
          {/* Right person - body */}
          <path
            d="M0.5,6 Q0.5,0 5,0 Q9.5,0 9.5,6"
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </g>
      );

    case 'nutrition':
      return (
        <g opacity={opacity}>
          {/* Leaf body */}
          <path
            d="M0,-9 Q7,-6 7,0 Q7,6 0,9 Q-1,3 -1,0 Q-1,-5 0,-9 Z"
            fill={fill}
            fillOpacity={0.3}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          {/* Central vein */}
          <path d="M0,-7 Q0,0 0,7" fill="none" stroke={stroke} strokeWidth={0.8} />
          {/* Side veins */}
          <path d="M0,-4 Q2.5,-2.5 4.5,-1.5" fill="none" stroke={stroke} strokeWidth={0.6} />
          <path d="M0,0 Q2.5,1.5 4.5,3" fill="none" stroke={stroke} strokeWidth={0.6} />
          <path d="M0,4 Q1.5,4.5 3,5.5" fill="none" stroke={stroke} strokeWidth={0.6} />
          {/* Small stem at the bottom */}
          <path
            d="M0,9 Q-2,10.5 -3,9"
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </g>
      );

    default:
      return null;
  }
}

/**
 * Lighten a hex color by a given amount (0-100)
 */
function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(amount * 2.55));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(amount * 2.55));
  const b = Math.min(255, (num & 0xff) + Math.round(amount * 2.55));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Darken a hex color by a given amount (0-100)
 */
function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.round(amount * 2.55));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(amount * 2.55));
  const b = Math.max(0, (num & 0xff) - Math.round(amount * 2.55));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const MemoizedAchievementBadgeSVG = memo(AchievementBadgeSVG);
MemoizedAchievementBadgeSVG.displayName = 'AchievementBadgeSVG';

export default MemoizedAchievementBadgeSVG;
