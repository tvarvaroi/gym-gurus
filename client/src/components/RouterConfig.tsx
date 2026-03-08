import { Switch, Route } from 'wouter';
import { lazy, Suspense, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { trackPageView } from '@/lib/analytics';
import { PageTransition } from '@/components/AnimationComponents';
import { LoadingFallback } from '@/components/LoadingFallback';
import ProtectedRoute from '@/components/ProtectedRoute';
import { LoginPage } from '@/components/LoginPage';
import NotFound from '@/pages/not-found';

// --- Lazy page imports ---

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const Dashboard = lazy(() => import('@/components/Dashboard'));
const ClientsPageContent = lazy(() => import('@/pages/ClientsPage'));
const ClientDetailsPageComponent = lazy(() => import('@/pages/ClientDetailsPage'));
const WorkoutPlans = lazy(() => import('@/pages/WorkoutPlans'));
const WorkoutBuilder = lazy(() => import('@/pages/WorkoutBuilder'));
const WorkoutExecution = lazy(() => import('@/pages/WorkoutExecution'));
const ExercisesPageComponent = lazy(() => import('@/pages/ExercisesPage'));
const SchedulePageComponent = lazy(() => import('@/pages/SchedulePage'));
const PaymentsPageComponent = lazy(() => import('@/pages/PaymentsPage'));
const ProgressPageComponent = lazy(() => import('@/pages/ProgressPage'));

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
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);
const TestAuthLogin = lazy(() => import('@/pages/auth/TestAuthLogin'));

// Disciple login page
const DiscipleLoginPage = lazy(() => import('@/pages/DiscipleLoginPage'));

// Pricing and Settings
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));

// Solo user pages
const SoloDashboard = lazy(() => import('@/pages/solo/SoloDashboard'));
const SoloOnboarding = lazy(() => import('@/pages/solo/SoloOnboarding'));
const AICoach = lazy(() => import('@/pages/solo/AICoach'));
const Recovery = lazy(() => import('@/pages/solo/Recovery'));
const SoloAchievements = lazy(() => import('@/pages/solo/Achievements'));
const WorkoutGenerator = lazy(() => import('@/pages/solo/WorkoutGenerator'));
const NutritionPlanner = lazy(() => import('@/pages/solo/NutritionPlanner'));

// Dev-only test page (named export)
const TestLoginPage = lazy(() =>
  import('@/components/TestLoginPage').then((m) => ({ default: m.TestLoginPage }))
);

// --- Route factories ---

/** Wraps a lazy component in Suspense + PageTransition. */
function lazyRoute(C: React.LazyExoticComponent<any>) {
  return () => (
    <Suspense fallback={<LoadingFallback />}>
      <PageTransition>
        <C />
      </PageTransition>
    </Suspense>
  );
}

/** Wraps a lazy component in ProtectedRoute + Suspense + PageTransition. */
function protectedRoute(C: React.LazyExoticComponent<any>, role?: 'trainer' | 'client') {
  return () => (
    <ProtectedRoute requiredRole={role}>
      <Suspense fallback={<LoadingFallback />}>
        <PageTransition>
          <C />
        </PageTransition>
      </Suspense>
    </ProtectedRoute>
  );
}

// --- Named page components with custom role-dispatch logic ---

/** Renders SoloDashboard for solo users, Dashboard for trainer/client. */
function HomePage() {
  const { isSolo } = useUser();

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
}

/** Shows WorkoutExecution for client role, WorkoutBuilder for trainers. */
function WorkoutPage() {
  const { isClient } = useUser();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <PageTransition>{isClient ? <WorkoutExecution /> : <WorkoutBuilder />}</PageTransition>
    </Suspense>
  );
}

// --- Router ---

export function RouterConfig() {
  const [location] = useLocation();

  useEffect(() => {
    trackPageView(location);
  }, [location]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location} className="w-full">
        <Suspense fallback={<LoadingFallback />}>
          <Switch>
            {/* Dev-only routes — tree-shaken in production builds */}
            {import.meta.env.DEV && (
              <Route path="/test-login" component={lazyRoute(TestLoginPage)} />
            )}
            {import.meta.env.DEV && (
              <Route path="/preview-login">{() => <LoginPage />}</Route>
            )}
            {import.meta.env.DEV && (
              <Route path="/login2" component={lazyRoute(AuthLoginPage)} />
            )}
            {import.meta.env.DEV && (
              <Route path="/test-auth-login" component={lazyRoute(TestAuthLogin)} />
            )}

            {/* Legal (public) */}
            <Route path="/terms" component={lazyRoute(TermsPage)} />
            <Route path="/privacy" component={lazyRoute(PrivacyPage)} />

            {/* Auth */}
            <Route path="/auth/login" component={lazyRoute(AuthLoginPage)} />
            <Route path="/auth/register" component={lazyRoute(RegisterPage)} />
            <Route path="/auth/forgot-password" component={lazyRoute(ForgotPasswordPage)} />
            <Route path="/auth/reset-password" component={lazyRoute(ResetPasswordPage)} />

            {/* Authenticated routes */}
            <Route path="/dashboard" component={HomePage} />
            <Route path="/clients/:id" component={protectedRoute(ClientDetailsPageComponent, 'trainer')} />
            <Route path="/clients" component={protectedRoute(ClientsPageContent, 'trainer')} />
            <Route path="/workouts" component={lazyRoute(WorkoutPlans)} />
            <Route path="/workout-execution/:id" component={lazyRoute(WorkoutExecution)} />
            <Route path="/workout-builder/:id" component={WorkoutPage} />
            <Route path="/exercises" component={protectedRoute(ExercisesPageComponent, 'trainer')} />
            <Route path="/progress" component={lazyRoute(ProgressPageComponent)} />
            <Route path="/schedule" component={lazyRoute(SchedulePageComponent)} />
            <Route path="/payments" component={protectedRoute(PaymentsPageComponent, 'trainer')} />

            {/* Public calculators */}
            <Route path="/calculators" component={lazyRoute(CalculatorsHub)} />
            <Route path="/calculators/1rm" component={lazyRoute(OneRepMaxCalc)} />
            <Route path="/calculators/plates" component={lazyRoute(PlatesCalc)} />
            <Route path="/calculators/tdee" component={lazyRoute(TDEECalc)} />
            <Route path="/calculators/strength-standards" component={lazyRoute(StrengthStandardsCalc)} />
            <Route path="/calculators/bmi" component={lazyRoute(BMICalc)} />
            <Route path="/calculators/body-fat" component={lazyRoute(BodyFatCalc)} />
            <Route path="/calculators/macros" component={lazyRoute(MacroCalc)} />
            <Route path="/calculators/vo2max" component={lazyRoute(VO2MaxCalc)} />
            <Route path="/calculators/heart-rate-zones" component={lazyRoute(HeartRateZonesCalc)} />
            <Route path="/calculators/calories-burned" component={lazyRoute(CaloriesBurnedCalc)} />
            <Route path="/calculators/ideal-weight" component={lazyRoute(IdealWeightCalc)} />
            <Route path="/calculators/water-intake" component={lazyRoute(WaterIntakeCalc)} />

            {/* Premium calculators (authenticated only) */}
            <Route path="/dashboard/calculators" component={protectedRoute(PremiumCalculatorsHub)} />
            <Route path="/dashboard/calculators/tdee" component={protectedRoute(PremiumTDEECalc)} />
            <Route path="/dashboard/calculators/bmi" component={protectedRoute(PremiumBMICalc)} />
            <Route path="/dashboard/calculators/body-fat" component={protectedRoute(PremiumBodyFatCalc)} />
            <Route path="/dashboard/calculators/macros" component={protectedRoute(PremiumMacroCalc)} />
            <Route path="/dashboard/calculators/1rm" component={protectedRoute(Premium1RMCalc)} />
            <Route path="/dashboard/calculators/plates" component={protectedRoute(PremiumPlatesCalc)} />
            <Route path="/dashboard/calculators/strength-standards" component={protectedRoute(PremiumStrengthStandardsCalc)} />
            <Route path="/dashboard/calculators/vo2max" component={protectedRoute(PremiumVO2MaxCalc)} />
            <Route path="/dashboard/calculators/heart-rate-zones" component={protectedRoute(PremiumHeartRateZonesCalc)} />
            <Route path="/dashboard/calculators/calories-burned" component={protectedRoute(PremiumCaloriesBurnedCalc)} />
            <Route path="/dashboard/calculators/ideal-weight" component={protectedRoute(PremiumIdealWeightCalc)} />
            <Route path="/dashboard/calculators/water-intake" component={protectedRoute(PremiumWaterIntakeCalc)} />

            {/* Solo user routes */}
            <Route path="/solo" component={lazyRoute(SoloDashboard)} />
            <Route path="/solo/onboarding" component={lazyRoute(SoloOnboarding)} />
            <Route path="/solo/coach" component={lazyRoute(AICoach)} />
            <Route path="/solo/recovery" component={lazyRoute(Recovery)} />
            <Route path="/solo/achievements" component={lazyRoute(SoloAchievements)} />
            <Route path="/solo/generate" component={lazyRoute(WorkoutGenerator)} />
            <Route path="/solo/nutrition" component={lazyRoute(NutritionPlanner)} />

            {/* Disciple login (public) */}
            <Route path="/disciple-login" component={lazyRoute(DiscipleLoginPage)} />

            {/* Pricing and Settings */}
            <Route path="/pricing" component={lazyRoute(PricingPage)} />
            <Route path="/settings" component={lazyRoute(SettingsPage)} />

            {/* Landing page — must be last before 404 */}
            <Route path="/" component={lazyRoute(LandingPage)} />

            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}
