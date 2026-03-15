/**
 * Canonical public-route definition — single source of truth.
 *
 * Imported by three consumers that previously maintained independent copies:
 *   - AppShell.tsx        (React component — isPublicRoute(location))
 *   - UserContext.tsx     (React context  — isPublicRoute(currentPath))
 *   - queryClient.ts      (non-React util — isPublicRoute(window.location.pathname))
 *
 * When adding a new public route, update this file only.
 * import.meta.env.DEV is resolved by Vite at build time — safe to use here.
 */
export function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/terms' ||
    pathname === '/privacy' ||
    pathname.startsWith('/calculators') ||
    pathname === '/disciple-login' ||
    pathname === '/payment-success' ||
    pathname === '/payment-cancelled' ||
    pathname.startsWith('/auth/') ||
    // Debug routes exist only in dev builds — tree-shaken in production
    (import.meta.env.DEV &&
      (pathname === '/preview-login' ||
        pathname === '/test-login' ||
        pathname === '/test-auth-login' ||
        pathname === '/login2' ||
        pathname === '/register2'))
  );
}

/**
 * Known authenticated routes. Any path not in this list and not public
 * is treated as 404 by AppShell — preventing unauthenticated users from
 * being redirected to landing for unknown routes.
 *
 * When adding a new authenticated route, update both this function
 * and the Router in RouterConfig.tsx (PR 3).
 */
export function isKnownAuthRoute(pathname: string): boolean {
  return (
    pathname === '/dashboard' ||
    pathname.startsWith('/clients') ||
    pathname === '/workouts' ||
    pathname.startsWith('/workout-execution/') ||
    pathname.startsWith('/workout-builder/') ||
    pathname === '/exercises' ||
    pathname === '/progress' ||
    pathname === '/schedule' ||
    pathname === '/payments' ||
    pathname.startsWith('/dashboard/calculators') ||
    pathname.startsWith('/solo') ||
    pathname === '/pricing' ||
    pathname === '/settings'
  );
}
