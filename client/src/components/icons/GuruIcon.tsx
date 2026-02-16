/**
 * GuruIcon - Guru (Trainer) role
 * Uses the detailed kabuto helmet SVG illustration from public/icons/guru-kabuto.svg
 * with CSS filters for color theming.
 */

interface GuruIconProps {
  className?: string;
  size?: number;
  variant?: 'default' | 'white';
}

// CSS filter to convert black SVG to gold (#c9a855)
const GOLD_FILTER =
  'invert(70%) sepia(30%) saturate(600%) hue-rotate(10deg) brightness(90%) contrast(90%)';
const WHITE_FILTER = 'brightness(0) invert(1)';

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
      }}
      draggable={false}
    />
  );
}

export default GuruIcon;
