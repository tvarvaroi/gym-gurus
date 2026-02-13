import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { lazy, Suspense, useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, LogOut, Download, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportClientsToCSV, exportWorkoutsToCSV } from "@/lib/exportUtils";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/AnimationComponents";
import { UserProvider, useUser } from "@/contexts/UserContext";

// Import critical components directly (not lazy loaded)
import AppSidebar from "@/components/AppSidebar";
// Theme toggle removed - app now uses dark theme only
import Dashboard from "@/components/Dashboard";
import ClientCard from "@/components/ClientCard";
import SearchInput from "@/components/SearchInput";
import NotFound from "@/pages/not-found";
import ErrorBoundary from "@/components/ErrorBoundary";
import { NewClientButton } from "@/components/ClientFormModal";
import { LoginPage } from "@/components/LoginPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotificationCenter from "@/components/NotificationCenter";

// Lazy load only secondary pages for code splitting
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const WorkoutPlans = lazy(() => import("@/pages/WorkoutPlans"));
const WorkoutBuilder = lazy(() => import("@/pages/WorkoutBuilder"));
const WorkoutExecution = lazy(() => import("@/pages/WorkoutExecution"));
const ExercisesPageComponent = lazy(() => import("@/pages/ExercisesPage"));
const SchedulePageComponent = lazy(() => import("@/pages/SchedulePage"));
const PaymentsPageComponent = lazy(() => import("@/pages/PaymentsPage"));

// Calculator pages
const CalculatorsHub = lazy(() => import("@/pages/calculators/CalculatorsHub"));
const OneRepMaxCalc = lazy(() => import("@/pages/calculators/OneRepMaxCalc"));
const PlatesCalc = lazy(() => import("@/pages/calculators/PlatesCalc"));
const TDEECalc = lazy(() => import("@/pages/calculators/TDEECalc"));
const StrengthStandardsCalc = lazy(() => import("@/pages/calculators/StrengthStandardsCalc"));
const BMICalc = lazy(() => import("@/pages/calculators/BMICalc"));
const BodyFatCalc = lazy(() => import("@/pages/calculators/BodyFatCalc"));
const MacroCalc = lazy(() => import("@/pages/calculators/MacroCalc"));
const VO2MaxCalc = lazy(() => import("@/pages/calculators/VO2MaxCalc"));
const HeartRateZonesCalc = lazy(() => import("@/pages/calculators/HeartRateZonesCalc"));
const CaloriesBurnedCalc = lazy(() => import("@/pages/calculators/CaloriesBurnedCalc"));
const IdealWeightCalc = lazy(() => import("@/pages/calculators/IdealWeightCalc"));
const WaterIntakeCalc = lazy(() => import("@/pages/calculators/WaterIntakeCalc"));

// Solo user pages
const SoloDashboard = lazy(() => import("@/pages/solo/SoloDashboard"));
const SoloOnboarding = lazy(() => import("@/pages/solo/SoloOnboarding"));
const AICoach = lazy(() => import("@/pages/solo/AICoach"));
const Recovery = lazy(() => import("@/pages/solo/Recovery"));
const SoloAchievements = lazy(() => import("@/pages/solo/Achievements"));
const WorkoutGenerator = lazy(() => import("@/pages/solo/WorkoutGenerator"));

// Loading fallback component
const LoadingFallback = memo(() => (
  <motion.div
    className="flex items-center justify-center min-h-[60vh]"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="space-y-6 text-center">
      <motion.div
        className="relative inline-block"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="h-12 w-12 text-primary mx-auto" />
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
      <motion.p
        className="text-base font-light text-muted-foreground/80"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        Loading...
      </motion.p>
    </div>
  </motion.div>
));

// Pages for different sections of the app
const HomePage = memo(() => {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
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

const ClientsPageContent = memo(() => {

  // Get the authenticated user's ID from the auth system
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  // Use authenticated user's ID or fallback to demo ID
  const trainerId = (user as any)?.id || "demo-trainer-123";
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['/api/clients', trainerId],
    queryFn: () => fetch(`/api/clients/${trainerId}`).then(res => res.json()),
    enabled: !!trainerId, // Only fetch when we have a trainerId
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep cache for 5 minutes
  });
  
  // Helper function to format session times
  const formatSessionTime = useCallback((timestamp: string | null) => {
    if (!timestamp) return "No session yet";
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Yesterday";
    if (diffDays === 0) return "Today";
    return `${diffDays} days ago`;
  }, []);
  
  // Transform database client data to match ClientCard props
  // This must be called BEFORE any conditional returns to follow React's Rules of Hooks
  const transformedClients = useMemo(() => {
    const allClients = (clients || []).map((client: any) => ({
      ...client, // Spread all client properties first (includes biometric data)
      client: client, // Pass full client object
      trainerId: trainerId, // Pass trainerId for edit functionality
      progress: client.status === 'active' ? 75 : client.status === 'paused' ? 40 : 10, // Deterministic progress based on status
      lastSession: formatSessionTime(client.lastSession),
      nextSession: client.nextSession ? new Date(client.nextSession).toLocaleDateString() : undefined
    }));
    
    // Filter clients based on search query
    if (!searchQuery.trim()) return allClients;
    
    const query = searchQuery.toLowerCase();
    return allClients.filter((client: any) => 
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.goal?.toLowerCase().includes(query) ||
      client.status.toLowerCase().includes(query)
    );
  }, [clients, searchQuery, formatSessionTime, trainerId]);
  
  // Show loading state - Enhanced
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-extralight tracking-tight">
                My <span className="font-light bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">Clients</span>
              </h1>
              <p className="text-base font-light text-muted-foreground/80 flex items-center gap-2">
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  Loading client data...
                </motion.span>
              </p>
            </motion.div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="h-80 glass-strong rounded-2xl overflow-hidden relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: i * 0.1 }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }

  // Show error state
  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h1 className="text-3xl font-light tracking-tight">My Clients</h1>
              <p className="text-sm font-light text-red-500">Error loading clients. Please try again.</p>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              >
                <h1 className="text-4xl md:text-5xl font-extralight tracking-tight">
                  My <span className="font-light bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">Clients</span>
                </h1>
                <p className="text-base font-light text-muted-foreground/80">Manage and track your client progress with precision</p>
              </motion.div>
              <motion.div
                className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
              >
                <NewClientButton trainerId={trainerId} className="w-full sm:w-auto shadow-premium hover:shadow-premium-lg transition-all duration-300" />
                <Button
                  variant="outline"
                  onClick={() => exportClientsToCSV(clients || [])}
                  disabled={!clients?.length}
                  data-testid="button-export-clients"
                  className="relative w-full sm:w-auto border-border/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <Download className="mr-2 h-4 w-4 relative z-10" />
                  <span className="text-sm relative z-10">Export to CSV</span>
                </Button>
              </motion.div>
            </div>
            <div className="w-full md:w-80">
              <Suspense fallback={
                <motion.div
                  className="h-10 glass rounded-md overflow-hidden relative"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                </motion.div>
              }>
                <SearchInput
                  placeholder="Search clients by name, email, goal..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  debounceMs={300}
                  className="w-full"
                />
              </Suspense>
            </div>
          </div>
        </StaggerItem>
        
        <StaggerContainer delay={0.2}>
          {transformedClients.length === 0 ? (
            <motion.div
              className="text-center py-20 space-y-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="relative inline-block">
                <motion.div
                  className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Users className="h-12 w-12 text-primary/60" />
                </motion.div>
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-xl"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-light">No clients yet</h3>
                <p className="text-base font-light text-muted-foreground/80 max-w-md mx-auto">
                  Start building your fitness community by adding your first client
                </p>
              </div>
              <NewClientButton trainerId={trainerId} className="mx-auto shadow-premium hover:shadow-premium-lg transition-all duration-300" />
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {transformedClients.map((client: any, index: number) => (
                <StaggerItem key={client.email} index={index}>
                  <Suspense fallback={
                    <motion.div
                      className="h-80 glass-strong rounded-2xl overflow-hidden relative"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      />
                    </motion.div>
                  }>
                    <ClientCard {...client} />
                  </Suspense>
                </StaggerItem>
              ))}
            </div>
          )}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
});

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

const ClientDetailsPageComponent = lazy(() => import("@/pages/ClientDetailsPage"));

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

const ProgressPageComponent = lazy(() => import("@/pages/ProgressPage"));

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
  });

  const isClient = user && (user as any).role === 'client';

  return (
    <Suspense fallback={<LoadingFallback />}>
      <PageTransition>
        {isClient ? <WorkoutExecution /> : <WorkoutBuilder />}
      </PageTransition>
    </Suspense>
  );
});

function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location} className="w-full">
        <Suspense fallback={<LoadingFallback />}>
          <Switch>
            {/* Public landing page at root */}
            <Route path="/">
              {() => (
                <Suspense fallback={<LoadingFallback />}>
                  <LandingPage />
                </Suspense>
              )}
            </Route>

            {/* Authenticated routes */}
            <Route path="/dashboard" component={HomePage} />
            <Route path="/preview-login" component={LoginPage} />
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

            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

// Main app header component with role-based colors
function AppHeader() {
  const { isTrainer } = useUser();

  // Color schemes based on user role
  const colors = isTrainer ? {
    primary: { rgb: 'rgba(201, 168, 85', hex: '#C9A855' },      // Gold
    secondary: { rgb: 'rgba(13, 148, 136', hex: '#0D9488' },    // Teal
  } : {
    primary: { rgb: 'rgba(6, 182, 212', hex: '#06b6d4' },       // Cyan
    secondary: { rgb: 'rgba(13, 148, 136', hex: '#14b8a6' },    // Teal
  };

  return (
    <header className="sticky top-0 z-40 h-16 md:h-20 shrink-0 border-b relative overflow-hidden"
            style={{
              borderColor: `${colors.primary.rgb}, 0.3)`,
              backdropFilter: 'blur(24px)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            }}>
      {/* Premium multi-layered glass background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Primary gradient base */}
        <div className="absolute inset-0"
             style={{
               background: `linear-gradient(135deg, ${colors.primary.rgb}, 0.15) 0%, ${colors.secondary.rgb}, 0.15) 100%)`,
             }} />

        {/* Premium radial lighting from center */}
        <div className="absolute inset-0"
             style={{
               background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.08), transparent 50%)',
             }} />

        {/* Sophisticated gradient overlay for depth */}
        <div className="absolute inset-0"
             style={{
               background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.15))',
             }} />

        {/* Luxury noise texture */}
        <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
             style={{
               backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
             }} />

        {/* Animated shimmer effect */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${colors.primary.rgb}, 0.06) 50%, transparent 100%)`,
            backgroundSize: '200% 100%',
          }}
          animate={{
            backgroundPosition: ['0% 0%', '200% 0%'],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Premium top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px]"
             style={{
               background: `linear-gradient(90deg, transparent 0%, ${colors.primary.rgb}, 0.5) 20%, ${colors.primary.rgb}, 0.8) 50%, ${colors.secondary.rgb}, 0.8) 50%, ${colors.secondary.rgb}, 0.5) 80%, transparent 100%)`,
             }} />

        {/* Inner glow border */}
        <div className="absolute inset-0 pointer-events-none"
             style={{
               boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.06), inset 0 -1px 2px rgba(0, 0, 0, 0.15)',
             }} />
      </div>

      {/* Grid layout for proper centering */}
      <div className="relative z-10 h-full grid grid-cols-3 items-center px-3 sm:px-4 md:px-6">
        {/* Left section - Premium Sidebar Toggle */}
        <motion.div
          className="flex justify-start"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
          >
            <SidebarTrigger
              data-testid="button-sidebar-toggle"
              className="hover-elevate transition-all duration-300 rounded-xl border h-10 w-10 md:h-12 md:w-12"
              style={{
                background: `linear-gradient(135deg, ${colors.primary.rgb}, 0.12), ${colors.secondary.rgb}, 0.12))`,
                borderColor: `${colors.primary.rgb}, 0.25)`,
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              }}
            />
          </motion.div>
        </motion.div>

        {/* Center section - properly centered */}
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

// Premium header center text with mouse tracking gradient
function HeaderCenterText() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const { isTrainer } = useUser();

  // Color schemes based on user role
  // Trainer: Gold/Teal (original logo colors)
  // Client: Cyan/Teal
  const colors = isTrainer ? {
    primary: { rgb: 'rgba(201, 168, 85', hex: '#C9A855' },      // Gold
    secondary: { rgb: 'rgba(13, 148, 136', hex: '#0D9488' },    // Teal
  } : {
    primary: { rgb: 'rgba(6, 182, 212', hex: '#06b6d4' },       // Cyan
    secondary: { rgb: 'rgba(13, 148, 136', hex: '#14b8a6' },    // Teal
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!textRef.current) return;

    const rect = textRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setMousePosition({ x, y });
  };

  return (
    <motion.div
      ref={textRef}
      className="hidden md:flex cursor-default select-none"
      initial={{ opacity: 0, scale: 0.9, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative px-6 md:px-10 py-3 md:py-3.5 rounded-2xl backdrop-blur-xl border overflow-visible group"
           style={{
             background: `linear-gradient(135deg, ${colors.primary.rgb}, 0.15), ${colors.secondary.rgb}, 0.15))`,
             borderColor: `${colors.primary.rgb}, 0.3)`,
             boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
           }}>

        {/* Premium noise texture overlay */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay rounded-2xl"
             style={{
               backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
             }} />

        {/* Mouse tracking gradient - enhanced */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}% ${mousePosition.y}%, ${colors.primary.rgb}, 0.15), transparent 50%)`,
          }}
        />

        {/* Animated border glow - enhanced */}
        <motion.div
          className="absolute inset-0 rounded-2xl -z-10"
          initial={false}
          animate={{
            boxShadow: isHovering
              ? `0 0 30px ${colors.primary.rgb}, 0.4), 0 0 60px ${colors.primary.rgb}, 0.2), 0 0 90px ${colors.secondary.rgb}, 0.1)`
              : `0 0 0px ${colors.primary.rgb}, 0)`,
          }}
          transition={{ duration: 0.4 }}
        />

        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-2xl opacity-40"
             style={{
               borderColor: `${colors.primary.rgb}, 0.6)`,
             }} />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-2xl opacity-40"
             style={{
               borderColor: `${colors.secondary.rgb}, 0.6)`,
             }} />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-2xl opacity-40"
             style={{
               borderColor: `${colors.secondary.rgb}, 0.6)`,
             }} />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-2xl opacity-40"
             style={{
               borderColor: `${colors.primary.rgb}, 0.6)`,
             }} />

        <div className="relative flex items-center justify-center gap-3">
          {/* Left ornamental dot */}
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${colors.primary.rgb}, 0.8), ${colors.primary.rgb}, 0.5))`,
              boxShadow: `0 0 6px ${colors.primary.rgb}, 0.6)`,
            }}
            animate={{
              scale: isHovering ? [1, 1.3, 1] : 1,
              opacity: isHovering ? [0.6, 1, 0.6] : 0.7,
            }}
            transition={{
              duration: 2,
              repeat: isHovering ? Infinity : 0,
              ease: "easeInOut",
            }}
          />

          <motion.span
            className="text-lg md:text-xl lg:text-2xl font-light whitespace-nowrap"
            style={{
              fontFamily: '"Playfair Display", serif',
              letterSpacing: '0.08em',
              fontWeight: 300,
              background: `linear-gradient(90deg, ${colors.primary.hex} 0%, ${colors.secondary.hex} 25%, #ffffff 50%, ${colors.secondary.hex} 75%, ${colors.secondary.hex} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              backgroundSize: '200% 100%',
              textShadow: `0 0 20px ${colors.primary.rgb}, 0.3)`,
            }}
            animate={{
              backgroundPosition: isHovering ? ['0% 0%', '100% 0%', '0% 0%'] : '0% 0%',
            }}
            transition={{
              duration: 5,
              repeat: isHovering ? Infinity : 0,
              ease: "linear",
            }}
          >
            GYM GURUS — Elite Fitness Platform
          </motion.span>

          {/* Right ornamental dot */}
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${colors.secondary.rgb}, 0.8), ${colors.secondary.rgb}, 0.5))`,
              boxShadow: `0 0 6px ${colors.secondary.rgb}, 0.6)`,
            }}
            animate={{
              scale: isHovering ? [1, 1.3, 1] : 1,
              opacity: isHovering ? [0.6, 1, 0.6] : 0.7,
            }}
            transition={{
              duration: 2,
              repeat: isHovering ? Infinity : 0,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />

          {/* Enhanced sparkle effects on hover */}
          <AnimatePresence>
            {isHovering && (
              <>
                <motion.div
                  className="absolute -right-3 -top-3"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${colors.primary.hex}, ${colors.primary.hex})`,
                      boxShadow: `0 0 12px ${colors.primary.rgb}, 0.6), 0 0 24px ${colors.primary.rgb}, 0.3)`,
                    }}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.7, 1, 0.7],
                      rotate: [0, 180, 360],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>

                <motion.div
                  className="absolute -left-3 -bottom-3"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${colors.secondary.hex}, ${colors.secondary.hex})`,
                      boxShadow: `0 0 10px ${colors.secondary.rgb}, 0.6), 0 0 20px ${colors.secondary.rgb}, 0.3)`,
                    }}
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.7, 1, 0.7],
                      rotate: [360, 180, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1,
                    }}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// User menu component for authenticated users
function UserMenu() {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });
  const { isTrainer } = useUser();

  // Color schemes based on user role
  const colors = isTrainer ? {
    primary: { rgb: 'rgba(201, 168, 85', hex: '#C9A855' },      // Gold
    secondary: { rgb: 'rgba(13, 148, 136', hex: '#0D9488' },    // Teal
  } : {
    primary: { rgb: 'rgba(6, 182, 212', hex: '#06b6d4' },       // Cyan
    secondary: { rgb: 'rgba(13, 148, 136', hex: '#14b8a6' },    // Teal
  };

  if (!user) return null;

  const userData = user as any; // Type assertion for user data from API

  // Get user initials for avatar
  const initials = `${userData.firstName?.[0] || ''}${userData.lastName?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          className="relative group"
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.95 }}
          data-testid="button-user-menu"
        >
          {/* Premium glow effect on hover */}
          <motion.div
            className="absolute inset-0 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `radial-gradient(circle, ${colors.primary.rgb}, 0.3), ${colors.secondary.rgb}, 0.3))`,
            }}
            initial={false}
          />

          {/* Outer ring with premium gradient */}
          <motion.div
            className="absolute inset-0 rounded-full p-[2px]"
            style={{
              background: `linear-gradient(135deg, ${colors.primary.rgb}, 0.4), ${colors.secondary.rgb}, 0.4))`,
            }}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <div className="w-full h-full rounded-full bg-background" />
          </motion.div>

          {/* Avatar container with luxury glass effect */}
          <div className="relative h-11 w-11 md:h-12 md:w-12 rounded-full border-2 transition-all duration-300 overflow-hidden"
               style={{
                 background: `linear-gradient(135deg, ${colors.primary.rgb}, 0.15), ${colors.secondary.rgb}, 0.15))`,
                 borderColor: `${colors.primary.rgb}, 0.3)`,
                 backdropFilter: 'blur(12px)',
                 boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
               }}>

            {/* Luxury noise texture */}
            <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
                 style={{
                   backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
                 }} />

            {/* Multi-layered premium gradient background */}
            <div className="absolute inset-0"
                 style={{
                   background: `radial-gradient(circle at 30% 30%, ${colors.primary.rgb}, 0.25), transparent 60%)`,
                 }} />
            <div className="absolute inset-0"
                 style={{
                   background: `radial-gradient(circle at 70% 70%, ${colors.secondary.rgb}, 0.25), transparent 60%)`,
                 }} />

            {/* Initials with premium styling */}
            <div className="relative h-full w-full flex items-center justify-center">
              <motion.span
                className="text-sm md:text-base font-semibold"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary.hex} 0%, #e5e4e2 50%, ${colors.secondary.hex} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: `0 0 10px ${colors.primary.rgb}, 0.3)`,
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

            {/* Enhanced shine effect on hover */}
            <motion.div
              className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%]"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
              }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              initial={false}
            />
          </div>

          {/* Premium status indicator with glow */}
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderColor: 'rgba(0, 0, 0, 0.8)',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.6), 0 0 6px rgba(16, 185, 129, 0.8)',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 }}
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.8), transparent)',
              }}
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.6, 0.9, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
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
          {/* Header section with gradient background */}
          <div className="relative p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/50">
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent" />

            <div className="relative flex items-center gap-4">
              {/* Large avatar */}
              <div className="h-14 w-14 rounded-full glass border border-border/50 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center shrink-0 shadow-lg">
                <span className="text-xl font-semibold bg-gradient-to-br from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  {initials}
                </span>
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0 space-y-1">
                <motion.p
                  className="text-base font-semibold text-foreground truncate"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {userData.firstName} {userData.lastName}
                </motion.p>
                <motion.p
                  className="text-xs text-muted-foreground truncate font-light"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {userData.email}
                </motion.p>
                <motion.div
                  className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium">Active</span>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-2">
            <DropdownMenuItem
              onClick={async () => {
                try {
                  // Clear React Query cache to ensure fresh authentication check
                  queryClient.clear();

                  // Call logout endpoint
                  await fetch('/api/logout', {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                      'Cache-Control': 'no-cache',
                    },
                  });

                  // Clear all local storage and session storage
                  localStorage.clear();
                  sessionStorage.clear();

                  // Force full page reload to show login screen
                  window.location.href = '/';
                } catch (error) {
                  console.error('Logout failed:', error);
                  // Clear cache even on error and redirect
                  queryClient.clear();
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/';
                }
              }}
              data-testid="button-logout"
              className="group relative cursor-pointer rounded-xl px-3 py-2.5 hover:bg-destructive/10 focus:bg-destructive/10 transition-all duration-200 overflow-hidden"
            >
              {/* Hover gradient effect */}
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
                  <p className="text-xs text-muted-foreground font-light">End your session securely</p>
                </div>
              </div>
            </DropdownMenuItem>
          </div>
        </motion.div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Video cycling order - defined outside component to prevent recreations
const CATEGORY_ORDER = ["trainers", "athletes", "programs", "success"] as const;

// Authentication wrapper component
function AuthWrapper({ children }: { children: React.ReactNode }) {
  // Always call hooks at the top level
  const [activeCategory, setActiveCategory] = useState("trainers");

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    // Force dark theme only
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  }, []);

  // Auto-cycling effect - only run on login screen
  useEffect(() => {
    // Only auto-cycle if user is not authenticated (on login screen)
    if (isLoading || user) return;
    
    const interval = setInterval(() => {
      setActiveCategory(prev => {
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
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-16 w-16 text-primary mx-auto" />
            </motion.div>
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/30 blur-2xl"
              animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Pulsing text */}
          <motion.div
            className="space-y-2"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <p className="text-lg font-light text-foreground">Checking authentication</p>
            <div className="flex items-center justify-center gap-1">
              <motion.span
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0 }}
              />
              <motion.span
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              />
              <motion.span
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // User is authenticated, show the main app
  if (user) {
    return children;
  }

  // Not authenticated - return null, let the router handle it
  return null;
}

// Main app layout wrapper
function AppLayout() {
  // Custom sidebar width for fitness application
  const style = {
    "--sidebar-width": "20rem",       // 320px for better content
    "--sidebar-width-icon": "6rem",   // 96px for icon mode with larger logo (80px logo + padding)
  };

  // Read sidebar state from cookie to persist across page navigations
  const getSidebarState = () => {
    if (typeof document === 'undefined') return true;
    const cookies = document.cookie.split(';');
    const sidebarCookie = cookies.find(c => c.trim().startsWith('sidebar_state='));
    if (sidebarCookie) {
      return sidebarCookie.split('=')[1] === 'true';
    }
    return true; // default to open
  };

  const [defaultOpen] = useState(getSidebarState);
  const [location] = useLocation();
  const isLandingPage = location === '/';

  return (
    <>
      {isLandingPage ? (
        // Landing page without sidebar/header
        <Router />
      ) : (
        // Authenticated app with sidebar/header
        <AuthWrapper>
          <SidebarProvider defaultOpen={defaultOpen} style={style as React.CSSProperties}>
          <div className="flex h-screen w-full overflow-hidden">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-200 ease-linear">
              <AppHeader />
              <main className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-background via-background to-muted/20 min-h-full">
                  <div className="mx-auto">
                    <ErrorBoundary>
                      <Router />
                    </ErrorBoundary>
                  </div>
                </div>
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
