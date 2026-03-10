import { memo } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Suspense fallback shown while lazy-loaded route chunks are fetching.
 * Used by RouterConfig's lazyRoute/protectedRoute factories.
 */
const LoadingFallback = memo(() => {
  return (
    <div
      className="flex items-center justify-center min-h-[60vh] animate-in fade-in duration-300"
      role="status"
      aria-label="Loading page content"
    >
      <div className="space-y-6 text-center">
        <div className="relative inline-block">
          <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
        </div>
        <p
          className="text-base font-light text-muted-foreground/80 animate-pulse"
          aria-live="polite"
        >
          Loading...
        </p>
      </div>
    </div>
  );
});

LoadingFallback.displayName = 'LoadingFallback';

export { LoadingFallback };
