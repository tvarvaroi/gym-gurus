/**
 * RoninIcon - Custom SVG icon for the Ronin (Solo) role
 * A lone samurai warrior with katana and subtle AI circuit patterns
 */

interface RoninIconProps {
  className?: string;
  size?: number;
}

export function RoninIcon({ className = '', size = 28 }: RoninIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* AI circuit pattern background (subtle) */}
      <path
        d="M10 52 L10 48 L14 48"
        stroke="#6366f1"
        strokeWidth="0.8"
        opacity="0.2"
        strokeLinecap="round"
      />
      <circle cx="14" cy="48" r="1" fill="#6366f1" opacity="0.2" />
      <path
        d="M54 52 L54 48 L50 48"
        stroke="#6366f1"
        strokeWidth="0.8"
        opacity="0.2"
        strokeLinecap="round"
      />
      <circle cx="50" cy="48" r="1" fill="#6366f1" opacity="0.2" />
      <path
        d="M10 12 L10 16 L14 16"
        stroke="#a855f7"
        strokeWidth="0.8"
        opacity="0.15"
        strokeLinecap="round"
      />
      <path
        d="M54 12 L54 16 L50 16"
        stroke="#a855f7"
        strokeWidth="0.8"
        opacity="0.15"
        strokeLinecap="round"
      />

      {/* Ronin straw hat (kasa) */}
      <ellipse cx="32" cy="14" rx="12" ry="4" fill="#8b5cf6" opacity="0.7" />
      <path d="M20 14 C20 10 26 6 32 6 C38 6 44 10 44 14" fill="#a855f7" opacity="0.9" />
      {/* Hat rim highlight */}
      <ellipse cx="32" cy="14" rx="12" ry="2" fill="#6366f1" opacity="0.3" />

      {/* Head (partially hidden under hat) */}
      <circle cx="32" cy="18" r="5" fill="#a855f7" opacity="0.85" />

      {/* Face shadow under hat */}
      <path d="M27 16 C27 16 29 18 32 18 C35 18 37 16 37 16" fill="#6366f1" opacity="0.3" />

      {/* Eyes (determined gaze) */}
      <line
        x1="29"
        y1="18"
        x2="31"
        y2="18"
        stroke="#ffffff"
        strokeWidth="1"
        opacity="0.8"
        strokeLinecap="round"
      />
      <line
        x1="33"
        y1="18"
        x2="35"
        y2="18"
        stroke="#ffffff"
        strokeWidth="1"
        opacity="0.8"
        strokeLinecap="round"
      />

      {/* Body - lone warrior haori (jacket) */}
      <path
        d="M23 44 L26 24 C27 22.5 29.5 22 32 22 C34.5 22 37 22.5 38 24 L41 44"
        fill="#a855f7"
        opacity="0.85"
      />

      {/* Haori opening */}
      <path
        d="M30 23 L32 30 L34 23"
        stroke="#6366f1"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Inner garment visible */}
      <path d="M30.5 24 L32 30 L33.5 24" fill="#6366f1" opacity="0.4" />

      {/* Belt / obi */}
      <rect x="25" y="34" width="14" height="2.5" rx="1" fill="#6366f1" />

      {/* Left arm */}
      <path d="M23 44 L19 34" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />

      {/* Right arm holding katana */}
      <path d="M41 44 L44 32" stroke="#a855f7" strokeWidth="3" strokeLinecap="round" />

      {/* Katana */}
      {/* Handle (tsuka) */}
      <path d="M44 33 L46 28" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />
      {/* Guard (tsuba) */}
      <ellipse cx="46.5" cy="27" rx="2" ry="1" fill="#6366f1" />
      {/* Blade */}
      <path d="M46.5 26 L50 10" stroke="#e5e4e2" strokeWidth="1.5" strokeLinecap="round" />
      {/* Blade edge highlight */}
      <path
        d="M47 25 L50.5 10"
        stroke="#ffffff"
        strokeWidth="0.5"
        opacity="0.5"
        strokeLinecap="round"
      />

      {/* Left hand */}
      <circle cx="18" cy="33" r="2" fill="#a855f7" opacity="0.85" />

      {/* Legs */}
      <path d="M28 44 L24 56" stroke="#8b5cf6" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M36 44 L40 56" stroke="#8b5cf6" strokeWidth="3.5" strokeLinecap="round" />

      {/* Sandals (waraji) */}
      <ellipse cx="23" cy="57.5" rx="3.5" ry="1.5" fill="#6366f1" opacity="0.7" />
      <ellipse cx="41" cy="57.5" rx="3.5" ry="1.5" fill="#6366f1" opacity="0.7" />

      {/* Wind/spirit effect (lone warrior aura) */}
      <path
        d="M14 38 C16 36 18 37 16 39"
        stroke="#a855f7"
        strokeWidth="1"
        opacity="0.3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M12 42 C14 40 16 41 14 43"
        stroke="#a855f7"
        strokeWidth="1"
        opacity="0.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* AI data pulse on left wrist (technology element) */}
      <circle
        cx="18"
        cy="36"
        r="1.5"
        stroke="#6366f1"
        strokeWidth="0.8"
        opacity="0.4"
        fill="none"
      />
      <circle cx="18" cy="36" r="0.5" fill="#6366f1" opacity="0.6" />
    </svg>
  );
}

export default RoninIcon;
