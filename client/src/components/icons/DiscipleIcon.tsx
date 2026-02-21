/**
 * DiscipleIcon - Disciple (Client) role
 * Samurai trainee — served from /icons/disciple-samurai.svg via CSS filter coloring.
 */

const WHITE_FILTER = 'brightness(0) invert(1)';
const TEAL_FILTER =
  'brightness(0) saturate(100%) invert(52%) sepia(72%) saturate(465%) hue-rotate(134deg) brightness(92%) contrast(91%)';

interface DiscipleIconProps {
  className?: string;
  size?: number;
  variant?: 'default' | 'white';
}

export function DiscipleIcon({
  className = '',
  size = 28,
  variant = 'default',
}: DiscipleIconProps) {
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
        flexShrink: 0,
      }}
      draggable={false}
    />
  );
}

export default DiscipleIcon;
