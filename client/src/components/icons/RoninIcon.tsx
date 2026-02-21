/**
 * RoninIcon - Ronin (Solo) role
 * Lone warrior with kasa hat and katana — served from /icons/ronin-samurai.svg via CSS filter coloring.
 */

const WHITE_FILTER = 'brightness(0) invert(1)';
const PURPLE_FILTER =
  'brightness(0) saturate(100%) invert(42%) sepia(97%) saturate(2500%) hue-rotate(220deg) brightness(103%) contrast(93%)';

interface RoninIconProps {
  className?: string;
  size?: number;
  variant?: 'default' | 'white';
}

export function RoninIcon({ className = '', size = 28, variant = 'default' }: RoninIconProps) {
  const isWhite = variant === 'white';

  return (
    <img
      src="/icons/ronin-samurai.svg"
      alt="Ronin"
      className={className}
      style={{
        width: size,
        height: size,
        maxWidth: 'none',
        filter: isWhite ? WHITE_FILTER : PURPLE_FILTER,
        display: 'block',
        flexShrink: 0,
      }}
      draggable={false}
    />
  );
}

export default RoninIcon;
