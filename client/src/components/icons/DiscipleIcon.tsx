/**
 * DiscipleIcon - Disciple (Client) role
 * Uses the detailed samurai SVG illustration from public/icons/disciple-samurai.svg
 * with CSS filters for color theming.
 */

interface DiscipleIconProps {
  className?: string;
  size?: number;
  variant?: 'default' | 'white';
}

// CSS filter to convert black SVG to teal (#0d9488)
const TEAL_FILTER =
  'invert(50%) sepia(60%) saturate(500%) hue-rotate(130deg) brightness(90%) contrast(95%)';
const WHITE_FILTER = 'brightness(0) invert(1)';

export function DiscipleIcon({ className = '', size = 28, variant = 'default' }: DiscipleIconProps) {
  const isWhite = variant === 'white';

  return (
    <img
      src="/icons/disciple-samurai.svg"
      alt="Disciple"
      className={className}
      style={{
        width: size,
        height: size,
        maxWidth: 'none',
        filter: isWhite ? WHITE_FILTER : TEAL_FILTER,
        display: 'block',
      }}
      draggable={false}
    />
  );
}

export default DiscipleIcon;
