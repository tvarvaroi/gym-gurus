import { useEffect } from 'react';
import { Redirect } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import type { User } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ALL_ROLE_CSS_CLASSES, getRoleCssClass } from '@/lib/roles';
import type { InternalRole } from '@/lib/roles';
import { toast } from '@/hooks/use-toast';

/**
 * Pure auth gate. Does exactly two things:
 * 1. Checks auth state — shows loading/error screen, redirects unauthenticated users to /
 * 2. Applies role CSS class to <html> for theming (requires user object, belongs here)
 *
 * Does NOT contain: dark theme enforcement (AppShell), video cycling (LandingPage),
 * or any other presentation logic.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Apply role-specific CSS class to <html> for theming.
  // Must be on the same element as .dark for CSS variables to resolve correctly.
  // Also persists the role to localStorage so index.html's blocking script can apply
  // it synchronously on the next load — eliminating the role colour flash (§ UX-3).
  useEffect(() => {
    document.documentElement.classList.remove(...ALL_ROLE_CSS_CLASSES);
    if (user?.role) {
      document.documentElement.classList.add(getRoleCssClass(user.role as InternalRole));
      localStorage.setItem('gg_role', user.role);
    } else {
      localStorage.removeItem('gg_role');
    }
  }, [user]);

  // Show error state if auth check fails (network error, server down, rate limited).
  // 401 is not an error — it means "not logged in", handled below.
  if (!isLoading && error && !(error instanceof Error && error.message.startsWith('401:'))) {
    const isRateLimited = error instanceof Error && error.message.startsWith('429:');
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {isRateLimited ? 'Too Many Requests' : 'Connection Error'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isRateLimited
              ? "You're sending requests too quickly. Please wait a moment and try again."
              : 'Unable to connect to the server. Please check your internet connection and try again.'}
          </p>
          <Button onClick={() => window.location.reload()} size="lg">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state while the initial auth check is in flight.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <motion.div
          className="space-y-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Animated loader with glow */}
          <div className="relative inline-block">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 2,
                repeat: prefersReducedMotion ? 0 : Infinity,
                ease: 'linear',
              }}
            >
              <Loader2 className="h-16 w-16 text-primary mx-auto" />
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/30 blur-2xl"
              animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.2, 1] }}
              transition={{
                duration: 2,
                repeat: prefersReducedMotion ? 0 : Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>

          {/* Pulsing text */}
          <motion.div
            className="space-y-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 1.8,
              repeat: prefersReducedMotion ? 0 : Infinity,
              ease: 'easeInOut',
            }}
          >
            <p className="text-lg font-light text-foreground">Checking authentication</p>
            <div className="flex items-center justify-center gap-1">
              <motion.span
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1.5,
                  repeat: prefersReducedMotion ? 0 : Infinity,
                  ease: 'easeInOut',
                  delay: 0,
                }}
              />
              <motion.span
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1.5,
                  repeat: prefersReducedMotion ? 0 : Infinity,
                  ease: 'easeInOut',
                  delay: 0.2,
                }}
              />
              <motion.span
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1.5,
                  repeat: prefersReducedMotion ? 0 : Infinity,
                  ease: 'easeInOut',
                  delay: 0.4,
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // User is authenticated — handle post-login redirects then render children.
  if (user) {
    // Redirect solo users to onboarding if they haven't completed it yet.
    if (
      user.role === 'solo' &&
      !user.onboardingCompleted &&
      !window.location.pathname.startsWith('/solo/onboarding')
    ) {
      return <Redirect to="/solo/onboarding" />;
    }

    // Restore the URL the user was on before their session expired.
    const returnUrl = sessionStorage.getItem('returnUrl');
    if (returnUrl && window.location.pathname === '/dashboard') {
      sessionStorage.removeItem('returnUrl');
      return <Redirect to={returnUrl} />;
    }

    return <>{children}</>;
  }

  // Not authenticated — show feedback then redirect to landing page.
  toast({ title: 'Please sign in to continue' });
  return <Redirect to="/" />;
}
