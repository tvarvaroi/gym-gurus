import { memo, useState, useCallback, useMemo } from 'react';
import { Dumbbell, Heart, Move, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface ExerciseImageProps {
  exerciseName: string;
  category?: string;
  muscleGroups?: string[];
  size?: 'sm' | 'md' | 'lg';
  thumbnailUrl?: string | null;
  className?: string;
}

const SIZE_CONFIG = {
  sm: { px: 64, iconSize: 24, fontSize: 16, labelSize: 10 },
  md: { px: 128, iconSize: 40, fontSize: 28, labelSize: 12 },
  lg: { px: 256, iconSize: 64, fontSize: 48, labelSize: 14 },
} as const;

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  strength: Dumbbell,
  cardio: Heart,
  flexibility: Move,
  bodyweight: User,
};

function getCategoryIcon(category?: string): LucideIcon {
  if (!category) return Dumbbell;
  const normalized = category.toLowerCase().trim();
  return CATEGORY_ICONS[normalized] ?? Dumbbell;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const ExerciseImage = memo(function ExerciseImage({
  exerciseName,
  category,
  muscleGroups,
  size = 'md',
  thumbnailUrl,
  className,
}: ExerciseImageProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>(
    thumbnailUrl ? 'loading' : 'error'
  );

  const config = SIZE_CONFIG[size];
  const initials = useMemo(() => getInitials(exerciseName), [exerciseName]);
  const Icon = useMemo(() => getCategoryIcon(category), [category]);

  const handleLoad = useCallback(() => {
    setImageState('loaded');
  }, []);

  const handleError = useCallback(() => {
    setImageState('error');
  }, []);

  const sizeClass = cn(
    {
      'w-16 h-16': size === 'sm',
      'w-32 h-32': size === 'md',
      'w-64 h-64': size === 'lg',
    },
    'rounded-lg overflow-hidden relative flex-shrink-0'
  );

  // Render actual image when a valid URL is provided
  if (thumbnailUrl && imageState !== 'error') {
    return (
      <div className={cn(sizeClass, className)}>
        {/* Loading skeleton */}
        {imageState === 'loading' && (
          <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
        )}

        {/* Actual image */}
        <img
          src={thumbnailUrl}
          alt={exerciseName}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300 rounded-lg',
            imageState === 'loaded' ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>
    );
  }

  // Render SVG-based placeholder
  return (
    <div
      className={cn(sizeClass, className)}
      role="img"
      aria-label={`${exerciseName} exercise placeholder`}
    >
      <svg
        width={config.px}
        height={config.px}
        viewBox={`0 0 ${config.px} ${config.px}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Dark background */}
        <rect width={config.px} height={config.px} rx={8} fill="#1a1a2e" />

        {/* Subtle gradient overlay */}
        <defs>
          <linearGradient id={`grad-${size}-${initials}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.15" />
          </linearGradient>

          <radialGradient id={`glow-${size}-${initials}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Gradient fill */}
        <rect width={config.px} height={config.px} rx={8} fill={`url(#grad-${size}-${initials})`} />

        {/* Center glow */}
        <rect width={config.px} height={config.px} rx={8} fill={`url(#glow-${size}-${initials})`} />

        {/* Decorative accent line at bottom */}
        <rect
          x={config.px * 0.2}
          y={config.px - 3}
          width={config.px * 0.6}
          height={2}
          rx={1}
          fill="#3B82F6"
          opacity="0.5"
        />

        {/* Initials text (subtle background overlay) */}
        <text
          x="50%"
          y="75%"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={config.labelSize}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="600"
          fill="#10B981"
          opacity="0.35"
          letterSpacing="0.1em"
        >
          {initials}
        </text>
      </svg>

      {/* Icon overlay rendered via Lucide (positioned absolutely in center) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="flex items-center justify-center"
          style={{
            marginTop: size === 'sm' ? -4 : size === 'md' ? -8 : -16,
          }}
        >
          <Icon size={config.iconSize} className="text-blue-500/60" strokeWidth={1.5} />
        </div>
      </div>

      {/* Muscle group indicator dots (only for md/lg with muscle groups) */}
      {muscleGroups && muscleGroups.length > 0 && size !== 'sm' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {muscleGroups.slice(0, size === 'md' ? 3 : 5).map((_, idx) => (
            <div key={idx} className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
          ))}
        </div>
      )}
    </div>
  );
});

ExerciseImage.displayName = 'ExerciseImage';

export default ExerciseImage;
