import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import Dashboard from "@/components/Dashboard";
import ClientCard from "@/components/ClientCard";
import WorkoutCard from "@/components/WorkoutCard";
import ProgressChart from "@/components/ProgressChart";
import ExerciseCard from "@/components/ExerciseCard";
import MessageThread from "@/components/MessageThread";
import CalendarView from "@/components/CalendarView";
import WorkoutPlans from "@/pages/WorkoutPlans";
import WorkoutBuilder from "@/pages/WorkoutBuilder";
import NotFound from "@/pages/not-found";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useReducedMotion } from "./hooks/use-reduced-motion";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogIn, Shield, User, LogOut } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Pages for different sections of the app
function HomePage() {
  return (
    <PageTransition>
      <Dashboard />
    </PageTransition>
  );
}

// Premium page transition components
const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{
      type: "spring",
      damping: 25,
      stiffness: 200,
      duration: 0.6
    }}
  >
    {children}
  </motion.div>
);

const StaggerContainer = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        delay,
        staggerChildren: 0.1,
        delayChildren: 0.2 + delay
      }}
    >
      {children}
    </motion.div>
  );
};

const StaggerItem = ({ children, index = 0 }: { children: React.ReactNode; index?: number }) => {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 300,
        delay: index * 0.1
      }}
    >
      {children}
    </motion.div>
  );
};

function ClientsPage() {
  
  // Temporary trainer ID for development - replace with real auth later
  const TEMP_TRAINER_ID = "demo-trainer-123";
  
  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['/api/clients', TEMP_TRAINER_ID],
    queryFn: () => fetch(`/api/clients/${TEMP_TRAINER_ID}`).then(res => res.json())
  });
  
  // Show loading state
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-light tracking-tight">My Clients</h1>
              <p className="text-lg font-light text-muted-foreground">Loading client data...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 bg-card/50 rounded-xl animate-pulse" />
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
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-light tracking-tight">My Clients</h1>
              <p className="text-lg font-light text-red-500">Error loading clients. Please try again.</p>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }
  
  // Helper function to format session times
  const formatSessionTime = (timestamp: string | null) => {
    if (!timestamp) return "No session yet";
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Yesterday";
    if (diffDays === 0) return "Today";
    return `${diffDays} days ago`;
  };
  
  // Transform database client data to match ClientCard props
  const transformedClients = (clients || []).map((client: any) => ({
    client: client, // Pass full client object
    trainerId: TEMP_TRAINER_ID, // Pass trainerId for edit functionality
    name: client.name,
    email: client.email,
    goal: client.goal,
    progress: Math.floor(Math.random() * 100), // Temporary - will implement real progress tracking
    lastSession: formatSessionTime(client.lastSession),
    status: client.status,
    nextSession: client.nextSession ? new Date(client.nextSession).toLocaleDateString() : undefined
  }));

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-light tracking-tight">My Clients</h1>
              <p className="text-lg font-light text-muted-foreground">Manage and track your client progress</p>
            </div>
          </div>
        </StaggerItem>
        
        <StaggerContainer delay={0.2}>
          {transformedClients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg font-light text-muted-foreground">No clients yet. Add your first client to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {transformedClients.map((client: any, index: number) => (
                <StaggerItem key={client.email} index={index}>
                  <ClientCard {...client} />
                </StaggerItem>
              ))}
            </div>
          )}
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}

function WorkoutsPage() {
  return (
    <PageTransition>
      <WorkoutPlans />
    </PageTransition>
  );
}

const ProgressPageComponent = lazy(() => import("@/pages/ProgressPage"));

function ProgressPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading progress tracking...</div>}>
      <ProgressPageComponent />
    </Suspense>
  );
}

function ExercisesPage() {
  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div>
            <h1 className="text-4xl font-light tracking-tight">Exercise Library</h1>
            <p className="text-lg font-light text-muted-foreground">Browse and add exercises to your workout plans</p>
          </div>
        </StaggerItem>
        
        <StaggerContainer delay={0.2}>
          <StaggerItem>
            <ExerciseCard
              name="Barbell Squat"
              description="A compound exercise targeting the lower body and core"
              category="Strength"
              difficulty="Intermediate"
              muscleGroups={["Quadriceps", "Glutes", "Hamstrings", "Core"]}
              equipment={["Barbell", "Squat Rack"]}
              instructions={[
                "Stand with feet shoulder-width apart",
                "Place barbell on upper back",
                "Lower body by bending knees and hips",
                "Keep chest up and back straight",
                "Lower until thighs are parallel to ground",
                "Push through heels to return to starting position"
              ]}
            />
          </StaggerItem>
        </StaggerContainer>
      </div>
    </PageTransition>
  );
}

const MessagesPageComponent = lazy(() => import("@/pages/MessagesPage"));

function MessagesPage() {

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64">Loading messaging system...</div>}>
      <MessagesPageComponent />
    </Suspense>
  );
}

function SchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Schedule</h1>
        <p className="text-muted-foreground">Manage appointments and training sessions</p>
      </div>
      <CalendarView />
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={location} className="w-full">
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/clients" component={ClientsPage} />
          <Route path="/workouts" component={WorkoutsPage} />
          <Route path="/workout-builder/:id" component={WorkoutBuilder} />
          <Route path="/progress" component={ProgressPage} />
          <Route path="/exercises" component={ExercisesPage} />
          <Route path="/messages" component={MessagesPage} />
          <Route path="/schedule" component={SchedulePage} />
          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

// User menu component for authenticated users
function UserMenu() {
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  if (!user) return null;

  const userData = user as any; // Type assertion for user data from API

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full" data-testid="button-user-menu">
          <User className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{userData.firstName} {userData.lastName}</p>
          <p className="text-xs text-muted-foreground">{userData.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.location.href = '/api/logout'} data-testid="button-logout">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Authentication wrapper component
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-[400px]">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Checking authentication...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (error || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-[400px]">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Gym Gurus</CardTitle>
            <CardDescription>
              Professional fitness management platform for personal trainers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                Please sign in to access your trainer dashboard
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="w-full"
              size="lg"
              data-testid="button-login"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign in with Replit
            </Button>
            <div className="text-xs text-center text-muted-foreground">
              Secure authentication powered by Replit Auth
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated, show the main app
  return children;
}

export default function App() {
  // Custom sidebar width for fitness application
  const style = {
    "--sidebar-width": "20rem",       // 320px for better content
    "--sidebar-width-icon": "4rem",   // default icon width
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthWrapper>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1">
                <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
                  <SidebarTrigger data-testid="button-sidebar-toggle" className="hover-elevate" />
                  <div className="flex items-center space-x-2">
                    <UserMenu />
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto p-8 bg-gradient-to-br from-background via-background to-muted/20">
                  <div className="max-w-7xl mx-auto">
                    <Router />
                  </div>
                </main>
              </div>
            </div>
          </SidebarProvider>
        </AuthWrapper>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
