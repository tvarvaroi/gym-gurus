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
}: CircularProgressRingProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && !prefersReducedMotion;

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedValue = Math.max(0, Math.min(100, value));
  const offset = circumference - (clampedValue / 100) * circumference;
  const resolvedColor = color || getAutoColor(clampedValue);

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className={trackColor}
          />
          {shouldAnimate ? (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeLinecap="round"
              className={resolvedColor}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          ) : (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={resolvedColor}
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
