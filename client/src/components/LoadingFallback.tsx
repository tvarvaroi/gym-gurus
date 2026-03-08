import { memo } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/**
 * Suspense fallback shown while lazy-loaded route chunks are fetching.
 * Used by RouterConfig's lazyRoute/protectedRoute factories.
 */
const LoadingFallback = memo(() => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="flex items-center justify-center min-h-[60vh]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      role="status"
      aria-label="Loading page content"
    >
      <div className="space-y-6 text-center">
        <motion.div
          className="relative inline-block"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'linear' }}
        >
          <Loader2 className="h-12 w-12 text-primary mx-auto" />
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{
              duration: 2,
              repeat: prefersReducedMotion ? 0 : Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
        <motion.p
          className="text-base font-light text-muted-foreground/80"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: prefersReducedMotion ? 0 : Infinity,
            ease: 'easeInOut',
          }}
          aria-live="polite"
        >
          Loading...
        </motion.p>
      </div>
    </motion.div>
  );
});

LoadingFallback.displayName = 'LoadingFallback';

export { LoadingFallback };
