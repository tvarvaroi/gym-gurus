/**
 * RoninIcon - Ronin (Solo) role
 * Uses the detailed samurai SVG illustration from public/icons/ronin-samurai.svg
 * with CSS filters for color theming.
 */

interface RoninIconProps {
  className?: string;
  size?: number;
  variant?: 'default' | 'white';
}

// CSS filter to convert black SVG to purple (#a855f7)
const PURPLE_FILTER =
  'invert(40%) sepia(90%) saturate(2500%) hue-rotate(252deg) brightness(100%) contrast(96%)';
const WHITE_FILTER = 'brightness(0) invert(1)';

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
      }}
      draggable={false}
    />
  );
}

export default RoninIcon;
