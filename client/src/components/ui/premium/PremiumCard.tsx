import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PremiumCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated' | 'flush';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onPress?: () => void;
}

const variantStyles = {
  default: 'bg-card rounded-2xl border border-border/20',
  glass: 'bg-card/60 backdrop-blur-xl rounded-2xl border border-border/20',
  elevated: 'bg-card rounded-2xl border border-border/20 shadow-lg shadow-primary/5',
  flush: 'bg-card',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4 md:p-5',
  lg: 'p-5 md:p-6',
};

export const PremiumCard = forwardRef<HTMLDivElement, PremiumCardProps>(
  ({ children, className, variant = 'default', padding = 'md', onPress }, ref) => {
    const classes = cn(variantStyles[variant], paddingStyles[padding], className);

    if (onPress) {
      return (
        <motion.button
          ref={ref as React.Ref<HTMLButtonElement>}
          whileTap={{ scale: 0.98 }}
          onClick={onPress}
          className={cn(classes, 'min-h-[44px] w-full text-left cursor-pointer transition-colors hover:border-primary/30')}
        >
          {children}
        </motion.button>
      );
    }

    return (
      <div ref={ref} className={classes}>
        {children}
      </div>
    );
  },
);

PremiumCard.displayName = 'PremiumCard';
