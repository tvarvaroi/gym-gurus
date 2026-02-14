/**
 * GuruIcon - Custom SVG icon for the Guru (Trainer) role
 * Japanese-inspired master/sensei figure with a dumbbell and wisdom aura
 */

interface GuruIconProps {
  className?: string;
  size?: number;
}

export function GuruIcon({ className = '', size = 28 }: GuruIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Wisdom aura / halo */}
      <circle cx="32" cy="18" r="14" stroke="#d4af37" strokeWidth="1.5" opacity="0.4" />
      <circle cx="32" cy="18" r="11" stroke="#c9a855" strokeWidth="1" opacity="0.25" />

      {/* Head - stylized sensei */}
      <circle cx="32" cy="18" r="7" fill="#c9a855" />

      {/* Top knot / chonmage (Japanese hair) */}
      <ellipse cx="32" cy="11" rx="3" ry="2.5" fill="#b8935e" />
      <line
        x1="32"
        y1="8.5"
        x2="32"
        y2="11"
        stroke="#b8935e"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Body - robed figure */}
      <path
        d="M22 42 L26 27 C27 25 29 24.5 32 24.5 C35 24.5 37 25 38 27 L42 42"
        fill="#c9a855"
        opacity="0.9"
      />

      {/* Robe V-neckline */}
      <path
        d="M29 25 L32 32 L35 25"
        stroke="#b8935e"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Robe belt / obi */}
      <rect x="25" y="33" width="14" height="2.5" rx="1" fill="#b8935e" />

      {/* Left arm holding dumbbell */}
      <path d="M22 42 L16 35" stroke="#c9a855" strokeWidth="3" strokeLinecap="round" />

      {/* Right arm extended (teaching gesture) */}
      <path d="M42 42 L48 33" stroke="#c9a855" strokeWidth="3" strokeLinecap="round" />

      {/* Dumbbell in left hand */}
      <rect x="10" y="33" width="4" height="2" rx="0.5" fill="#d4af37" />
      <rect x="13" y="33.5" width="3" height="1" rx="0.5" fill="#b8935e" />
      <rect x="15" y="33" width="4" height="2" rx="0.5" fill="#d4af37" />

      {/* Open palm / teaching hand (right) */}
      <circle cx="49" cy="31.5" r="2.5" fill="#c9a855" opacity="0.9" />

      {/* Wisdom energy from palm */}
      <path
        d="M51 29 L54 26"
        stroke="#d4af37"
        strokeWidth="1"
        opacity="0.5"
        strokeLinecap="round"
      />
      <path
        d="M52 31 L55 30"
        stroke="#d4af37"
        strokeWidth="1"
        opacity="0.4"
        strokeLinecap="round"
      />
      <path
        d="M51 33 L54 35"
        stroke="#d4af37"
        strokeWidth="1"
        opacity="0.3"
        strokeLinecap="round"
      />

      {/* Base / ground stance */}
      <path d="M22 42 C22 48 26 52 32 52 C38 52 42 48 42 42" fill="#b8935e" opacity="0.7" />

      {/* Kanji-inspired decorative mark on chest */}
      <path
        d="M30 28 L34 28 M32 27 L32 30"
        stroke="#000000"
        strokeWidth="0.8"
        opacity="0.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default GuruIcon;
