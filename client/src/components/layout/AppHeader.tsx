import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { LogOut, Crown, Zap, CreditCard } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useUser } from '@/contexts/UserContext';
import NotificationCenter from '@/components/NotificationCenter';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getRoleThemeByRole } from '@/lib/theme';
import type { InternalRole } from '@/lib/roles';

// Get role-specific color config for header styling
// Now using CSS variables that work with HSL opacity syntax
function useRoleColors() {
  const { user } = useUser();
  const role = (user?.role || 'trainer') as InternalRole;
  const roleTheme = getRoleThemeByRole(role);

  // Return CSS variable strings for use in inline styles
  // Use format: hsl(var(--primary) / 0.15) for colors with opacity
  return {
    primary: roleTheme.primary,
    accent: roleTheme.accent,
  };
}

// Compact header center text
function HeaderCenterText() {
  return (
    <span
      className="hidden md:inline text-sm tracking-[0.2em] font-light text-muted-foreground/60 select-none cursor-default whitespace-nowrap"
      style={{ fontFamily: '"Playfair Display", serif' }}
    >
      GYM GURUS
    </span>
  );
}

// User menu component for authenticated users
function UserMenu() {
  const prefersReducedMotion = useReducedMotion();
  const [, navigate] = useLocation();
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const colors = useRoleColors();

  if (!user) return null;

  const userData = user as any;
  const initials =
    `${userData.firstName?.[0] || ''}${userData.lastName?.[0] || ''}`.toUpperCase() || 'U';

  // Subscription display helpers
  const isActive =
    userData.subscriptionStatus === 'active' || userData.subscriptionStatus === 'trialing';
  const trialEndsAt = userData.trialEndsAt ? new Date(userData.trialEndsAt) : null;
  const now = new Date();
  const isInTrial = trialEndsAt ? trialEndsAt > now && !isActive : false;
  const trialDaysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const isClient = userData.role === 'client';

  function SubscriptionBadge() {
    if (isClient) return null;
    if (isActive && userData.subscriptionTier) {
      const tierLabel =
        userData.subscriptionTier.charAt(0).toUpperCase() + userData.subscriptionTier.slice(1);
      return (
        <Badge className="text-[10px] px-1.5 py-0 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
          <Crown className="w-2.5 h-2.5 mr-1" />
          {tierLabel}
        </Badge>
      );
    }
    if (isInTrial) {
      return (
        <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400 border border-blue-500/30">
          <Zap className="w-2.5 h-2.5 mr-1" />
          Trial · {trialDaysRemaining}d
        </Badge>
      );
    }
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          className="relative group"
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.95 }}
          data-testid="button-user-menu"
          aria-label="User menu"
        >
          {/* Premium glow effect on hover */}
          <motion.div
            className="absolute inset-0 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `radial-gradient(circle, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.3))`,
            }}
            initial={false}
          />

          {/* Outer ring with premium gradient */}
          <motion.div
            className="absolute inset-0 rounded-full p-[2px]"
            style={{
              background: `linear-gradient(135deg, hsl(var(--primary) / 0.4), hsl(var(--accent) / 0.4))`,
            }}
            animate={{ rotate: [0, 360] }}
            transition={{
              duration: 8,
              repeat: prefersReducedMotion ? 0 : Infinity,
              ease: 'linear',
            }}
          >
            <div className="w-full h-full rounded-full bg-background" />
          </motion.div>

          {/* Avatar container */}
          <div
            className="relative h-9 w-9 md:h-10 md:w-10 rounded-full border-2 transition-all duration-300 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.15))`,
              borderColor: `hsl(var(--primary) / 0.3)`,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
              }}
            />

            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.25), transparent 60%)`,
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 70% 70%, hsl(var(--accent) / 0.25), transparent 60%)`,
              }}
            />

            <div className="relative h-full w-full flex items-center justify-center">
              <motion.span
                className="text-sm md:text-base font-semibold"
                style={{
                  background: `linear-gradient(135deg, hsl(var(--primary)) 0%, #e5e4e2 50%, hsl(var(--accent)) 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: `0 0 10px hsl(var(--primary) / 0.3)`,
                  fontFamily: '"Inter", sans-serif',
                  letterSpacing: '0.05em',
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                {initials}
              </motion.span>
            </div>

            <motion.div
              className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%]"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
              }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              initial={false}
            />
          </div>

          {/* Status indicator */}
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderColor: 'rgba(0, 0, 0, 0.8)',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.6), 0 0 6px rgba(16, 185, 129, 0.8)',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30, delay: 0.1 }}
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.8), transparent)',
              }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.9, 0.6] }}
              transition={{
                duration: 2,
                repeat: prefersReducedMotion ? 0 : Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.div>
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 glass-strong border-border/50 shadow-premium-lg overflow-hidden p-0"
        asChild
      >
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Header section */}
          <div className="relative p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/50">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent" />
            <div className="relative flex items-center gap-4">
              <div className="h-14 w-14 rounded-full glass border border-border/50 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center shrink-0 shadow-lg">
                <span className="text-xl font-semibold bg-gradient-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  {initials}
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.p
                      className="text-base font-semibold text-foreground truncate"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      {userData.firstName} {userData.lastName}
                    </motion.p>
                  </TooltipTrigger>
                  <TooltipContent>
                    {userData.firstName} {userData.lastName}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.p
                      className="text-xs text-muted-foreground truncate font-light"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      {userData.email}
                    </motion.p>
                  </TooltipTrigger>
                  <TooltipContent>{userData.email}</TooltipContent>
                </Tooltip>
                <motion.div
                  className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium">Active</span>
                  <SubscriptionBadge />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-2">
            {/* Subscription action — hidden for disciples */}
            {!isClient && (
              <>
                <DropdownMenuItem
                  onClick={() => navigate('/pricing')}
                  className="group relative cursor-pointer rounded-xl px-3 py-2.5 hover:bg-primary/10 focus:bg-primary/10 transition-all duration-200 overflow-hidden"
                >
                  <div className="relative flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors duration-200">
                      {isActive ? (
                        <CreditCard className="h-4 w-4 text-primary" />
                      ) : (
                        <Zap className="h-4 w-4 text-yellow-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {isActive ? 'Manage Subscription' : 'Upgrade Plan'}
                      </p>
                      <p className="text-xs text-muted-foreground font-light">
                        {isActive
                          ? `${userData.subscriptionTier ? userData.subscriptionTier.charAt(0).toUpperCase() + userData.subscriptionTier.slice(1) : 'Active'} plan`
                          : isInTrial
                            ? `${trialDaysRemaining} days left in trial`
                            : 'Subscribe to continue'}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
              </>
            )}
            <DropdownMenuItem
              onClick={async () => {
                try {
                  queryClient.clear();
                  await fetch('/api/logout', {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Cache-Control': 'no-cache' },
                  });
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/';
                } catch (error) {
                  console.error('Logout failed:', error);
                  queryClient.clear();
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/';
                }
              }}
              data-testid="button-logout"
              className="group relative cursor-pointer rounded-xl px-3 py-2.5 hover:bg-destructive/10 focus:bg-destructive/10 transition-all duration-200 overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-destructive/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
                initial={false}
              />
              <div className="relative flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-destructive/10 group-hover:bg-destructive/20 flex items-center justify-center transition-colors duration-200">
                  <LogOut className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">Sign out</p>
                  <p className="text-xs text-muted-foreground font-light">
                    End your session securely
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          </div>
        </motion.div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Main app header component with role-based colors
export default function AppHeader() {
  return (
    <header
      className="sticky top-0 z-40 h-12 md:h-14 shrink-0 border-b relative"
      role="banner"
      aria-label="App header"
      style={{
        borderColor: `hsl(var(--primary) / 0.3)`,
        backdropFilter: 'blur(24px)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Glass background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--accent) / 0.1) 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.15))',
          }}
        />

        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.4) 30%, hsl(var(--accent) / 0.4) 70%, transparent 100%)`,
          }}
        />
      </div>

      {/* Grid layout for proper centering */}
      <div className="relative z-10 h-full grid grid-cols-3 items-center px-3 sm:px-4 md:px-6">
        {/* Left section - Sidebar Toggle */}
        <motion.div
          className="flex justify-start"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}>
            <SidebarTrigger
              data-testid="button-sidebar-toggle"
              aria-label="Toggle sidebar navigation"
              className="hover-elevate transition-all duration-300 rounded-xl border h-11 w-11"
              style={{
                background: `linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--accent) / 0.12))`,
                borderColor: `hsl(var(--primary) / 0.25)`,
                backdropFilter: 'blur(12px)',
                boxShadow:
                  '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              }}
            />
          </motion.div>
        </motion.div>

        {/* Center section */}
        <div className="flex justify-center">
          <HeaderCenterText />
        </div>

        {/* Right section */}
        <motion.div
          className="flex items-center gap-2 sm:gap-3 justify-end"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <NotificationCenter />
          <UserMenu />
        </motion.div>
      </div>
    </header>
  );
}
