/**
 * DiscipleIcon - Custom SVG icon for the Disciple (Client) role
 * A dedicated student/warrior in training stance with energy of growth
 */

interface DiscipleIconProps {
  className?: string;
  size?: number;
}

export function DiscipleIcon({ className = '', size = 28 }: DiscipleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Growth energy arcs */}
      <path
        d="M20 50 C18 40 22 28 32 22"
        stroke="#14b8a6"
        strokeWidth="1"
        opacity="0.3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M44 50 C46 40 42 28 32 22"
        stroke="#14b8a6"
        strokeWidth="1"
        opacity="0.3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Head */}
      <circle cx="32" cy="16" r="6.5" fill="#0d9488" />

      {/* Headband - sign of dedication */}
      <path
        d="M25.5 15 C26 13 29 12 32 12 C35 12 38 13 38.5 15"
        stroke="#14b8a6"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Headband tails */}
      <path d="M38.5 14 L42 16" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M39 15 L43 18" stroke="#14b8a6" strokeWidth="1.5" strokeLinecap="round" />

      {/* Body - training gi / athletic build */}
      <path
        d="M24 42 L27 24 C28 22.5 30 22 32 22 C34 22 36 22.5 37 24 L40 42"
        fill="#0d9488"
        opacity="0.9"
      />

      {/* Gi neckline */}
      <path
        d="M29.5 22.5 L32 28 L34.5 22.5"
        stroke="#0f766e"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />

      {/* Belt */}
      <rect x="26" y="32" width="12" height="2" rx="1" fill="#0f766e" />

      {/* Left arm - fist raised (determination) */}
      <path d="M24 42 L18 30" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" />
      {/* Raised fist */}
      <circle cx="17" cy="28.5" r="2.5" fill="#0d9488" />
      {/* Fist detail */}
      <path d="M16 27.5 L18 27.5" stroke="#0f766e" strokeWidth="0.8" strokeLinecap="round" />

      {/* Right arm - gripping position (training) */}
      <path d="M40 42 L46 34" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" />
      <circle cx="47" cy="32.5" r="2.5" fill="#0d9488" />

      {/* Legs in wide training stance */}
      <path d="M28 42 L22 56" stroke="#0d9488" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M36 42 L42 56" stroke="#0d9488" strokeWidth="3.5" strokeLinecap="round" />

      {/* Feet */}
      <ellipse cx="21" cy="57" rx="3.5" ry="1.5" fill="#0f766e" />
      <ellipse cx="43" cy="57" rx="3.5" ry="1.5" fill="#0f766e" />

      {/* Rising energy lines (growth/progress) */}
      <path
        d="M15 26 L13 22"
        stroke="#14b8a6"
        strokeWidth="1.5"
        opacity="0.5"
        strokeLinecap="round"
      />
      <path
        d="M14 28 L11 25"
        stroke="#14b8a6"
        strokeWidth="1"
        opacity="0.35"
        strokeLinecap="round"
      />
      <path
        d="M16 24 L14 20"
        stroke="#14b8a6"
        strokeWidth="1"
        opacity="0.25"
        strokeLinecap="round"
      />

      {/* Heart/dedication symbol on chest */}
      <path
        d="M30.5 26 C30.5 25.3 31 25 31.5 25 C32 25 32 25.5 32 25.5 C32 25.5 32 25 32.5 25 C33 25 33.5 25.3 33.5 26 C33.5 27 32 28.5 32 28.5 C32 28.5 30.5 27 30.5 26Z"
        fill="#14b8a6"
        opacity="0.6"
      />
    </svg>
  );
}

export default DiscipleIcon;
