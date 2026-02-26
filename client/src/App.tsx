import { Switch, Route, Redirect } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Footer } from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { lazy, Suspense, useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { initAnalytics, trackPageView } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, LogOut, Download, Users, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportClientsToCSV, exportWorkoutsToCSV } from '@/lib/exportUtils';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/AnimationComponents';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { ALL_ROLE_CSS_CLASSES, getRoleCssClass } from '@/lib/roles';
import type { InternalRole } from '@/lib/roles';

// Import critical components directly (not lazy loaded)
import AppSidebar from '@/components/AppSidebar';
// Theme toggle removed - app now uses dark theme only
import ClientCard from '@/components/ClientCard';
import SearchInput from '@/components/SearchInput';
import NotFound from '@/pages/not-found';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NewClientButton } from '@/components/ClientFormModal';
import { LoginPage } from '@/components/LoginPage';
import { TestLoginPage } from '@/components/TestLoginPage';
import ProtectedRoute from '@/components/ProtectedRoute';
import NotificationCenter from '@/components/NotificationCenter';
import AppHeaderComponent from '@/components/layout/AppHeader';
import { TrialBanner } from '@/components/TrialBanner';

// Lazy load only secondary pages for code splitting
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const Dashboard = lazy(() => import('@/components/Dashboard'));
const ClientsPageContent = lazy(() => import('@/pages/ClientsPage'));
const WorkoutPlans = lazy(() => import('@/pages/WorkoutPlans'));
const WorkoutBuilder = lazy(() => import('@/pages/WorkoutBuilder'));
const WorkoutExecution = lazy(() => import('@/pages/WorkoutExecution'));
const ExercisesPageComponent = lazy(() => import('@/pages/ExercisesPage'));
const SchedulePageComponent = lazy(() => import('@/pages/SchedulePage'));
const PaymentsPageComponent = lazy(() => import('@/pages/PaymentsPage'));

// Calculator pages
const CalculatorsHub = lazy(() => import('@/pages/calculators/CalculatorsHub'));
const OneRepMaxCalc = lazy(() => import('@/pages/calculators/OneRepMaxCalc'));
const PlatesCalc = lazy(() => import('@/pages/calculators/PlatesCalc'));
const TDEECalc = lazy(() => import('@/pages/calculators/TDEECalc'));
const StrengthStandardsCalc = lazy(() => import('@/pages/calculators/StrengthStandardsCalc'));
const BMICalc = lazy(() => import('@/pages/calculators/BMICalc'));
const BodyFatCalc = lazy(() => import('@/pages/calculators/BodyFatCalc'));
const MacroCalc = lazy(() => import('@/pages/calculators/MacroCalc'));
const VO2MaxCalc = lazy(() => import('@/pages/calculators/VO2MaxCalc'));
const HeartRateZonesCalc = lazy(() => import('@/pages/calculators/HeartRateZonesCalc'));
const CaloriesBurnedCalc = lazy(() => import('@/pages/calculators/CaloriesBurnedCalc'));
const IdealWeightCalc = lazy(() => import('@/pages/calculators/IdealWeightCalc'));
const WaterIntakeCalc = lazy(() => import('@/pages/calculators/WaterIntakeCalc'));

// Premium calculator pages (authenticated only)
const PremiumCalculatorsHub = lazy(
  () => import('@/pages/premium-calculators/PremiumCalculatorsHub')
);
const PremiumTDEECalc = lazy(() => import('@/pages/premium-calculators/PremiumTDEECalc'));
const PremiumBMICalc = lazy(() => import('@/pages/premium-calculators/PremiumBMICalc'));
const PremiumBodyFatCalc = lazy(() => import('@/pages/premium-calculators/PremiumBodyFatCalc'));
const PremiumMacroCalc = lazy(() => import('@/pages/premium-calculators/PremiumMacroCalc'));
const Premium1RMCalc = lazy(() => import('@/pages/premium-calculators/Premium1RMCalc'));
const PremiumPlatesCalc = lazy(() => import('@/pages/premium-calculators/PremiumPlatesCalc'));
const PremiumStrengthStandardsCalc = lazy(
  () => import('@/pages/premium-calculators/PremiumStrengthStandardsCalc')
);
const PremiumVO2MaxCalc = lazy(() => import('@/pages/premium-calculators/PremiumVO2MaxCalc'));
const PremiumHeartRateZonesCalc = lazy(
  () => import('@/pages/premium-calculators/PremiumHeartRateZonesCalc')
);
const PremiumCaloriesBurnedCalc = lazy(
  () => import('@/pages/premium-calculators/PremiumCaloriesBurnedCalc')
);
const PremiumIdealWeightCalc = lazy(
  () => import('@/pages/premium-calculators/PremiumIdealWeightCalc')
);
const PremiumWaterIntakeCalc = lazy(
  () => import('@/pages/premium-calculators/PremiumWaterIntakeCalc')
);

// Legal pages
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));

// Auth pages
const AuthLoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));
// Non-lazy test component
import TestAuthLogin from '@/pages/auth/TestAuthLogin';

// Disciple login page
const DiscipleLoginPage = lazy(() => import('@/pages/DiscipleLoginPage'));

// Pricing page
const PricingPage = lazy(() => import('@/pages/PricingPage'));

// Settings page
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

// Solo user pages
const SoloDashboard = lazy(() => import('@/pages/solo/SoloDashboard'));
const SoloOnboarding = lazy(() => import('@/pages/solo/SoloOnboarding'));
const AICoach = lazy(() => import('@/pages/solo/AICoach'));
const Recovery = lazy(() => import('@/pages/solo/Recovery'));
const SoloAchievements = lazy(() => import('@/pages/solo/Achievements'));
const WorkoutGenerator = lazy(() => import('@/pages/solo/WorkoutGenerator'));
const NutritionPlanner = lazy(() => import('@/pages/solo/NutritionPlanner'));

// Loading fallback component
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

// Pages for different sections of the app
const HomePage = memo(() => {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const isSolo = user && (user as any).role === 'solo';

  // Solo users see their own dashboard
  if (isSolo) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PageTransition>
          <SoloDashboard />
        </PageTransition>
      </Suspense>
    );
  }

  return (
    <PageTransition>
      <Dashboard />
    </PageTransition>
  );
});

const ClientsPage = memo(() => {
  return (
    <ProtectedRoute requiredRole="trainer">
      <ClientsPageContent />
    </ProtectedRoute>
  );
});

/* ClientsPageContent extracted to @/pages/ClientsPage */
const WorkoutsPage = memo(() => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PageTransition>
        <WorkoutPlans />
      </PageTransition>
    </Suspense>
  );
});

const ExercisesPage = memo(() => {
  return (
    <ProtectedRoute requiredRole="trainer">
      <Suspense fallback={<LoadingFallback />}>
        <PageTransition>
          <ExercisesPageComponent />
        </PageTransition>
      </Suspense>
    </ProtectedRoute>
  );
});

const ClientDetailsPageComponent = lazy(() => import('@/pages/ClientDetailsPage'));

function ClientDetailsPage() {
  return (
    <ProtectedRoute requiredRole="trainer">
      <Suspense fallback={<LoadingFallback />}>
        <PageTransition>
          <ClientDetailsPageComponent />
        </PageTransition>
      </Suspense>
    </ProtectedRoute>
  );
}

const SchedulePage = memo(() => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PageTransition>
        <SchedulePageComponent />
      </PageTransition>
    </Suspense>
  );
});

const PaymentsPage = memo(() => {
  return (
    <ProtectedRoute requiredRole="trainer">
      <Suspense fallback={<LoadingFallback />}>
        <PageTransition>
          <PaymentsPageComponent />
        </PageTransition>
      </Suspense>
    </ProtectedRoute>
  );
});

const ProgressPageComponent = lazy(() => import('@/pages/ProgressPage'));

const ProgressPage = memo(() => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PageTransition>
        <ProgressPageComponent />
      </PageTransition>
    </Suspense>
  );
});

// Workout Page Wrapper - Shows WorkoutExecution for clients, WorkoutBuilder for trainers
const WorkoutPage = memo(() => {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const isClient = user && (user as any).role === 'client';

  return (
    <Suspense fallback={<LoadingFallback />}>
      <PageTransition>{isClient ? <WorkoutExecution /> : <WorkoutBuilder />}</PageTransition>
    </Suspense>
  );
});

function Router() {
  const [location] = useLocation();

  // Track page views on route change
  useEffect(() => {
    console.log('[Router] location changed to:', location);
    trackPageView(location);
  }, [location]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location} className="w-full">
        <Suspense fallback={<LoadingFallback />}>
          <Switch>
            {/* Test login page (simple dev/test login, no redirects) */}
            <Route path="/test-login">{() => <TestLoginPage />}</Route>

            {/* Preview login page (public, must come before / route) */}
            <Route path="/preview-login">
              {(params) => {
                console.log('[Router] /preview-login route matched with params:', params);
                return (
                  <Suspense fallback={<LoadingFallback />}>
                    <LoginPage />
                  </Suspense>
                );
              }}
            </Route>

            {/* Legal pages (public) */}
            <Route path="/terms">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <TermsPage />
                </Suspense>
              )}
            </Route>
            <Route path="/privacy">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PrivacyPage />
                </Suspense>
              )}
            </Route>

            {/* Test route to debug */}
            <Route path="/login2">
              {() => {
                console.log('[Route] /login2 matched!');
                return (
                  <Suspense fallback={<LoadingFallback />}>
                    <AuthLoginPage />
                  </Suspense>
                );
              }}
            </Route>

            {/* Auth pages (public) */}
            {/* Test route - non-lazy */}
            <Route path="/test-auth-login">
              {() => {
                console.log('[Route] /test-auth-login matched!');
                return <TestAuthLogin />;
              }}
            </Route>

            <Route path="/auth/login">
              {() => {
                console.log('[Route] /auth/login matched!');
                return (
                  <Suspense fallback={<LoadingFallback />}>
                    <AuthLoginPage />
                  </Suspense>
                );
              }}
            </Route>
            <Route path="/auth/register">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <RegisterPage />
                </Suspense>
              )}
            </Route>
            <Route path="/auth/forgot-password">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <ForgotPasswordPage />
                </Suspense>
              )}
            </Route>
            <Route path="/auth/reset-password">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <ResetPasswordPage />
                </Suspense>
              )}
            </Route>

            {/* Authenticated routes */}
            <Route path="/dashboard" component={HomePage} />
            <Route path="/clients/:id" component={ClientDetailsPage} />
            <Route path="/clients" component={ClientsPage} />
            <Route path="/workouts" component={WorkoutsPage} />
            <Route path="/workout-builder/:id" component={WorkoutPage} />
            <Route path="/exercises" component={ExercisesPage} />
            <Route path="/progress" component={ProgressPage} />
            <Route path="/schedule" component={SchedulePage} />
            <Route path="/payments" component={PaymentsPage} />

            {/* Calculator routes */}
            <Route path="/calculators">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <CalculatorsHub />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/calculators/1rm">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <OneRepMaxCalc />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/calculators/plates">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <PlatesCalc />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/calculators/tdee">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <TDEECalc />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/calculators/strength-standards">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <StrengthStandardsCalc />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/calculators/bmi">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <BMICalc />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/calculators/body-fat">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <BodyFatCalc />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/calculators/macros">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <MacroCalc />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/calculators/vo2max">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <VO2MaxCalc />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/calculators/heart-rate-zones">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <HeartRateZonesCalc />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/calculators/calories-burned">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <CaloriesBurnedCalc />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/calculators/ideal-weight">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <IdealWeightCalc />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/calculators/water-intake">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <WaterIntakeCalc />
                  </PageTransition>
                </Suspense>
              )}
            </Route>

            {/* Premium calculator routes (authenticated only) */}
            <Route path="/dashboard/calculators">
              {() => (
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageTransition>
                      <PremiumCalculatorsHub />
                    </PageTransition>
                  </Suspense>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/dashboard/calculators/tdee">
              {() => (
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageTransition>
                      <PremiumTDEECalc />
                    </PageTransition>
                  </Suspense>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/dashboard/calculators/bmi">
              {() => (
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageTransition>
                      <PremiumBMICalc />
                    </PageTransition>
                  </Suspense>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/dashboard/calculators/body-fat">
              {() => (
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageTransition>
                      <PremiumBodyFatCalc />
                    </PageTransition>
                  </Suspense>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/dashboard/calculators/macros">
              {() => (
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageTransition>
                      <PremiumMacroCalc />
                    </PageTransition>
                  </Suspense>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/dashboard/calculators/1rm">
              {() => (
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageTransition>
                      <Premium1RMCalc />
                    </PageTransition>
                  </Suspense>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/dashboard/calculators/plates">
              {() => (
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageTransition>
                      <PremiumPlatesCalc />
                    </PageTransition>
                  </Suspense>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/dashboard/calculators/strength-standards">
              {() => (
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageTransition>
                      <PremiumStrengthStandardsCalc />
                    </PageTransition>
                  </Suspense>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/dashboard/calculators/vo2max">
              {() => (
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageTransition>
                      <PremiumVO2MaxCalc />
                    </PageTransition>
                  </Suspense>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/dashboard/calculators/heart-rate-zones">
              {() => (
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageTransition>
                      <PremiumHeartRateZonesCalc />
                    </PageTransition>
                  </Suspense>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/dashboard/calculators/calories-burned">
              {() => (
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageTransition>
                      <PremiumCaloriesBurnedCalc />
                    </PageTransition>
                  </Suspense>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/dashboard/calculators/ideal-weight">
              {() => (
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageTransition>
                      <PremiumIdealWeightCalc />
                    </PageTransition>
                  </Suspense>
                </ProtectedRoute>
              )}
            </Route>
            <Route path="/dashboard/calculators/water-intake">
              {() => (
                <ProtectedRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <PageTransition>
                      <PremiumWaterIntakeCalc />
                    </PageTransition>
                  </Suspense>
                </ProtectedRoute>
              )}
            </Route>

            {/* Solo user routes */}
            <Route path="/solo">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <SoloDashboard />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/solo/onboarding">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <SoloOnboarding />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/solo/coach">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <AICoach />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/solo/recovery">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <Recovery />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/solo/achievements">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <SoloAchievements />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/solo/generate">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <WorkoutGenerator />
                  </PageTransition>
                </Suspense>
              )}
            </Route>
            <Route path="/solo/nutrition">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <NutritionPlanner />
                  </PageTransition>
                </Suspense>
              )}
            </Route>

            {/* Disciple (client) access code login — public */}
            <Route path="/disciple-login">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <DiscipleLoginPage />
                </Suspense>
              )}
            </Route>

            {/* Pricing page (authenticated users only) */}
            <Route path="/pricing">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <PricingPage />
                  </PageTransition>
                </Suspense>
              )}
            </Route>

            {/* Settings page (authenticated users only) */}
            <Route path="/settings">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <PageTransition>
                    <SettingsPage />
                  </PageTransition>
                </Suspense>
              )}
            </Route>

            {/* Public landing page at root (must come LAST before 404) */}
            <Route path="/">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <LandingPage />
                </Suspense>
              )}
            </Route>

            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

// Video cycling order - defined outside component to prevent recreations
const CATEGORY_ORDER = ['trainers', 'athletes', 'programs', 'success'] as const;

// Authentication wrapper component
function AuthWrapper({ children }: { children: React.ReactNode }) {
  // Always call hooks at the top level
  const [activeCategory, setActiveCategory] = useState('trainers');
  const prefersReducedMotion = useReducedMotion();

  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  useEffect(() => {
    // Force dark theme only
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  // Apply role-specific CSS class to html element for theming
  // (must be on same element as .dark for CSS variables to work correctly)
  useEffect(() => {
    document.documentElement.classList.remove(...ALL_ROLE_CSS_CLASSES);
    if (user && (user as { role?: InternalRole }).role) {
      const role = (user as { role: InternalRole }).role;
      document.documentElement.classList.add(getRoleCssClass(role));
    }
  }, [user]);

  // Auto-cycling effect - only run on login screen
  useEffect(() => {
    // Only auto-cycle if user is not authenticated (on login screen)
    if (isLoading || user) return;

    const interval = setInterval(() => {
      setActiveCategory((prev) => {
        const currentIndex = CATEGORY_ORDER.indexOf(prev as any);
        const nextIndex = (currentIndex + 1) % CATEGORY_ORDER.length;
        return CATEGORY_ORDER[nextIndex];
      });
    }, 10000); // Change video every 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, [isLoading, user, activeCategory]); // Include activeCategory to restart interval on manual changes

  // Handle category click
  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
  };

  // Effect to ensure video plays when category changes
  useEffect(() => {
    if (isLoading || user) return;

    // Find and play the video
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (videoElement && videoElement.paused) {
      videoElement.play().catch(() => {
        // Autoplay blocked, user interaction will be needed
      });
    }
  }, [activeCategory, isLoading, user]);

  // No need for complex useEffect, React will handle key change

  // Show error state if auth check fails (network error, server down, rate limited)
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

  // Show loading state while checking authentication - Premium Theme-Aware
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

  // User is authenticated, show the main app
  if (user) {
    // Redirect solo users to onboarding if not completed
    const u = user as any;
    if (
      u.role === 'solo' &&
      !u.onboardingCompleted &&
      !window.location.pathname.startsWith('/solo/onboarding')
    ) {
      return <Redirect to="/solo/onboarding" />;
    }

    // Restore the URL the user was on before session expired
    const returnUrl = sessionStorage.getItem('returnUrl');
    if (returnUrl && window.location.pathname === '/dashboard') {
      sessionStorage.removeItem('returnUrl');
      return <Redirect to={returnUrl} />;
    }

    return children;
  }

  // Not authenticated - redirect to landing page
  return <Redirect to="/" />;
}

// Main app layout wrapper
function AppLayout() {
  useEffect(() => {
    initAnalytics();
  }, []);

  // Custom sidebar width for fitness application
  const style = {
    '--sidebar-width': '20rem', // 320px for better content
    '--sidebar-width-icon': '6rem', // 96px for icon mode with larger logo (80px logo + padding)
  };

  // Read sidebar state from cookie to persist across page navigations
  const getSidebarState = () => {
    if (typeof document === 'undefined') return true;
    const cookies = document.cookie.split(';');
    const sidebarCookie = cookies.find((c) => c.trim().startsWith('sidebar_state='));
    if (sidebarCookie) {
      return sidebarCookie.split('=')[1] === 'true';
    }
    return true; // default to open
  };

  const [defaultOpen] = useState(getSidebarState);
  const [location] = useLocation();
  const isPublicPage =
    location === '/' ||
    location === '/terms' ||
    location === '/privacy' ||
    location.startsWith('/calculators') ||
    location === '/preview-login' ||
    location === '/test-login' ||
    location === '/test-auth-login' ||
    location === '/login2' ||
    location === '/register2' ||
    location === '/disciple-login' ||
    location.startsWith('/auth/');

  // DEBUG: Log location and isPublicPage
  useEffect(() => {
    console.log('[AppLayout] location:', location, 'isPublicPage:', isPublicPage);
  }, [location, isPublicPage]);

  return (
    <>
      {isPublicPage ? (
        // Public pages without sidebar/header
        <Router />
      ) : (
        // Authenticated app with sidebar/header
        <AuthWrapper>
          <SidebarProvider defaultOpen={defaultOpen} style={style as React.CSSProperties}>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm"
            >
              Skip to main content
            </a>
            <div className="flex h-screen w-full overflow-hidden">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-200 ease-linear">
                <AppHeaderComponent />
                <TrialBanner />
                <main
                  id="main-content"
                  className="flex-1 overflow-y-auto overflow-x-hidden"
                  role="main"
                >
                  <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-background via-background to-muted/20 min-h-full">
                    <div className="mx-auto">
                      <ErrorBoundary>
                        <Router />
                      </ErrorBoundary>
                    </div>
                  </div>
                  <Footer />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </AuthWrapper>
      )}
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <TooltipProvider>
          <AppLayout />
        </TooltipProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
