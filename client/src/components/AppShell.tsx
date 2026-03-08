import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Footer } from '@/components/Footer';
import AppSidebar from '@/components/AppSidebar';
import AppHeaderComponent from '@/components/layout/AppHeader';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { TrialBanner } from '@/components/TrialBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import NotFound from '@/pages/not-found';
import { AuthGuard } from '@/components/AuthGuard';
import { initAnalytics } from '@/lib/analytics';
import { isPublicRoute, isKnownAuthRoute } from '@/lib/routeConfig';

/**
 * Top-level application shell.
 *
 * Responsibilities:
 *   - Dark theme enforcement (presentation side effect)
 *   - Analytics initialisation
 *   - Public-vs-auth routing decision (isPublicRoute / isKnownAuthRoute)
 *   - Sidebar + header + nav layout for authenticated pages
 *
 * The `children` prop is the Router (currently defined in App.tsx, extracted
 * to RouterConfig.tsx in PR 3). AppShell renders children in whichever
 * branch applies — no circular import needed.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  // Force dark theme — presentation side effect, lives here not in AuthGuard
  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  // Custom sidebar dimensions for the fitness application
  const style = {
    '--sidebar-width': '20rem',       // 320px — generous for content labels
    '--sidebar-width-icon': '6rem',   // 96px — icon mode with logo (80px + padding)
  };

  // Persist sidebar open/closed state across navigations via cookie
  const getSidebarState = () => {
    if (typeof document === 'undefined') return true;
    const match = document.cookie.split(';').find((c) => c.trim().startsWith('sidebar_state='));
    return match ? match.split('=')[1] === 'true' : true;
  };

  const [defaultOpen] = useState(getSidebarState);

  const isPublic = isPublicRoute(location);
  const isUnknown = !isPublic && !isKnownAuthRoute(location);

  return (
    <>
      {isUnknown ? (
        // Unknown path — render 404 directly; don't redirect unauthenticated
        // users to the landing page for paths that don't exist.
        <NotFound />
      ) : isPublic ? (
        // Public pages — no sidebar, no auth check
        children
      ) : (
        // Authenticated pages — auth gate + full sidebar layout
        <AuthGuard>
          <SidebarProvider defaultOpen={defaultOpen} style={style as React.CSSProperties}>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm"
            >
              Skip to main content
            </a>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <AppHeaderComponent />
                <TrialBanner />
                <main
                  id="main-content"
                  className="flex-1 overflow-y-auto pb-16 md:pb-0 flex flex-col"
                  role="main"
                >
                  <div className="p-3 sm:p-4 md:p-6 lg:p-8 flex-1">
                    <ErrorBoundary>{children}</ErrorBoundary>
                  </div>
                  <Footer />
                </main>
                <MobileBottomNav />
              </div>
            </div>
          </SidebarProvider>
        </AuthGuard>
      )}
    </>
  );
}
