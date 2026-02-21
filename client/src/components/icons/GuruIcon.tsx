/**
 * GuruIcon - Guru (Trainer) role
 * Kabuto warrior helmet — served from /icons/guru-kabuto.svg via CSS filter coloring.
 */

const WHITE_FILTER = 'brightness(0) invert(1)';
const GOLD_FILTER =
  'brightness(0) saturate(100%) invert(72%) sepia(44%) saturate(503%) hue-rotate(3deg) brightness(96%) contrast(89%)';

interface GuruIconProps {
  className?: string;
  size?: number;
  variant?: 'default' | 'white';
}

export function GuruIcon({ className = '', size = 28, variant = 'default' }: GuruIconProps) {
  const isWhite = variant === 'white';

  return (
    <img
      src="/icons/guru-kabuto.svg"
      alt="Guru"
      className={className}
      style={{
        width: size,
        height: size,
        maxWidth: 'none',
        filter: isWhite ? WHITE_FILTER : GOLD_FILTER,
        display: 'block',
        flexShrink: 0,
      }}
      draggable={false}
    />
  );
}

export default GuruIcon;
