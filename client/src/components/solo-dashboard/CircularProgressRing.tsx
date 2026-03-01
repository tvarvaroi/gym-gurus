import { memo } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface CircularProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  displayValue?: string;
  label?: string;
  animated?: boolean;
  children?: React.ReactNode;
  gradient?: boolean;
  id?: string;
}

function getAutoColor(value: number): string {
  if (value >= 80) return 'text-green-500';
  if (value >= 50) return 'text-amber-500';
  return 'text-red-500';
}

export const CircularProgressRing = memo(function CircularProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  color,
  trackColor = 'text-muted/30',
  displayValue,
  label,
  animated = true,
  children,
  gradient = false,
  id = 'default',
}: CircularProgressRingProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && !prefersReducedMotion;

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedValue = Math.max(0, Math.min(100, value));
  const resolvedColor = color || getAutoColor(clampedValue);
  const gradientId = `ring-grad-${id}`;

  // Open-ring with gap at 12 o'clock (Apple Watch style)
  const gapFraction = 0.08; // 8% gap (~29°)
  const arcLength = circumference * (1 - gapFraction);
  const startAngle = -90 + (gapFraction * 360) / 2; // offset so gap centers at top
  const progressLength = arcLength * (clampedValue / 100);

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} style={{ transform: `rotate(${startAngle}deg)` }}>
          {gradient && (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              </linearGradient>
            </defs>
          )}
          {/* Background track with gap */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className={trackColor}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          />
          {/* Progress arc */}
          {shouldAnimate ? (
            <motion.circle
              cx={center}
              cy={center}
              r={radius}
              stroke={gradient ? `url(#${gradientId})` : 'currentColor'}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              className={gradient ? undefined : resolvedColor}
              strokeDasharray={`${progressLength} ${circumference - progressLength}`}
              initial={{
                strokeDasharray: `0 ${circumference}`,
              }}
              animate={{
                strokeDasharray: `${progressLength} ${circumference - progressLength}`,
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          ) : (
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke={gradient ? `url(#${gradientId})` : 'currentColor'}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              className={gradient ? undefined : resolvedColor}
              strokeDasharray={`${progressLength} ${circumference - progressLength}`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children || (
            <>
              <span className="text-lg font-bold leading-none">
                {displayValue ?? `${Math.round(clampedValue)}%`}
              </span>
              {label && <span className="text-[10px] text-muted-foreground mt-0.5">{label}</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
